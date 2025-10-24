/**
 * Bitrix24 Webhook Handler
 * Listens for stage change events and triggers automation workflows
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import { sendEmail, getApplicationRejectedEmail, getOfferExtendedEmail, getOnboardingWelcomeEmail } from '../lib/email';
import { BitrixClient } from '../lib/bitrix';

export const bitrixWebhookRoutes = new Hono<{ Bindings: Env }>();

// Stage ID constants
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
 * POST /bitrix/stage-change
 * Webhook endpoint for Bitrix24 stage change events
 *
 * Expected payload from Bitrix24:
 * {
 *   "event": "ONCRMSTAGEIDCHANGE",
 *   "data": {
 *     "FIELDS": {
 *       "ID": "123",                    // Item ID in Bitrix24
 *       "STAGE_ID": "DT1054_18:FAIL",   // New stage ID
 *       "CATEGORY_ID": "18"             // Pipeline category ID
 *     }
 *   }
 * }
 */
bitrixWebhookRoutes.post('/stage-change', async (c) => {
  try {
    const body = await c.req.json();

    console.log('[Webhook] Received stage change event:', JSON.stringify(body));

    // Extract event data
    const event = body.event;
    const fields = body.data?.FIELDS || body.FIELDS; // Support both formats

    if (!fields || !fields.ID || !fields.STAGE_ID) {
      console.error('[Webhook] Invalid payload - missing required fields');
      return c.json({ success: false, error: 'Invalid payload' }, 400);
    }

    const itemId = fields.ID;
    const stageId = fields.STAGE_ID;
    const categoryId = parseInt(fields.CATEGORY_ID || '0');

    console.log(`[Webhook] Item ${itemId} moved to stage ${stageId} in category ${categoryId}`);

    // Fetch employee data from Bitrix24
    const bitrix = new BitrixClient(c.env);
    const employee = await bitrix.getEmployee(parseInt(itemId));

    if (!employee) {
      console.error(`[Webhook] Employee not found for item ID ${itemId}`);
      return c.json({ success: false, error: 'Employee not found' }, 404);
    }

    const employeeName = employee.title || 'Candidate';
    const employeeEmail = employee.ufCrm6Email;
    const position = employee.ufCrm6Position || 'position'; // Field for job title

    if (!employeeEmail) {
      console.error(`[Webhook] No email found for employee ${itemId}`);
      return c.json({ success: false, error: 'No email address' }, 400);
    }

    let emailSent = false;

    // AUTOMATION 1: Application Rejected
    if (stageId === STAGES.APPLICANTS_REJECT) {
      console.log(`[Webhook] Sending rejection email to ${employeeEmail}`);

      const emailTemplate = getApplicationRejectedEmail({
        employeeName,
        position,
      });

      emailSent = await sendEmail(c.env, {
        to: employeeEmail,
        toName: employeeName,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
        type: 'application_rejected',
        employeeId: parseInt(itemId),
      });

      if (emailSent) {
        console.log(`[Webhook] ✓ Rejection email sent to ${employeeEmail}`);

        // Log to Bitrix24 timeline
        await logToBitrixTimeline(c.env, parseInt(itemId), 'Rejection email sent automatically');
      }
    }

    // AUTOMATION 2: Offer Extended (with onboarding magic link)
    else if (stageId === STAGES.APPLICANTS_OFFER) {
      console.log(`[Webhook] Sending offer email with onboarding link to ${employeeEmail}`);

      // Generate secure onboarding token
      const token = crypto.randomUUID().replace(/-/g, ''); // 32-char hex token
      const now = Date.now();
      const expiresAt = now + (7 * 24 * 60 * 60 * 1000); // 7 days from now

      try {
        // Store token in database
        await c.env.DB.prepare(`
          INSERT INTO onboarding_tokens (token, bitrix_id, employee_email, employee_name, expires_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(bitrix_id) DO UPDATE SET
            token = excluded.token,
            expires_at = excluded.expires_at,
            used_at = NULL,
            created_at = excluded.created_at
        `).bind(token, parseInt(itemId), employeeEmail, employeeName, expiresAt, now).run();

        console.log(`[Webhook] Created onboarding token for employee ${itemId}`);

        // Build secure magic link
        const onboardingUrl = `https://app.hartzell.work/onboard?token=${token}`;

        // Send offer email with onboarding link
        const emailTemplate = getOfferExtendedEmail({
          employeeName,
          position,
          managerName: 'Hartzell HR Team',
          onboardingUrl, // Include magic link
        });

        emailSent = await sendEmail(c.env, {
          to: employeeEmail,
          toName: employeeName,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text,
          type: 'offer_extended',
          employeeId: parseInt(itemId),
        });

        if (emailSent) {
          console.log(`[Webhook] ✓ Offer email with onboarding link sent to ${employeeEmail}`);

          // Log to Bitrix24 timeline
          await logToBitrixTimeline(c.env, parseInt(itemId), `Offer email sent with secure onboarding link (expires in 7 days)`);
        }
      } catch (error) {
        console.error(`[Webhook] Failed to create onboarding token:`, error);

        // Fallback: send offer email without onboarding link
        const emailTemplate = getOfferExtendedEmail({
          employeeName,
          position,
          managerName: 'Hartzell HR Team',
        });

        emailSent = await sendEmail(c.env, {
          to: employeeEmail,
          toName: employeeName,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text,
          type: 'offer_extended',
          employeeId: parseInt(itemId),
        });
      }
    }

    return c.json({
      success: true,
      message: emailSent ? 'Email sent successfully' : 'No automation triggered for this stage',
      stage: stageId,
      category: categoryId,
      emailSent,
    });

  } catch (error) {
    console.error('[Webhook] Error processing stage change:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

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
          ENTITY_TYPE: 'dynamic_1054', // HR Center SPA entity type
          COMMENT: message,
          AUTHOR_ID: 1, // System user
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
    // Calculate deadline (48 hours from now)
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + options.deadlineHours);
    const deadlineStr = deadline.toISOString().slice(0, 19); // Format: YYYY-MM-DDTHH:mm:ss

    const formData = new URLSearchParams({
      'fields[TITLE]': options.title,
      'fields[DESCRIPTION]': options.description,
      'fields[RESPONSIBLE_ID]': options.responsibleId.toString(),
      'fields[DEADLINE]': deadlineStr,
      'fields[PRIORITY]': '2', // High priority
      'fields[UF_CRM_TASK]': `["CO_${options.candidateId}"]`, // Link to CRM contact
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
 * GET /bitrix/health
 * Health check endpoint for webhook configuration
 */
bitrixWebhookRoutes.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    webhooks: {
      stageChange: '/api/bitrix/stage-change',
    },
  });
});
