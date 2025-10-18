/**
 * Hartzell HR Center - Main Worker
 * Handles all API requests and authentication
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authRoutes } from './routes/auth';
import { employeeRoutes } from './routes/employee';
import { signatureRoutes } from './routes/signatures';
import { adminRoutes } from './routes/admin';
import { applicationRoutes } from './routes/applications';
import { settingsRoutes } from './routes/settings';
import { validateCsrf } from './middleware/csrf';
import type { Env } from './types';
import { sendEmail, getReminderEmail, getOverdueEmail } from './lib/email';

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use('/api/*', cors({
  origin: (origin) => {
    const allowedOrigins = [
      'https://hartzell.work',
      'https://app.hartzell.work',
      'http://localhost:3000',
    ];

    // Handle requests without Origin header (health checks, service-to-service)
    if (!origin) {
      return allowedOrigins[0];
    }

    // Allow any Cloudflare Pages deployment
    if (origin.endsWith('.hartzell-hr-frontend.pages.dev')) {
      return origin;
    }

    // Check exact matches
    if (allowedOrigins.includes(origin)) {
      return origin;
    }

    return allowedOrigins[0]; // Default fallback
  },
  credentials: true,
}));

// CSRF Protection (validates POST/PUT/DELETE/PATCH requests)
app.use('/api/*', validateCsrf);

// Health check
app.get('/api/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Serve public assets from R2 (logo, images, etc.)
app.get('/assets/*', async (c) => {
  const path = c.req.path.replace('/assets/', '');
  const object = await c.env.ASSETS.get(path);

  if (!object) {
    return c.notFound();
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

  return new Response(object.body, {
    headers,
  });
});

// Routes
app.route('/api/auth', authRoutes);
app.route('/api/employee', employeeRoutes);
app.route('/api/signatures', signatureRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/admin/settings', settingsRoutes);
app.route('/api/applications', applicationRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Worker error:', err);
  return c.json({
    error: 'Internal Server Error',
    message: err.message
  }, 500);
});

/**
 * Scheduled Event Handler
 * Runs daily at 9:00 AM Eastern Time (13:00 UTC)
 * Checks for:
 * 1. Assignments due soon (reminders)
 * 2. Overdue assignments
 */
