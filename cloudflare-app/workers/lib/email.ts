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
  | 'welcome'
  | 'application_received'
  | 'email_verification'
  | 'application_confirmation'
  | 'application_rejected'
  | 'offer_extended'
  | 'offer_letter_assigned'
  | 'onboarding_welcome'
  | 'interview_scheduled';

interface EmailTemplateData {
  employeeName: string;
  documentTitle?: string;
  dueDate?: string;
  assignmentUrl?: string;
  profileUrl?: string;
  verificationPin?: string;
  expiresInMinutes?: number;
  confirmUrl?: string;
  position?: string;
  startDate?: string;
  managerName?: string;
  managerEmail?: string;
  interviewDate?: string;
  interviewTime?: string;
  interviewLocation?: string;
  interviewType?: string;
  interviewerName?: string;
  onboardingUrl?: string; // Secure magic link to onboarding portal (7-day expiration)
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
    // Skip all preference checks for application_received and email_verification emails (they're always sent)
    if (options.type !== 'application_received' && options.type !== 'email_verification') {
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
      return true; // Always send welcome emails (ignore settings)
    case 'application_received':
      return true; // Always send application confirmations (ignore settings)
    case 'email_verification':
      return true; // Always send verification PINs (security critical)
    case 'offer_extended':
      return true; // Always send offer emails (critical for onboarding)
    case 'application_rejected':
      return true; // Always send rejection notifications
    case 'onboarding_welcome':
      return true; // Always send onboarding welcome emails
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
    case 'application_received':
      return true; // Always send application confirmations
    case 'email_verification':
      return true; // Always send verification PINs (security critical)
    case 'offer_extended':
      return true; // Always send offer emails (critical for onboarding)
    case 'application_rejected':
      return true; // Always send rejection notifications
    case 'onboarding_welcome':
      return true; // Always send onboarding welcome emails
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

export function getApplicationReceivedEmail(data: EmailTemplateData): { subject: string; html: string; text: string } {
  const subject = `Application Received - Thank You for Your Interest in Hartzell`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">

  <!-- Header with Logo -->
  <div style="background-color: #ffffff; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; border-bottom: 4px solid #003d6b;">
    <img src="https://hartzellpainting.com/wp-content/uploads/2025/05/Heartzell-Logo.png" alt="Hartzell Logo" style="max-width: 200px; height: auto; margin-bottom: 15px;" />
    <h1 style="margin: 0; font-size: 24px; color: #003d6b;">Application Received</h1>
  </div>

  <!-- Main Content -->
  <div style="background-color: #ffffff; padding: 40px 30px; border-left: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0;">
    <p style="font-size: 18px; color: #003d6b; margin-top: 0;">Dear ${data.employeeName},</p>

    <p style="font-size: 16px; line-height: 1.8;">
      Thank you for your interest in joining the Hartzell team. We have successfully received your application and appreciate you taking the time to share your qualifications with us.
    </p>

    <div style="background-color: #f0f7ff; border-left: 4px solid #003d6b; padding: 20px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0 0 10px 0; font-weight: bold; color: #003d6b;">What happens next?</p>
      <ul style="margin: 10px 0; padding-left: 20px; line-height: 1.8;">
        <li>Our HR team will carefully review your application</li>
        <li>We'll assess how your qualifications align with our current opportunities</li>
        <li>If there's a potential match, we will reach out to discuss next steps</li>
      </ul>
    </div>

    <p style="font-size: 16px; line-height: 1.8;">
      We understand that your time is valuable, and we are committed to giving every application the attention it deserves. Please keep your contact information current and remain reachable during this process.
    </p>

    <p style="font-size: 16px; line-height: 1.8;">
      If you have any questions in the meantime, please don't hesitate to contact our HR department.
    </p>

    <p style="font-size: 16px; line-height: 1.8; margin-top: 30px;">
      <strong>Best regards,</strong><br/>
      The Hartzell Companies HR Team
    </p>
  </div>

  <!-- Footer -->
  <div style="background-color: #003d6b; color: #ffffff; padding: 25px 30px; text-align: center; border-radius: 0 0 8px 8px;">
    <p style="margin: 0 0 10px 0; font-size: 14px;">
      <strong>Hartzell Companies</strong>
    </p>
    <p style="margin: 0; font-size: 13px; opacity: 0.9; line-height: 1.6;">
      This is an automated confirmation from Hartzell HR Center.<br/>
      Please do not reply directly to this email.
    </p>
  </div>

  <!-- Spacing -->
  <div style="height: 20px;"></div>

</body>
</html>
  `.trim();

  const text = `
HARTZELL COMPANIES - Application Received

Dear ${data.employeeName},

Thank you for your interest in joining the Hartzell team. We have successfully received your application and appreciate you taking the time to share your qualifications with us.

WHAT HAPPENS NEXT?

• Our HR team will carefully review your application
• We'll assess how your qualifications align with our current opportunities
• If there's a potential match, we will reach out to discuss next steps

We understand that your time is valuable, and we are committed to giving every application the attention it deserves. Please keep your contact information current and remain reachable during this process.

If you have any questions in the meantime, please don't hesitate to contact our HR department.

Best regards,
The Hartzell Companies HR Team

---
This is an automated confirmation from Hartzell HR Center.
Please do not reply directly to this email.
  `.trim();

  return { subject, html, text };
}

export function getEmailVerificationEmail(data: EmailTemplateData): { subject: string; html: string; text: string } {
  const subject = `Your Verification Code for Hartzell Application`;
  const pin = data.verificationPin || '000000';
  const expiresIn = data.expiresInMinutes || 10;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">

  <!-- Header with Logo -->
  <div style="background-color: #ffffff; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; border-bottom: 4px solid #003d6b;">
    <img src="https://hartzellpainting.com/wp-content/uploads/2025/05/Heartzell-Logo.png" alt="Hartzell Logo" style="max-width: 200px; height: auto; margin-bottom: 15px;" />
    <h1 style="margin: 0; font-size: 24px; color: #003d6b;">Email Verification</h1>
  </div>

  <!-- Main Content -->
  <div style="background-color: #ffffff; padding: 40px 30px; border-left: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0;">
    <p style="font-size: 18px; color: #003d6b; margin-top: 0;">Hello,</p>

    <p style="font-size: 16px; line-height: 1.8;">
      Thank you for starting your application with Hartzell. To continue, please verify your email address by entering the code below:
    </p>

    <!-- Verification Code Box -->
    <div style="background: linear-gradient(135deg, #003d6b 0%, #005a9c 100%); border-radius: 12px; padding: 30px; margin: 30px 0; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <p style="color: #ffffff; font-size: 14px; margin: 0 0 15px 0; letter-spacing: 1px; text-transform: uppercase;">Your Verification Code</p>
      <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; display: inline-block;">
        <p style="font-size: 42px; font-weight: bold; letter-spacing: 8px; margin: 0; color: #003d6b; font-family: 'Courier New', monospace;">${pin}</p>
      </div>
    </div>

    <div style="background-color: #fff8e1; border-left: 4px solid #f59e0b; padding: 15px 20px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        <strong>⏱️ This code expires in ${expiresIn} minutes.</strong><br/>
        For security, please do not share this code with anyone.
      </p>
    </div>

    <p style="font-size: 14px; line-height: 1.8; color: #666;">
      If you didn't request this verification code, please ignore this email. Someone may have entered your email address by mistake.
    </p>
  </div>

  <!-- Footer -->
  <div style="background-color: #003d6b; color: #ffffff; padding: 25px 30px; text-align: center; border-radius: 0 0 8px 8px;">
    <p style="margin: 0 0 10px 0; font-size: 14px;">
      <strong>Hartzell Companies</strong>
    </p>
    <p style="margin: 0; font-size: 13px; opacity: 0.9; line-height: 1.6;">
      This is an automated security email from Hartzell HR Center.<br/>
      Please do not reply directly to this email.
    </p>
  </div>

  <!-- Spacing -->
  <div style="height: 20px;"></div>

</body>
</html>
  `.trim();

  const text = `
HARTZELL COMPANIES - Email Verification

Hello,

Thank you for starting your application with Hartzell. To continue, please verify your email address by entering the code below:

VERIFICATION CODE: ${pin}

⏱️ This code expires in ${expiresIn} minutes.

For security, please do not share this code with anyone.

If you didn't request this verification code, please ignore this email. Someone may have entered your email address by mistake.

---
This is an automated security email from Hartzell HR Center.
Please do not reply directly to this email.
  `.trim();

  return { subject, html, text };
}

export function getApplicationConfirmationEmail(data: EmailTemplateData): { subject: string; html: string; text: string } {
  const subject = `Confirm Your Application - Hartzell Companies`;
  const confirmUrl = data.confirmUrl || '#';
  const applicantName = data.employeeName || 'Applicant';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">

  <!-- Header with Logo -->
  <div style="background-color: #ffffff; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; border-bottom: 4px solid #003d6b;">
    <img src="https://hartzellpainting.com/wp-content/uploads/2025/05/Heartzell-Logo.png" alt="Hartzell Logo" style="max-width: 200px; height: auto; margin-bottom: 15px;" />
    <h1 style="margin: 0; font-size: 24px; color: #003d6b;">Confirm Your Application</h1>
  </div>

  <!-- Main Content -->
  <div style="background-color: #ffffff; padding: 40px 30px; border-left: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0;">
    <p style="font-size: 18px; color: #003d6b; margin-top: 0;">Dear ${applicantName},</p>

    <p style="font-size: 16px; line-height: 1.8;">
      Thank you for applying to join the Hartzell team! To complete your application submission, please click the button below to confirm your email address.
    </p>

    <!-- Confirmation Button -->
    <div style="text-align: center; margin: 35px 0;">
      <a href="${confirmUrl}" style="display: inline-block; background-color: #003d6b; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-size: 18px; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        Confirm My Application
      </a>
    </div>

    <p style="font-size: 14px; color: #666; line-height: 1.8;">
      This link will expire in <strong>24 hours</strong>. If the button above doesn't work, copy and paste this URL into your browser:
    </p>

    <div style="background-color: #f5f5f5; border: 1px solid #e0e0e0; padding: 15px; border-radius: 4px; word-break: break-all; font-size: 13px; color: #666; margin: 15px 0;">
      ${confirmUrl}
    </div>

    <p style="font-size: 14px; color: #999; line-height: 1.8; margin-top: 25px;">
      If you didn't submit this application, please ignore this email.
    </p>
  </div>

  <!-- Footer -->
  <div style="background-color: #003d6b; color: #ffffff; padding: 25px 30px; text-align: center; border-radius: 0 0 8px 8px;">
    <p style="margin: 0 0 10px 0; font-size: 14px;">
      <strong>Hartzell Companies</strong>
    </p>
    <p style="margin: 0; font-size: 13px; opacity: 0.9; line-height: 1.6;">
      This is an automated confirmation from Hartzell HR Center.<br/>
      Please do not reply directly to this email.
    </p>
  </div>

  <!-- Spacing -->
  <div style="height: 20px;"></div>

</body>
</html>
  `.trim();

  const text = `
HARTZELL COMPANIES - Confirm Your Application

Dear ${applicantName},

Thank you for applying to join the Hartzell team! To complete your application submission, please confirm your email address by clicking the link below:

${confirmUrl}

This link will expire in 24 hours.

If you didn't submit this application, please ignore this email.

---
This is an automated confirmation from Hartzell HR Center.
Please do not reply directly to this email.
  `.trim();

  return { subject, html, text };
}

/**
 * Application Rejection Email
 * Professional rejection notice with respectful tone
 */
export function getApplicationRejectedEmail(data: EmailTemplateData): { subject: string; html: string; text: string } {
  const subject = `Update on Your Application with Hartzell Companies`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: #ffffff; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; border-bottom: 4px solid #003d6b;">
    <img src="https://hartzellpainting.com/wp-content/uploads/2025/05/Heartzell-Logo.png" alt="Hartzell Logo" style="max-width: 200px; height: auto; margin-bottom: 15px;" />
    <h1 style="margin: 0; font-size: 24px; color: #003d6b;">Application Update</h1>
  </div>
  <div style="background-color: #ffffff; padding: 40px 30px; border-left: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0;">
    <p style="font-size: 18px; color: #003d6b; margin-top: 0;">Dear ${data.employeeName},</p>
    <p style="font-size: 16px; line-height: 1.8;">Thank you for taking the time to apply for the ${data.position || 'position'} role with Hartzell Companies. We sincerely appreciate your interest in joining our team.</p>
    <p style="font-size: 16px; line-height: 1.8;">After careful consideration of your application and qualifications, we have decided to move forward with other candidates whose experience more closely aligns with the specific requirements of this role.</p>
    <div style="background-color: #f0f7ff; border-left: 4px solid #003d6b; padding: 20px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 15px; line-height: 1.8; color: #555;">This decision in no way diminishes your skills and accomplishments. The hiring process was highly competitive, and we received many qualified applications.</p>
    </div>
    <p style="font-size: 16px; line-height: 1.8;">We will keep your application on file for 12 months. Should a position that better matches your background become available, we may reach out to discuss opportunities.</p>
    <p style="font-size: 16px; line-height: 1.8;">We wish you every success in your career journey and future endeavors.</p>
    <p style="font-size: 16px; line-height: 1.8; margin-top: 30px;"><strong>Best regards,</strong><br/>The Hartzell Companies Recruitment Team</p>
  </div>
  <div style="background-color: #003d6b; color: #ffffff; padding: 25px 30px; text-align: center; border-radius: 0 0 8px 8px;">
    <p style="margin: 0 0 10px 0; font-size: 14px;"><strong>Hartzell Companies</strong></p>
    <p style="margin: 0; font-size: 13px; opacity: 0.9; line-height: 1.6;">This is an automated message from Hartzell HR Center.<br/>Please do not reply directly to this email.</p>
  </div>
  <div style="height: 20px;"></div>
</body>
</html>
  `.trim();

  const text = `
HARTZELL COMPANIES - Application Update

Dear ${data.employeeName},

Thank you for taking the time to apply for the ${data.position || 'position'} role with Hartzell Companies. We sincerely appreciate your interest in joining our team.

After careful consideration of your application and qualifications, we have decided to move forward with other candidates whose experience more closely aligns with the specific requirements of this role.

This decision in no way diminishes your skills and accomplishments. The hiring process was highly competitive, and we received many qualified applications.

We will keep your application on file for 12 months. Should a position that better matches your background become available, we may reach out to discuss opportunities.

We wish you every success in your career journey and future endeavors.

Best regards,
The Hartzell Companies Recruitment Team

---
This is an automated message from Hartzell HR Center.
  `.trim();

  return { subject, html, text };
}

/**
 * Offer Extended Email (with secure onboarding link)
 */
export function getOfferExtendedEmail(data: EmailTemplateData): { subject: string; html: string; text: string } {
  const subject = `🎉 Congratulations - Job Offer from Hartzell Companies!`;
  const onboardingUrl = data.onboardingUrl || '#';
  const hasOnboardingLink = data.onboardingUrl ? true : false;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: #16a34a; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <img src="https://hartzellpainting.com/wp-content/uploads/2025/05/Heartzell-Logo.png" alt="Hartzell Logo" style="max-width: 200px; height: auto; margin-bottom: 15px; filter: brightness(0) invert(1);" />
    <h1 style="margin: 0; font-size: 28px; color: #ffffff;">🎉 Congratulations!</h1>
  </div>
  <div style="background-color: #ffffff; padding: 40px 30px; border-left: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0;">
    <p style="font-size: 18px; color: #16a34a; margin-top: 0; font-weight: bold;">Dear ${data.employeeName},</p>
    <p style="font-size: 16px; line-height: 1.8;">We are <strong>thrilled</strong> to inform you that we would like to extend an offer for the <strong>${data.position || 'position'}</strong> role at Hartzell Companies!</p>
    <p style="font-size: 16px; line-height: 1.8;">After reviewing your qualifications and experience, we believe you would be an excellent addition to our team. Your skills and background align perfectly with what we're looking for.</p>

    ${hasOnboardingLink ? `
    <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 20px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0 0 10px 0; font-weight: bold; color: #16a34a;">📋 Next Steps - Complete Your Onboarding:</p>
      <p style="margin: 10px 0; line-height: 1.8; color: #555;">We've created a secure onboarding portal for you to complete your new hire paperwork. Click the button below to get started:</p>
    </div>

    <div style="text-align: center; margin: 35px 0;">
      <a href="${onboardingUrl}" style="display: inline-block; background-color: #16a34a; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-size: 18px; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        Complete Onboarding →
      </a>
    </div>

    <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px 20px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        <strong>⏱️ This secure link expires in 7 days.</strong><br/>
        You'll complete: I-9, W-4, Direct Deposit, Background Check, Drug Test, and Employee Handbook acknowledgment.
      </p>
    </div>

    <p style="font-size: 14px; color: #666; line-height: 1.8;">
      <strong>Security Note:</strong> This is a one-time use link unique to you. Do not share it with anyone. If the button above doesn't work, copy and paste this URL:
    </p>

    <div style="background-color: #f5f5f5; border: 1px solid #e0e0e0; padding: 12px; border-radius: 4px; word-break: break-all; font-size: 12px; color: #666; margin: 15px 0; font-family: monospace;">
      ${onboardingUrl}
    </div>
    ` : `
    <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 20px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0 0 10px 0; font-weight: bold; color: #16a34a;">What Happens Next:</p>
      <ol style="margin: 10px 0; padding-left: 20px; line-height: 1.8;">
        <li><strong>HR Contact</strong> - Our HR team will call you within 24-48 hours</li>
        <li><strong>Formal Offer Letter</strong> - Once you verbally accept, we'll send an official offer letter to sign</li>
        <li><strong>Onboarding Process</strong> - After signing, you'll complete your new hire paperwork</li>
      </ol>
    </div>
    <p style="font-size: 16px; line-height: 1.8;">Please keep your phone and email handy - we're excited to connect with you!</p>
    `}

    <p style="font-size: 16px; line-height: 1.8; margin-top: 30px;"><strong>Warm regards,</strong><br/>${data.managerName || 'The Hartzell Companies HR Team'}</p>
  </div>
  <div style="background-color: #16a34a; color: #ffffff; padding: 25px 30px; text-align: center; border-radius: 0 0 8px 8px;">
    <p style="margin: 0 0 10px 0; font-size: 14px;"><strong>Welcome to Hartzell Companies!</strong></p>
    ${hasOnboardingLink ? `<p style="margin: 0; font-size: 13px; opacity: 0.9;">Questions? Contact HR at hr@hartzell.com</p>` : ''}
  </div>
  <div style="height: 20px;"></div>
</body>
</html>
  `.trim();

  const text = `
🎉 HARTZELL COMPANIES - Job Offer!

Dear ${data.employeeName},

We are thrilled to inform you that we would like to extend an offer for the ${data.position || 'position'} role at Hartzell Companies!

After reviewing your qualifications and experience, we believe you would be an excellent addition to our team.

${hasOnboardingLink ? `
NEXT STEPS - Complete Your Onboarding:

We've created a secure onboarding portal for you to complete your new hire paperwork:

${onboardingUrl}

⏱️ This secure link expires in 7 days.

You'll complete: I-9, W-4, Direct Deposit, Background Check, Drug Test, and Employee Handbook acknowledgment.

SECURITY NOTE: This is a one-time use link unique to you. Do not share it with anyone.
` : `
WHAT HAPPENS NEXT:
1. HR CONTACT - Our HR team will call you within 24-48 hours
2. FORMAL OFFER LETTER - We'll send you an official offer letter to sign
3. ONBOARDING PROCESS - After signing, complete your new hire paperwork

Please keep your phone and email handy - we're excited to connect with you!
`}

Warm regards,
${data.managerName || 'The Hartzell Companies HR Team'}

---
Welcome to Hartzell Companies!
${hasOnboardingLink ? 'Questions? Contact HR at hr@hartzell.com' : ''}
  `.trim();

  return { subject, html, text };
}

/**
 * Onboarding Welcome Email
 */
export function getOnboardingWelcomeEmail(data: EmailTemplateData): { subject: string; html: string; text: string } {
  const subject = `Welcome to Hartzell - Let's Get You Started!`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: #003d6b; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <img src="https://hartzellpainting.com/wp-content/uploads/2025/05/Heartzell-Logo.png" alt="Hartzell Logo" style="max-width: 200px; height: auto; margin-bottom: 15px; filter: brightness(0) invert(1);" />
    <h1 style="margin: 0; font-size: 28px; color: #ffffff;">Welcome to Hartzell!</h1>
  </div>
  <div style="background-color: #ffffff; padding: 40px 30px; border-left: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0;">
    <p style="font-size: 18px; color: #003d6b; margin-top: 0; font-weight: bold;">Dear ${data.employeeName},</p>
    <p style="font-size: 16px; line-height: 1.8;">Congratulations on accepting your offer! We're excited to have you join Hartzell on <strong>${data.startDate || 'your upcoming start date'}</strong>.</p>
    <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0 0 10px 0; font-weight: bold; color: #92400e;">📋 Your To-Do List:</p>
      <ul style="margin: 10px 0; padding-left: 20px; line-height: 1.8;">
        <li>I-9 Employment Eligibility</li>
        <li>W-4 Tax Withholding</li>
        <li>Direct Deposit</li>
        <li>Background Check</li>
        <li>Drug Test</li>
      </ul>
    </div>
    ${data.assignmentUrl ? `<div style="text-align: center; margin: 30px 0;"><a href="${data.assignmentUrl}" style="display: inline-block; background-color: #003d6b; color: white; padding: 14px 40px; text-decoration: none; border-radius: 5px; font-weight: bold;">Complete Documents</a></div>` : ''}
    <p style="font-size: 16px; line-height: 1.8; margin-top: 30px;"><strong>Welcome to the team!</strong><br/>Hartzell HR</p>
  </div>
  <div style="background-color: #003d6b; color: #ffffff; padding: 25px 30px; text-align: center; border-radius: 0 0 8px 8px;">
    <p style="margin: 0; font-size: 13px;">Questions? Contact HR at hr@hartzell.com</p>
  </div>
</body>
</html>
  `.trim();

  const text = `
WELCOME TO HARTZELL!

Dear ${data.employeeName},

Congratulations! We're excited to have you join us on ${data.startDate || 'your start date'}.

TO-DO LIST:
□ I-9 Employment Eligibility
□ W-4 Tax Withholding
□ Direct Deposit
□ Background Check
□ Drug Test

${data.assignmentUrl ? `Complete now: ${data.assignmentUrl}` : ''}

Welcome to the team!
Hartzell HR
  `.trim();

  return { subject, html, text };
}

