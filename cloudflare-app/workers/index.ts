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
import autosaveRoutes from './routes/applications-autosave';
import { settingsRoutes } from './routes/settings';
import { bitrixWebhookRoutes } from './routes/bitrix-webhooks';
import { onboardingRoutes } from './routes/onboarding';
import { validateCsrf } from './middleware/csrf';
import type { Env } from './types';
import { sendEmail, getReminderEmail, getOverdueEmail, getInterviewScheduledEmail, getApplicationRejectedEmail, getOfferExtendedEmail, getOnboardingWelcomeEmail } from './lib/email';
import { BitrixClient } from './lib/bitrix';

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
app.route('/api/applications', autosaveRoutes); // Auto-save endpoints
app.route('/api/bitrix', bitrixWebhookRoutes); // Bitrix24 webhook automations
app.route('/api/onboard', onboardingRoutes); // Onboarding portal (magic link)

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

// Stage ID constants for automation
const STAGES = {
  APPLICANTS_REJECT: 'DT1054_18:FAIL',
  APPLICANTS_OFFER: 'DT1054_18:SUCCESS',
} as const;

const CATEGORIES = {
  APPLICANTS: 18,
  ONBOARDING: 10,
  EMPLOYEES: 20,
  TERMINATED: 21,
} as const;

/**
 * Check for stage changes and trigger automations
 * Polls Bitrix24 for recently modified items and detects stage changes
 */
async function checkStageChanges(env: Env) {
  try {
    console.log('[StagePoller] Starting stage change check');

    // Fetch ALL items from Applicants (18) and Onboarding (10) categories
    // Note: updatedTime doesn't change when moving stages, so we poll all items
    const applicantsResponse = await fetch(`${env.BITRIX_WEBHOOK_URL}/crm.item.list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        entityTypeId: env.BITRIX24_ENTITY_TYPE_ID,
        'filter[categoryId]': CATEGORIES.APPLICANTS.toString(),
      }),
    });

    const onboardingResponse = await fetch(`${env.BITRIX_WEBHOOK_URL}/crm.item.list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        entityTypeId: env.BITRIX24_ENTITY_TYPE_ID,
        'filter[categoryId]': CATEGORIES.ONBOARDING.toString(),
      }),
    });

    const applicantsData = await applicantsResponse.json();
    const onboardingData = await onboardingResponse.json();

    const applicantItems = applicantsData.result?.items || [];
    const onboardingItems = onboardingData.result?.items || [];
    const items = [...applicantItems, ...onboardingItems];

    console.log(`[StagePoller] Polling ${applicantItems.length} applicants + ${onboardingItems.length} onboarding items = ${items.length} total`);

    let changesProcessed = 0;

    for (const item of items) {
      const itemId = item.id;
      const currentStage = item.stageId;
      const categoryId = parseInt(item.categoryId || '0');

      console.log(`[StagePoller] Item ${itemId}: currentStage=${currentStage}, categoryId=${categoryId}, title=${item.title || 'N/A'}`);

      // Get cached previous state
      const cacheKey = `item_state:${itemId}`;
      const cachedStateStr = await env.CACHE.get(cacheKey);

      let previousStage = null;
      if (cachedStateStr) {
        console.log(`[StagePoller] Found cached state for item ${itemId}: ${cachedStateStr}`);
        try {
          const cachedState = JSON.parse(cachedStateStr);
          previousStage = cachedState.stageId;
        } catch (e) {
          console.error(`[StagePoller] Failed to parse cached state for item ${itemId}:`, e);
        }
      } else {
        console.log(`[StagePoller] No cached state found for item ${itemId} (key: ${cacheKey})`);
      }

      // Detect stage change
      if (previousStage && previousStage !== currentStage) {
        console.log(`[StagePoller] Stage change detected: Item ${itemId} moved from ${previousStage} → ${currentStage}`);

        // Trigger automation
        await handleStageChange(env, parseInt(itemId), currentStage, categoryId);
        changesProcessed++;
      }

      // Update cached state for this item
      const stateToCache = JSON.stringify({
        stageId: currentStage,
        categoryId: categoryId,
        lastChecked: new Date().toISOString(),
      });

      console.log(`[StagePoller] Caching state for item ${itemId}: ${stateToCache}`);

      try {
        await env.CACHE.put(
          cacheKey,
          stateToCache,
          { expirationTtl: 30 * 24 * 60 * 60 } // 30 days
        );
        console.log(`[StagePoller] ✓ Successfully cached state for item ${itemId}`);
      } catch (kvError) {
        console.error(`[StagePoller] ✗ Failed to cache state for item ${itemId}:`, kvError);
      }
    }

    console.log(`[StagePoller] Processed ${changesProcessed} stage changes out of ${items.length} items checked`);

  } catch (error) {
    console.error('[StagePoller] Error checking stage changes:', error);
  }
}

