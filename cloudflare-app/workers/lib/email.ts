/**
 * Email Service Module
 * Sends emails using Resend (transactional email API)
 *
 * Resend Documentation: https://resend.com/docs/api-reference/emails/send-email
 *
 * Requirements:
 * 1. RESEND_API_KEY environment variable (set via: wrangler secret put RESEND_API_KEY)
 * 2. DNS records configured for send.hartzell.work (MX, SPF, DKIM)
 */

import type { Env } from '../types';

// Email template types
export type EmailType =
  | 'assignment_created'
  | 'assignment_reminder'
  | 'assignment_overdue'
  | 'document_signed'
  | 'welcome';

interface EmailTemplateData {
  employeeName: string;
  documentTitle?: string;
  dueDate?: string;
  assignmentUrl?: string;
  profileUrl?: string;
  [key: string]: any;
}

interface SendEmailOptions {
  to: string;
  toName: string;
  subject: string;
  html: string;
  text: string;
  type: EmailType;
  employeeId?: number;
}

// Resend API endpoint
const RESEND_API = 'https://api.resend.com/emails';

// From email configuration
const FROM_EMAIL = 'noreply@hartzell.work';
const FROM_NAME = 'Hartzell HR Center';

/**
 * Send an email using Resend
 */
export async function sendEmail(env: Env, options: SendEmailOptions): Promise<boolean> {
  try {
    // Check if emails are globally enabled
    const globalSettings = await getGlobalEmailSettings(env);
    if (!globalSettings.emailEnabled) {
      console.log('[Email] Emails globally disabled, skipping');
      return false;
    }

    // Check if this specific email type is enabled
    const typeEnabled = isEmailTypeEnabled(globalSettings, options.type);
    if (!typeEnabled) {
      console.log(`[Email] Email type ${options.type} is disabled, skipping`);
      return false;
    }

    // If employeeId is provided, check employee's email preferences
    if (options.employeeId) {
      const employeePrefs = await getEmployeeEmailPreferences(env, options.employeeId);
      if (!employeePrefs.emailEnabled) {
        console.log(`[Email] Employee ${options.employeeId} has emails disabled, skipping`);
        return false;
      }

      // Check employee's specific preferences for this email type
      const employeeTypeEnabled = isEmailTypeEnabledForEmployee(employeePrefs, options.type);
      if (!employeeTypeEnabled) {
        console.log(`[Email] Employee ${options.employeeId} has ${options.type} disabled, skipping`);
        return false;
      }
    }

    // Construct Resend API request
    const payload = {
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [`${options.toName} <${options.to}>`],
      subject: options.subject,
      html: options.html,
      text: options.text
    };

    console.log(`[Email] Sending ${options.type} to ${options.to}`);

    // Send email via Resend
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
      console.error('[Email] Resend API error:', response.status, errorText);

      // Log failed email
      await logEmail(env, {
        employeeId: options.employeeId || null,
        emailType: options.type,
        recipient: options.to,
        subject: options.subject,
        status: 'failed',
        errorMessage: `HTTP ${response.status}: ${errorText}`
      });

      return false;
    }

    const responseData = await response.json();
    console.log(`[Email] Successfully sent ${options.type} to ${options.to}, ID:`, responseData.id);

    // Log successful email
    await logEmail(env, {
      employeeId: options.employeeId || null,
      emailType: options.type,
      recipient: options.to,
      subject: options.subject,
      status: 'sent',
      errorMessage: null
    });

    return true;

  } catch (error) {
    console.error('[Email] Failed to send email:', error);

    // Log failed email
    try {
      await logEmail(env, {
        employeeId: options.employeeId || null,
        emailType: options.type,
        recipient: options.to,
        subject: options.subject,
        status: 'failed',
        errorMessage: (error as Error).message
      });
    } catch (logError) {
      console.error('[Email] Failed to log email error:', logError);
    }

    return false;
  }
}

/**
 * Get global email settings from database
 */
async function getGlobalEmailSettings(env: Env): Promise<any> {
  try {
    const result = await env.DB.prepare(`
      SELECT * FROM email_settings WHERE id = 1
    `).first();

    if (result) {
      return {
        emailEnabled: result.email_enabled === 1,
        notifyAssignments: result.notify_assignments === 1,
        notifyReminders: result.notify_reminders === 1,
        notifyOverdue: result.notify_overdue === 1,
        notifyConfirmations: result.notify_confirmations === 1,
        reminderDaysBefore: result.reminder_days_before || 3,
      };
    }

    // Default settings if not configured yet
    return {
      emailEnabled: true,
      notifyAssignments: true,
      notifyReminders: true,
      notifyOverdue: true,
      notifyConfirmations: true,
      reminderDaysBefore: 3,
    };
  } catch (error) {
    console.error('[Email] Failed to get global settings:', error);
    // Return safe defaults
    return {
      emailEnabled: false,
      notifyAssignments: false,
      notifyReminders: false,
      notifyOverdue: false,
      notifyConfirmations: false,
      reminderDaysBefore: 3,
    };
  }
}

