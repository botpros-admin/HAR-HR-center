/**
 * Admin Settings Routes
 * Manages global email settings and system configuration
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../types';
import { verifySession } from '../lib/auth';
import { sendEmail } from '../lib/email';

export const settingsRoutes = new Hono<{ Bindings: Env }>();

// Admin authentication middleware
settingsRoutes.use('/*', async (c, next) => {
  const env = c.env;

  // Get session token from Authorization header or cookie
  let sessionId = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!sessionId) {
    sessionId = c.req.header('Cookie')
      ?.split('; ')
      .find(row => row.startsWith('session='))
      ?.split('=')[1];
  }

  if (!sessionId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const session = await verifySession(env, sessionId);
  if (!session) {
    return c.json({ error: 'Invalid session' }, 401);
  }

  // Verify admin role
  if (session.role !== 'hr_admin') {
    return c.json({ error: 'Forbidden - Admin access required' }, 403);
  }

  // Store employee_id in context for audit logging
  c.set('employeeId', session.employee_id);

  await next();
});

// Validation schema for email settings
const EmailSettingsSchema = z.object({
  emailEnabled: z.boolean(),
  notifyAssignments: z.boolean(),
  notifyReminders: z.boolean(),
  notifyOverdue: z.boolean(),
  notifyConfirmations: z.boolean(),
  notifyProfileUpdates: z.boolean(),
  reminderDaysBefore: z.number().int().min(1).max(14),
  testMode: z.boolean(),
  testEmail: z.union([
    z.string().email(),
    z.literal(''),
    z.null()
  ]).transform(val => val === '' ? null : val).optional().nullable(),
});

// ========== EMAIL SETTINGS ENDPOINTS ==========

// GET /api/admin/settings/email - Get email settings
settingsRoutes.get('/email', async (c) => {
  const env = c.env;

  try {
    const result = await env.DB.prepare(`
      SELECT * FROM email_settings WHERE id = 1
    `).first();

    if (!result) {
      // Return default settings if not configured yet
      return c.json({
        settings: {
          emailEnabled: false,
          notifyAssignments: true,
          notifyReminders: true,
          notifyOverdue: true,
          notifyConfirmations: true,
          notifyProfileUpdates: false,
          reminderDaysBefore: 3,
          testMode: true,
          testEmail: null,
        }
      });
    }

    return c.json({
      settings: {
        emailEnabled: result.email_enabled === 1,
        notifyAssignments: result.notify_assignments === 1,
        notifyReminders: result.notify_reminders === 1,
        notifyOverdue: result.notify_overdue === 1,
        notifyConfirmations: result.notify_confirmations === 1,
        notifyProfileUpdates: result.notify_profile_updates === 1,
        reminderDaysBefore: result.reminder_days_before,
        testMode: result.test_mode === 1,
        testEmail: result.test_email,
        updatedAt: result.updated_at,
      }
    });

  } catch (error) {
    console.error('[Settings] Error fetching email settings:', error);
    return c.json({ error: 'Failed to fetch email settings', details: (error as Error).message }, 500);
  }
});

// PUT /api/admin/settings/email - Update email settings
settingsRoutes.put('/email', async (c) => {
  const env = c.env;
  const employeeId = c.get('employeeId') as number;

  try {
    const body = await c.req.json();
    console.log('[Settings] Update email settings request:', JSON.stringify(body, null, 2));

    // Validate input
    const validation = EmailSettingsSchema.safeParse(body);
    if (!validation.success) {
      console.error('[Settings] Validation failed:', validation.error.errors);
      return c.json({
        error: 'Validation failed',
        details: validation.error.errors
      }, 400);
    }

    const settings = validation.data;

    // Get current settings for audit log
    const currentSettings = await env.DB.prepare(`
      SELECT * FROM email_settings WHERE id = 1
    `).first();

    // Build diff of changes
    const changes: Record<string, { before: any; after: any }> = {};
    if (currentSettings) {
      if ((currentSettings.email_enabled === 1) !== settings.emailEnabled) {
        changes.emailEnabled = { before: currentSettings.email_enabled === 1, after: settings.emailEnabled };
      }
      if ((currentSettings.notify_assignments === 1) !== settings.notifyAssignments) {
        changes.notifyAssignments = { before: currentSettings.notify_assignments === 1, after: settings.notifyAssignments };
      }
      if ((currentSettings.notify_reminders === 1) !== settings.notifyReminders) {
        changes.notifyReminders = { before: currentSettings.notify_reminders === 1, after: settings.notifyReminders };
      }
      if ((currentSettings.notify_overdue === 1) !== settings.notifyOverdue) {
        changes.notifyOverdue = { before: currentSettings.notify_overdue === 1, after: settings.notifyOverdue };
      }
      if ((currentSettings.notify_confirmations === 1) !== settings.notifyConfirmations) {
        changes.notifyConfirmations = { before: currentSettings.notify_confirmations === 1, after: settings.notifyConfirmations };
      }
      if ((currentSettings.notify_profile_updates === 1) !== settings.notifyProfileUpdates) {
        changes.notifyProfileUpdates = { before: currentSettings.notify_profile_updates === 1, after: settings.notifyProfileUpdates };
      }
      if (currentSettings.reminder_days_before !== settings.reminderDaysBefore) {
        changes.reminderDaysBefore = { before: currentSettings.reminder_days_before, after: settings.reminderDaysBefore };
      }
      if ((currentSettings.test_mode === 1) !== settings.testMode) {
        changes.testMode = { before: currentSettings.test_mode === 1, after: settings.testMode };
      }
      if (currentSettings.test_email !== settings.testEmail) {
        changes.testEmail = { before: currentSettings.test_email, after: settings.testEmail };
      }
    }

    // Update settings (INSERT or UPDATE)
    await env.DB.prepare(`
      INSERT INTO email_settings (
        id, email_enabled, notify_assignments, notify_reminders,
        notify_overdue, notify_confirmations, notify_profile_updates,
        reminder_days_before, test_mode, test_email,
        updated_by, updated_at
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        email_enabled = excluded.email_enabled,
        notify_assignments = excluded.notify_assignments,
        notify_reminders = excluded.notify_reminders,
        notify_overdue = excluded.notify_overdue,
        notify_confirmations = excluded.notify_confirmations,
        notify_profile_updates = excluded.notify_profile_updates,
        reminder_days_before = excluded.reminder_days_before,
        test_mode = excluded.test_mode,
        test_email = excluded.test_email,
        updated_by = excluded.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      settings.emailEnabled ? 1 : 0,
      settings.notifyAssignments ? 1 : 0,
      settings.notifyReminders ? 1 : 0,
      settings.notifyOverdue ? 1 : 0,
      settings.notifyConfirmations ? 1 : 0,
      settings.notifyProfileUpdates ? 1 : 0,
      settings.reminderDaysBefore,
      settings.testMode ? 1 : 0,
      settings.testEmail || null,
      employeeId || null
    ).run();

    // Log the change in audit log (non-blocking)
    try {
      await env.DB.prepare(`
        INSERT INTO audit_logs (
          employee_id, bitrix_id, action, status, metadata, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        employeeId,
        employeeId,
        'email_settings_updated',
        'success',
        JSON.stringify({
          changeCount: Object.keys(changes).length,
          changes,
          timestamp: new Date().toISOString()
        }),
        new Date().toISOString()
      ).run();
      console.log(`[Settings] Email settings updated by employee ${employeeId}, audit logged`);
    } catch (auditError) {
      console.error('[Settings] Failed to log audit entry, but settings saved:', auditError);
    }

    return c.json({
      success: true,
      message: `Successfully updated ${Object.keys(changes).length} setting(s)`,
      settings
    });

  } catch (error) {
    console.error('[Settings] Error updating email settings:', error);
    console.error('[Settings] Error details:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
      employeeId,
      settingsKeys: Object.keys(settings || {})
    });

    // Log the failure
    try {
      await env.DB.prepare(`
        INSERT INTO audit_logs (
          employee_id, bitrix_id, action, status, metadata, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        employeeId || null,
        employeeId || null,
        'email_settings_updated',
        'failure',
        JSON.stringify({
          error: (error as Error).message,
          stack: (error as Error).stack,
          timestamp: new Date().toISOString()
        }),
        new Date().toISOString()
      ).run();
    } catch (auditError) {
      console.error('[Settings] Failed to log audit entry:', auditError);
    }

    return c.json({
      error: 'Failed to update email settings',
      details: (error as Error).message,
      stack: (error as Error).stack
    }, 500);
  }
});

// GET /api/admin/settings/email/logs - Get email delivery logs (for monitoring)
settingsRoutes.get('/email/logs', async (c) => {
  const env = c.env;

  try {
    const { searchParams } = new URL(c.req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status'); // sent, failed, bounced
    const emailType = searchParams.get('type'); // assignment_created, reminder, etc.

    let query = `
      SELECT
        el.id,
        el.employee_id,
        el.email_type,
        el.recipient,
        el.subject,
        el.status,
        el.error_message,
        el.sent_at,
        ec.full_name as employee_name,
        ec.badge_number as employee_badge
      FROM email_log el
      LEFT JOIN employee_cache ec ON el.employee_id = ec.bitrix_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      query += ' AND el.status = ?';
      params.push(status);
    }

    if (emailType) {
      query += ' AND el.email_type = ?';
      params.push(emailType);
    }

    query += ' ORDER BY el.sent_at DESC LIMIT ?';
    params.push(limit);

    const stmt = params.length > 0
      ? env.DB.prepare(query).bind(...params)
      : env.DB.prepare(query);

    const result = await stmt.all();

    const logs = result.results.map((row: any) => ({
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      employeeBadge: row.employee_badge,
      emailType: row.email_type,
      recipient: row.recipient,
      subject: row.subject,
      status: row.status,
      errorMessage: row.error_message,
      sentAt: row.sent_at
    }));

    // Get summary stats
    const stats = await env.DB.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END) as bounced
      FROM email_log
      WHERE sent_at >= datetime('now', '-7 days')
    `).first();

    return c.json({
      logs,
      stats: {
        total: stats?.total || 0,
        sent: stats?.sent || 0,
        failed: stats?.failed || 0,
        bounced: stats?.bounced || 0,
        successRate: stats?.total ? ((stats.sent || 0) / (stats.total as number) * 100).toFixed(1) : '0.0'
      }
    });

  } catch (error) {
    console.error('[Settings] Error fetching email logs:', error);
    return c.json({ error: 'Failed to fetch email logs', details: (error as Error).message }, 500);
  }
});

// POST /api/admin/settings/email/test - Send test email
settingsRoutes.post('/email/test', async (c) => {
  const env = c.env;

  try {
    const body = await c.req.json();
    const email = body.email;

    if (!email || typeof email !== 'string') {
      return c.json({ error: 'Email address is required' }, 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.json({ error: 'Invalid email address format' }, 400);
    }

    console.log(`[Settings] Sending test email to ${email}`);

    // Create test email content
    const testEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #003d6b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">Hartzell HR Center</h1>
  </div>

  <div style="background-color: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <h2 style="color: #003d6b; margin-top: 0;">✅ Test Email Successful</h2>

    <p>Hello,</p>

    <p>This is a test email from the Hartzell HR Center system. If you're seeing this message, your email configuration is working correctly!</p>

    <div style="background-color: white; padding: 20px; border-left: 4px solid #16a34a; margin: 20px 0;">
      <h3 style="margin: 0 0 10px 0; color: #16a34a;">Email System Status</h3>
      <p style="margin: 5px 0;">✅ Resend API: Connected</p>
      <p style="margin: 5px 0;">✅ Email Delivery: Working</p>
      <p style="margin: 5px 0;">✅ HTML Formatting: Active</p>
    </div>

    <p>Your email notification system is ready to send:</p>
    <ul>
      <li>Document assignment notifications</li>
      <li>Reminder emails</li>
      <li>Overdue notifications</li>
      <li>Signature confirmations</li>
    </ul>

    <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
      This is a test message from Hartzell HR Center. Sent at ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'short', timeStyle: 'long' })}.
    </p>
  </div>
</body>
</html>
    `.trim();

    const testEmailText = `
Hartzell HR Center - Test Email

✅ Test Email Successful

Hello,

This is a test email from the Hartzell HR Center system. If you're seeing this message, your email configuration is working correctly!

Email System Status:
✅ Resend API: Connected
✅ Email Delivery: Working
✅ HTML Formatting: Active

Your email notification system is ready to send:
- Document assignment notifications
- Reminder emails
- Overdue notifications
- Signature confirmations

---
This is a test message from Hartzell HR Center. Sent at ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'short', timeStyle: 'long' })}.
    `.trim();

    // Send test email (bypassing global settings check by calling Resend directly)
    const RESEND_API = 'https://api.resend.com/emails';
    const FROM_EMAIL = 'noreply@hartzell.work';
    const FROM_NAME = 'Hartzell HR Center';

    const payload = {
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [email],
      subject: '✅ Hartzell HR Center - Test Email',
      html: testEmailHtml,
      text: testEmailText
    };

    const response = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorText = errorData.message || JSON.stringify(errorData);
      console.error('[Settings] Resend API error:', response.status, errorText);

      // Provide helpful error messages
      let errorMessage = 'Failed to send test email';
      if (response.status === 401 || response.status === 403) {
        errorMessage = 'Email service authentication failed. Please verify RESEND_API_KEY is configured correctly.';
      } else if (response.status === 422) {
        errorMessage = `Email validation error: ${errorText}`;
      } else {
        errorMessage = `Resend API error (${response.status}): ${errorText}`;
      }

      return c.json({
        success: false,
        message: errorMessage,
        error: `HTTP ${response.status}`,
        details: errorText
      }, 500);
    }

    const responseData = await response.json();
    console.log(`[Settings] Test email sent successfully to ${email}, ID:`, responseData.id);

    return c.json({
      success: true,
      message: `Test email sent successfully to ${email}! Check your inbox (and spam folder).`
    });

  } catch (error) {
    console.error('[Settings] Error sending test email:', error);
    return c.json({
      success: false,
      error: 'Failed to send test email',
      details: (error as Error).message
    }, 500);
  }
});