/**
 * Handle stage change automation (same logic as webhook handler)
 */
async function handleStageChange(env: Env, itemId: number, stageId: string, categoryId: number) {
  try {
    console.log(`[Automation] Processing stage change for item ${itemId} → stage ${stageId}`);

    // Fetch employee data from Bitrix24
    const bitrix = new BitrixClient(env);
    const employee = await bitrix.getEmployee(itemId);

    if (!employee) {
      console.error(`[Automation] Employee not found for item ID ${itemId}`);
      return;
    }

    const employeeName = employee.title || 'Candidate';
    const employeeEmailRaw = employee.ufCrm6Email;
    const employeeEmail = Array.isArray(employeeEmailRaw) ? employeeEmailRaw[0] : employeeEmailRaw;
    const position = employee.ufCrm6Position || 'position';

    if (!employeeEmail) {
      console.error(`[Automation] No email found for employee ${itemId}`);
      return;
    }

    let emailSent = false;

    // AUTOMATION 1: Application Rejected
    if (stageId === STAGES.APPLICANTS_REJECT) {
      console.log(`[Automation] Sending rejection email to ${employeeEmail}`);

      const emailTemplate = getApplicationRejectedEmail({
        employeeName,
        position,
      });

      emailSent = await sendEmail(env, {
        to: employeeEmail,
        toName: employeeName,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
        type: 'application_rejected',
        employeeId: itemId,
      });

      if (emailSent) {
        console.log(`[Automation] ✓ Rejection email sent to ${employeeEmail}`);
        await logToBitrixTimeline(env, itemId, 'Rejection email sent automatically');
      }
    }

    // AUTOMATION 2: Offer Extended (with onboarding magic link)
    else if (stageId === STAGES.APPLICANTS_OFFER) {
      console.log(`[Automation] Sending offer email with onboarding link to ${employeeEmail}`);

      // Generate secure onboarding token
      const token = crypto.randomUUID().replace(/-/g, ''); // 32-char hex token
      const now = Date.now();
      const expiresAt = now + (7 * 24 * 60 * 60 * 1000); // 7 days from now

      try {
        // Store token in database
        await env.DB.prepare(`
          INSERT INTO onboarding_tokens (token, bitrix_id, employee_email, employee_name, expires_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(bitrix_id) DO UPDATE SET
            token = excluded.token,
            expires_at = excluded.expires_at,
            used_at = NULL,
            created_at = excluded.created_at
        `).bind(token, itemId, employeeEmail, employeeName, expiresAt, now).run();

        console.log(`[Automation] Created onboarding token for employee ${itemId}`);

        // Build secure magic link
        const onboardingUrl = `https://app.hartzell.work/onboard?token=${token}`;

        // Send offer email with onboarding link
        const emailTemplate = getOfferExtendedEmail({
          employeeName,
          position,
          managerName: 'Hartzell HR Team',
          onboardingUrl, // Include magic link
        });

        emailSent = await sendEmail(env, {
          to: employeeEmail,
          toName: employeeName,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text,
          type: 'offer_extended',
          employeeId: itemId,
        });

        if (emailSent) {
          console.log(`[Automation] ✓ Offer email with onboarding link sent to ${employeeEmail}`);
          await logToBitrixTimeline(env, itemId, `Offer email sent with secure onboarding link (expires in 7 days)`);
        }
      } catch (error) {
        console.error(`[Automation] Failed to create onboarding token:`, error);

        // Fallback: send offer email without onboarding link
        const emailTemplate = getOfferExtendedEmail({
          employeeName,
          position,
          managerName: 'Hartzell HR Team',
        });

        emailSent = await sendEmail(env, {
          to: employeeEmail,
          toName: employeeName,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text,
          type: 'offer_extended',
          employeeId: itemId,
        });
      }
    }

  } catch (error) {
    console.error(`[Automation] Error processing stage change for item ${itemId}:`, error);
  }
}

/**
 * Helper: Log activity to Bitrix24 item timeline
 */