/**
 * Get employee's email preferences
 */
async function getEmployeeEmailPreferences(env: Env, employeeId: number): Promise<any> {
  try {
    const result = await env.DB.prepare(`
      SELECT * FROM email_preferences WHERE employee_id = ?
    `).bind(employeeId).first();

    if (result) {
      return {
        emailEnabled: result.email_enabled === 1,
        notifyAssignments: result.notify_assignments === 1,
        notifyReminders: result.notify_reminders === 1,
        notifyOverdue: result.notify_overdue === 1,
        notifyConfirmations: result.notify_confirmations === 1,
      };
    }

    // Default preferences if employee hasn't configured yet (all enabled)
    return {
      emailEnabled: true,
      notifyAssignments: true,
      notifyReminders: true,
      notifyOverdue: true,
      notifyConfirmations: true,
    };
  } catch (error) {
    console.error('[Email] Failed to get employee preferences:', error);
    // Return safe defaults (all enabled)
    return {
      emailEnabled: true,
      notifyAssignments: true,
      notifyReminders: true,
      notifyOverdue: true,
      notifyConfirmations: true,
    };
  }
}

/**
 * Check if specific email type is enabled globally
 */
function isEmailTypeEnabled(settings: any, type: EmailType): boolean {
  switch (type) {
    case 'assignment_created':
      return settings.notifyAssignments;
    case 'assignment_reminder':
      return settings.notifyReminders;
    case 'assignment_overdue':
      return settings.notifyOverdue;
    case 'document_signed':
      return settings.notifyConfirmations;
    case 'welcome':
      return true; // Always send welcome emails
    default:
      return false;
  }
}

/**
 * Check if specific email type is enabled for employee
 */
function isEmailTypeEnabledForEmployee(prefs: any, type: EmailType): boolean {
  switch (type) {
    case 'assignment_created':
      return prefs.notifyAssignments;
    case 'assignment_reminder':
      return prefs.notifyReminders;
    case 'assignment_overdue':
      return prefs.notifyOverdue;
    case 'document_signed':
      return prefs.notifyConfirmations;
    case 'welcome':
      return true; // Always send these if globally enabled
    default:
      return true;
  }
}

/**
 * Log email sending attempt
 */