async function handleScheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
  console.log('[Cron] Starting scheduled email notifications check');

  try {
    // Get email settings to determine reminder window
    const settings = await env.DB.prepare(`
      SELECT reminder_days_before FROM email_settings WHERE id = 1
    `).first();

    const reminderDaysBefore = (settings?.reminder_days_before as number) || 3;

    // Calculate date range for reminders (assignments due within reminderDaysBefore days)
    const now = new Date();
    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + reminderDaysBefore);

    const nowISO = now.toISOString();
    const reminderDateISO = reminderDate.toISOString();

    console.log(`[Cron] Reminder window: ${reminderDaysBefore} days (now: ${nowISO}, threshold: ${reminderDateISO})`);

    // 1. SEND REMINDER EMAILS
    // Find assignments that are:
    // - Not yet signed (status = 'assigned')
    // - Have a due date
    // - Due within the reminder window
    // - Haven't been reminded yet today
    const reminderAssignments = await env.DB.prepare(`
      SELECT
        da.id,
        da.template_id,
        da.bitrix_id,
        da.due_date,
        dt.title as template_title,
        ec.full_name as employee_name,
        ec.email as employee_email
      FROM document_assignments da
      LEFT JOIN document_templates dt ON da.template_id = dt.id
      LEFT JOIN employee_cache ec ON da.bitrix_id = ec.bitrix_id
      WHERE da.status = 'assigned'
        AND da.due_date IS NOT NULL
        AND da.due_date >= ?
        AND da.due_date <= ?
        AND (da.last_reminder_sent IS NULL OR datetime(da.last_reminder_sent) < datetime('now', 'start of day'))
    `).bind(nowISO, reminderDateISO).all();

    console.log(`[Cron] Found ${reminderAssignments.results.length} assignments needing reminders`);

    let remindersSent = 0;
    for (const assignment of reminderAssignments.results) {
      if (!assignment.employee_email) {
        console.log(`[Cron] Skipping assignment ${assignment.id} - no employee email`);
        continue;
      }

      try {
        // Format due date for display
        const dueDate = new Date(assignment.due_date as string);
        const dueDateStr = dueDate.toLocaleDateString('en-US', {
          timeZone: 'America/New_York',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        const emailTemplate = getReminderEmail({
          employeeName: assignment.employee_name as string,
          documentTitle: assignment.template_title as string,
          dueDate: dueDateStr,
          assignmentUrl: 'https://app.hartzell.work/dashboard/documents'
        });

        const sent = await sendEmail(env, {
          to: assignment.employee_email as string,
          toName: assignment.employee_name as string,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text,
          type: 'assignment_reminder',
          employeeId: assignment.bitrix_id as number
        });

        if (sent) {
          // Update last_reminder_sent timestamp
          await env.DB.prepare(`
            UPDATE document_assignments
            SET last_reminder_sent = ?
            WHERE id = ?
          `).bind(nowISO, assignment.id).run();

          remindersSent++;
          console.log(`[Cron] Sent reminder to ${assignment.employee_email} for "${assignment.template_title}"`);
        }
      } catch (error) {
        console.error(`[Cron] Failed to send reminder for assignment ${assignment.id}:`, error);
      }
    }

    console.log(`[Cron] Reminder emails sent: ${remindersSent}/${reminderAssignments.results.length}`);

    // 2. SEND OVERDUE EMAILS
    // Find assignments that are:
    // - Not yet signed (status = 'assigned')
    // - Have a due date
    // - Due date is in the past
    // - Haven't been notified about overdue status today
    const overdueAssignments = await env.DB.prepare(`
      SELECT
        da.id,
        da.template_id,
        da.bitrix_id,
        da.due_date,
        dt.title as template_title,
        ec.full_name as employee_name,
        ec.email as employee_email
      FROM document_assignments da
      LEFT JOIN document_templates dt ON da.template_id = dt.id
      LEFT JOIN employee_cache ec ON da.bitrix_id = ec.bitrix_id
      WHERE da.status = 'assigned'
        AND da.due_date IS NOT NULL
        AND da.due_date < ?
        AND (da.last_overdue_sent IS NULL OR datetime(da.last_overdue_sent) < datetime('now', 'start of day'))
    `).bind(nowISO).all();

    console.log(`[Cron] Found ${overdueAssignments.results.length} overdue assignments`);

    let overdueSent = 0;
    for (const assignment of overdueAssignments.results) {
      if (!assignment.employee_email) {
        console.log(`[Cron] Skipping overdue assignment ${assignment.id} - no employee email`);
        continue;
      }

      try {
        // Format due date for display
        const dueDate = new Date(assignment.due_date as string);
        const dueDateStr = dueDate.toLocaleDateString('en-US', {
          timeZone: 'America/New_York',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        const emailTemplate = getOverdueEmail({
          employeeName: assignment.employee_name as string,
          documentTitle: assignment.template_title as string,
          dueDate: dueDateStr,
          assignmentUrl: 'https://app.hartzell.work/dashboard/documents'
        });

        const sent = await sendEmail(env, {
          to: assignment.employee_email as string,
          toName: assignment.employee_name as string,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text,
          type: 'assignment_overdue',
          employeeId: assignment.bitrix_id as number
        });

        if (sent) {
          // Update last_overdue_sent timestamp
          await env.DB.prepare(`
            UPDATE document_assignments
            SET last_overdue_sent = ?
            WHERE id = ?
          `).bind(nowISO, assignment.id).run();

          overdueSent++;
          console.log(`[Cron] Sent overdue notice to ${assignment.employee_email} for "${assignment.template_title}"`);
        }
      } catch (error) {
        console.error(`[Cron] Failed to send overdue notice for assignment ${assignment.id}:`, error);
      }
    }

    console.log(`[Cron] Overdue emails sent: ${overdueSent}/${overdueAssignments.results.length}`);
    console.log(`[Cron] Completed scheduled email notifications check`);

  } catch (error) {
    console.error('[Cron] Error in scheduled handler:', error);
  }
}

// Export worker with both fetch and scheduled handlers
export default {
  fetch: app.fetch,
  scheduled: handleScheduled
};