async function logToBitrixTimeline(env: Env, itemId: number, message: string): Promise<boolean> {
  try {
    const response = await fetch(`${env.BITRIX_WEBHOOK_URL}/crm.timeline.comment.add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          ENTITY_ID: itemId,
          ENTITY_TYPE: 'dynamic_1054',
          COMMENT: message,
          AUTHOR_ID: 1,
        },
      }),
    });

    const result = await response.json();

    if (result.result) {
      console.log(`[Bitrix] Timeline entry added to item ${itemId}`);
      return true;
    } else {
      console.error('[Bitrix] Failed to add timeline entry:', result.error_description || result.error);
      return false;
    }
  } catch (error) {
    console.error('[Bitrix] Error logging to timeline:', error);
    return false;
  }
}

/**
 * Helper: Create Bitrix24 task for HR to follow up
 */
async function createHRTask(env: Env, options: {
  title: string;
  description: string;
  responsibleId: number;
  deadlineHours: number;
  candidateId: number;
}): Promise<boolean> {
  try {
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + options.deadlineHours);
    const deadlineStr = deadline.toISOString().slice(0, 19);

    const formData = new URLSearchParams({
      'fields[TITLE]': options.title,
      'fields[DESCRIPTION]': options.description,
      'fields[RESPONSIBLE_ID]': options.responsibleId.toString(),
      'fields[DEADLINE]': deadlineStr,
      'fields[PRIORITY]': '2',
      'fields[UF_CRM_TASK]': `["CO_${options.candidateId}"]`,
    });

    const response = await fetch(`${env.BITRIX_WEBHOOK_URL}/tasks.task.add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    const result = await response.json();

    if (result.result) {
      const taskId = result.result.task.id;
      console.log(`[Bitrix] Created task ${taskId} for user ${options.responsibleId}`);
      return true;
    } else {
      console.error('[Bitrix] Failed to create task:', result.error_description || result.error);
      return false;
    }
  } catch (error) {
    console.error('[Bitrix] Error creating task:', error);
    return false;
  }
}

/**
 * Helper: Get current hour in Eastern Time (ET)
 * Handles both EDT (UTC-4) and EST (UTC-5)
 *
 * Daylight Saving Time transitions:
 * - EDT starts: 2nd Sunday in March at 2:00 AM
 * - EST starts: 1st Sunday in November at 2:00 AM
 */
function getEasternTimeHour(date: Date): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth(); // 0-11
  const day = date.getUTCDate();
  const utcHour = date.getUTCHours();

  // Determine if we're in EDT or EST
  let isEDT = false;

  // EDT starts on 2nd Sunday of March at 2 AM
  const marchSecondSunday = getNthSundayOfMonth(year, 2, 2); // March = month 2

  // EST starts on 1st Sunday of November at 2 AM
  const novemberFirstSunday = getNthSundayOfMonth(year, 10, 1); // November = month 10

  const currentDate = new Date(Date.UTC(year, month, day, utcHour));

  if (currentDate >= marchSecondSunday && currentDate < novemberFirstSunday) {
    isEDT = true;
  }

  // Calculate Eastern Time hour
  const offset = isEDT ? -4 : -5; // EDT is UTC-4, EST is UTC-5
  const easternHour = (utcHour + offset + 24) % 24;

  return easternHour;
}

/**
 * Helper: Get the Nth occurrence of Sunday in a given month
 */
function getNthSundayOfMonth(year: number, month: number, n: number): Date {
  // Start at the first day of the month
  let date = new Date(Date.UTC(year, month, 1, 2, 0, 0)); // 2 AM UTC (transition time)

  // Find first Sunday
  while (date.getUTCDay() !== 0) {
    date.setUTCDate(date.getUTCDate() + 1);
  }

  // Add weeks to get to Nth Sunday
  date.setUTCDate(date.getUTCDate() + (n - 1) * 7);

  return date;
}

/**
 * Scheduled Event Handler
 * Two schedules:
 * 1. Every 15 minutes: Poll for stage changes and trigger automations
 * 2. Daily at 9:00 AM ET: Send reminder/overdue emails
 */
async function handleScheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
  console.log('[Cron] Triggered at', new Date().toISOString());

  // ALWAYS run stage change polling (every 15 minutes)
  await checkStageChanges(env);

  // Check if we should run email notifications (daily at 9 AM ET only)
  const now = new Date();
  const easternHour = getEasternTimeHour(now);

  if (easternHour !== 9) {
    console.log(`[Cron] Skipping email notifications - Current time is ${easternHour}:00 ET (expected 9:00 ET)`);
    return;
  }

  console.log('[Cron] Starting scheduled email notifications check at 9:00 AM ET');

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
          assignmentUrl: 'https://app.hartzell.work/'
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
          assignmentUrl: 'https://app.hartzell.work/'
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