async function logEmail(env: Env, data: {
  employeeId: number | null;
  emailType: string;
  recipient: string;
  subject: string;
  status: 'sent' | 'failed';
  errorMessage: string | null;
}): Promise<void> {
  try {
    await env.DB.prepare(`
      INSERT INTO email_log (
        employee_id, email_type, recipient, subject, status, error_message, sent_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.employeeId,
      data.emailType,
      data.recipient,
      data.subject,
      data.status,
      data.errorMessage,
      new Date().toISOString()
    ).run();
  } catch (error) {
    console.error('[Email] Failed to log email:', error);
  }
}

/**
 * Email Templates
 */

export function getAssignmentCreatedEmail(data: EmailTemplateData): { subject: string; html: string; text: string } {
  const subject = `New Document Assignment: ${data.documentTitle}`;

  const html = `
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
    <h2 style="color: #003d6b; margin-top: 0;">New Document Assignment</h2>

    <p>Hello ${data.employeeName},</p>

    <p>You have been assigned a new document that requires your attention:</p>

    <div style="background-color: white; padding: 20px; border-left: 4px solid #003d6b; margin: 20px 0;">
      <h3 style="margin: 0 0 10px 0; color: #003d6b;">${data.documentTitle}</h3>
      ${data.dueDate ? `<p style="margin: 5px 0; color: #666;">Due Date: <strong>${data.dueDate}</strong></p>` : ''}
    </div>

    ${data.assignmentUrl ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.assignmentUrl}" style="display: inline-block; background-color: #003d6b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Document</a>
    </div>
    ` : ''}

    <p>Please log in to the HR portal to review and complete this document at your earliest convenience.</p>

    <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
      This is an automated message from Hartzell HR Center. If you have questions, please contact your HR administrator.
    </p>
  </div>
</body>
</html>
  `.trim();

  const text = `
Hartzell HR Center - New Document Assignment

Hello ${data.employeeName},

You have been assigned a new document that requires your attention:

Document: ${data.documentTitle}
${data.dueDate ? `Due Date: ${data.dueDate}` : ''}

${data.assignmentUrl ? `View Document: ${data.assignmentUrl}` : ''}

Please log in to the HR portal to review and complete this document at your earliest convenience.

---
This is an automated message from Hartzell HR Center.
  `.trim();

  return { subject, html, text };
}

export function getReminderEmail(data: EmailTemplateData): { subject: string; html: string; text: string } {
  const subject = `Reminder: ${data.documentTitle} - Due Soon`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">⏰ Document Reminder</h1>
  </div>

  <div style="background-color: #fffbeb; padding: 30px; border: 1px solid #fde68a; border-top: none; border-radius: 0 0 8px 8px;">
    <h2 style="color: #92400e; margin-top: 0;">Upcoming Due Date</h2>

    <p>Hello ${data.employeeName},</p>

    <p>This is a friendly reminder that you have a pending document due soon:</p>

    <div style="background-color: white; padding: 20px; border-left: 4px solid #f59e0b; margin: 20px 0;">
      <h3 style="margin: 0 0 10px 0; color: #92400e;">${data.documentTitle}</h3>
      <p style="margin: 5px 0; color: #92400e; font-weight: bold;">Due Date: ${data.dueDate}</p>
    </div>

    ${data.assignmentUrl ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.assignmentUrl}" style="display: inline-block; background-color: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Complete Now</a>
    </div>
    ` : ''}

    <p>Please complete this document before the due date to stay compliant.</p>

    <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #fde68a;">
      This is an automated reminder from Hartzell HR Center.
    </p>
  </div>
</body>
</html>
  `.trim();

  const text = `
⏰ Hartzell HR Center - Document Reminder

Hello ${data.employeeName},

This is a friendly reminder that you have a pending document due soon:

Document: ${data.documentTitle}
Due Date: ${data.dueDate}

${data.assignmentUrl ? `Complete Now: ${data.assignmentUrl}` : ''}

Please complete this document before the due date to stay compliant.

---
This is an automated reminder from Hartzell HR Center.
  `.trim();

  return { subject, html, text };
}

export function getOverdueEmail(data: EmailTemplateData): { subject: string; html: string; text: string } {
  const subject = `OVERDUE: ${data.documentTitle} - Action Required`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">⚠️ Overdue Document</h1>
  </div>

  <div style="background-color: #fef2f2; padding: 30px; border: 1px solid #fecaca; border-top: none; border-radius: 0 0 8px 8px;">
    <h2 style="color: #991b1b; margin-top: 0;">Immediate Action Required</h2>

    <p>Hello ${data.employeeName},</p>

    <p><strong>This document is now overdue and requires your immediate attention:</strong></p>

    <div style="background-color: white; padding: 20px; border-left: 4px solid #dc2626; margin: 20px 0;">
      <h3 style="margin: 0 0 10px 0; color: #991b1b;">${data.documentTitle}</h3>
      <p style="margin: 5px 0; color: #dc2626; font-weight: bold;">Was Due: ${data.dueDate}</p>
    </div>

    ${data.assignmentUrl ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.assignmentUrl}" style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Complete Now</a>
    </div>
    ` : ''}

    <p>Please complete this document as soon as possible. If you have any questions or issues, contact HR immediately.</p>

    <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #fecaca;">
      This is an automated notification from Hartzell HR Center.
    </p>
  </div>
</body>
</html>
  `.trim();

  const text = `
⚠️ Hartzell HR Center - OVERDUE DOCUMENT

Hello ${data.employeeName},

This document is now overdue and requires your immediate attention:

Document: ${data.documentTitle}
Was Due: ${data.dueDate}

${data.assignmentUrl ? `Complete Now: ${data.assignmentUrl}` : ''}

Please complete this document as soon as possible. If you have any questions or issues, contact HR immediately.

---
This is an automated notification from Hartzell HR Center.
  `.trim();

  return { subject, html, text };
}

export function getConfirmationEmail(data: EmailTemplateData): { subject: string; html: string; text: string } {
  const subject = `Confirmed: ${data.documentTitle} - Signature Received`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #16a34a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">✅ Document Completed</h1>
  </div>

  <div style="background-color: #f0fdf4; padding: 30px; border: 1px solid #bbf7d0; border-top: none; border-radius: 0 0 8px 8px;">
    <h2 style="color: #166534; margin-top: 0;">Thank You!</h2>

    <p>Hello ${data.employeeName},</p>

    <p>We have received your signature for the following document:</p>

    <div style="background-color: white; padding: 20px; border-left: 4px solid #16a34a; margin: 20px 0;">
      <h3 style="margin: 0 0 10px 0; color: #166534;">${data.documentTitle}</h3>
      <p style="margin: 5px 0; color: #16a34a; font-weight: bold;">Status: Completed</p>
    </div>

    <p>Your signed document has been securely stored and is now part of your employee record.</p>

    ${data.profileUrl ? `
    <p>You can view all your documents anytime in your <a href="${data.profileUrl}" style="color: #16a34a;">employee profile</a>.</p>
    ` : ''}

    <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0;">
      This is an automated confirmation from Hartzell HR Center.
    </p>
  </div>
</body>
</html>
  `.trim();

  const text = `
✅ Hartzell HR Center - Document Completed

Hello ${data.employeeName},

We have received your signature for the following document:

Document: ${data.documentTitle}
Status: Completed

Your signed document has been securely stored and is now part of your employee record.

${data.profileUrl ? `View your documents: ${data.profileUrl}` : ''}

---
This is an automated confirmation from Hartzell HR Center.
  `.trim();

  return { subject, html, text };
}

