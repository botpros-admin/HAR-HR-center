/**
 * Application Auto-Save API Routes
 *
 * Field-level progressive saves for incomplete applications
 *
 * Flow:
 * 1. User fills email → blur → Check duplicate → Create draft (D1 only)
 * 2. User fills more fields → blur → Update draft
 * 3. After 3+ meaningful fields → Create Bitrix24 item in "App Incomplete"
 * 4. Continue updating both D1 and Bitrix24 on each field
 * 5. On submit → Move Bitrix24 to "Under Review" → Delete draft
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, BitrixEmployee } from '../types';
import { BitrixClient } from '../lib/bitrix';
import { sendEmail, getEmailVerificationEmail } from '../lib/email';

const app = new Hono<{ Bindings: Env }>();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const SaveFieldSchema = z.object({
  draftId: z.string().uuid().optional().nullable(),
  sessionId: z.string().min(1).max(100),
  fieldName: z.string().min(1).max(50),
  value: z.any(), // Can be string, number, array, etc.
  currentStep: z.number().min(1).max(5).optional().default(1),
});

const CheckDuplicateSchema = z.object({
  email: z.string().email(),
  phone: z.string().optional(),
  lastName: z.string().optional(),
  zipCode: z.string().optional(),
});

const SendVerificationSchema = z.object({
  email: z.string().email(),
  draftId: z.string().uuid().optional().nullable(),
});

const VerifyPinSchema = z.object({
  email: z.string().email(),
  pin: z.string().length(6).regex(/^\d{6}$/),
  draftId: z.string().uuid().optional().nullable(),
});

// ============================================================================
// HELPER: Determine if we should create Bitrix24 item
// ============================================================================

/**
 * Minimum fields required before creating Bitrix24 item
 *
 * Rationale: Only create CRM records for serious applicants
 * who've filled enough info to be actionable
 */
function shouldCreateBitrixItem(formData: Record<string, any>): boolean {
  const requiredFields = ['email', 'firstName', 'lastName', 'position'];
  const filledRequired = requiredFields.filter(f => formData[f] && formData[f].toString().trim().length > 0);

  // Need at least 3/4 required fields
  return filledRequired.length >= 3;
}

/**
 * Map frontend field names to Bitrix24 field names
 */
function mapFieldToBitrix(fieldName: string): string {
  const fieldMap: Record<string, string> = {
    email: 'ufCrm6Email',
    firstName: 'ufCrm6Name',
    middleName: 'ufCrm6SecondName',
    lastName: 'ufCrm6LastName',
    phone: 'ufCrm6PersonalMobile',
    address: 'ufCrm6AddressStreet',
    addressLine2: 'ufCrm6AddressLine2',
    city: 'ufCrm6AddressCity',
    state: 'ufCrm6AddressState',
    zipCode: 'ufCrm6AddressZip',
    position: 'ufCrm6Position',
    desiredSalary: 'ufCrm6DesiredSalary',
    availableStartDate: 'ufCrm6AvailableStart',
    employmentType: 'ufCrm6EmploymentType',
    shiftPreference: 'ufCrm6ShiftPref',
    educationLevel: 'ufCrm6EducationLevel',
    schoolName: 'ufCrm6SchoolName',
    fieldOfStudy: 'ufCrm6Degree',
    graduationYear: 'ufCrm6GraduationYear',
    yearsExperience: 'ufCrm6YearsExperience',
    skills: 'ufCrm6Skills',
    certifications: 'ufCrm6CertText',
    softwareExperience: 'ufCrm6Software',
    authorizedToWork: 'ufCrm6WorkAuth',
    felonyConviction: 'ufCrm6Felony',
    backgroundCheckConsent: 'ufCrm6BgCheck',
    howDidYouHear: 'ufCrm6Referral',
  };

  return fieldMap[fieldName] || null;
}

/**
 * Prepare value for Bitrix24 (handle arrays, booleans, enums)
 */
function prepareValueForBitrix(fieldName: string, value: any): any {
  // Arrays (email, phone) - Bitrix24 expects array format
  if (fieldName === 'email' || fieldName === 'phone') {
    return Array.isArray(value) ? value : [value];
  }

  // Phone normalization (remove dashes)
  if (fieldName === 'phone' && typeof value === 'string') {
    return [value.replace(/\D/g, '')];
  }

  // Booleans → 'Y' or 'N' strings
  if (['authorizedToWork', 'felonyConviction', 'backgroundCheckConsent'].includes(fieldName)) {
    if (typeof value === 'boolean') {
      return value ? 'Y' : 'N';
    }
    if (value === 'yes' || value === 'true' || value === '1') {
      return 'Y';
    }
    return 'N';
  }

  // Arrays → comma-separated strings (skills, certifications)
  if (['skills', 'certifications', 'softwareExperience'].includes(fieldName)) {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
  }

  return value;
}

// ============================================================================
// POST /api/applications/check-duplicate
// ============================================================================

app.post('/check-duplicate', async (c) => {
  const env = c.env;

  try {
    const body = await c.req.json();
    const { email, phone, lastName, zipCode } = CheckDuplicateSchema.parse(body);

    // First check D1 incomplete applications
    const incompleteApp = await env.DB.prepare(`
      SELECT
        id,
        email,
        first_name,
        last_name,
        position,
        current_step,
        completed_fields,
        bitrix_item_id,
        created_at,
        last_updated
      FROM incomplete_applications
      WHERE email = ?
      LIMIT 1
    `).bind(email).first();

    if (incompleteApp) {
      return c.json({
        exists: true,
        status: 'incomplete',
        applicationId: incompleteApp.id,
        details: {
          email: incompleteApp.email,
          name: `${incompleteApp.first_name || ''} ${incompleteApp.last_name || ''}`.trim() || null,
          position: incompleteApp.position,
          currentStep: incompleteApp.current_step,
          completedFields: incompleteApp.completed_fields,
          createdAt: new Date(incompleteApp.created_at).toISOString(),
          lastUpdated: new Date(incompleteApp.last_updated).toISOString(),
        }
      });
    }

    // Check submitted applications (D1)
    const submittedApp = await env.DB.prepare(`
      SELECT
        id,
        first_name,
        last_name,
        email,
        position,
        status,
        submitted_at,
        bitrix_id
      FROM applications
      WHERE email = ?
      ORDER BY submitted_at DESC
      LIMIT 1
    `).bind(email).first();

    if (submittedApp) {
      return c.json({
        exists: true,
        status: submittedApp.status || 'submitted',
        applicationId: submittedApp.id,
        details: {
          email: submittedApp.email,
          name: `${submittedApp.first_name} ${submittedApp.last_name}`,
          position: submittedApp.position,
          submittedAt: new Date(submittedApp.submitted_at).toISOString(),
          bitrixId: submittedApp.bitrix_id,
        }
      });
    }

    // No duplicates found
    return c.json({
      exists: false
    });

  } catch (error) {
    console.error('Duplicate check error:', error);
    return c.json({ error: 'Failed to check for duplicates' }, 500);
  }
});

// ============================================================================
// POST /api/applications/save-field
// ============================================================================

app.post('/save-field', async (c) => {
  const env = c.env;

  try {
    const body = await c.req.json();
    const { draftId, sessionId, fieldName, value, currentStep } = SaveFieldSchema.parse(body);

    const now = Date.now();
    const ipAddress = c.req.header('CF-Connecting-IP') || 'unknown';
    const userAgent = c.req.header('User-Agent') || 'unknown';

    // If no draftId, this is the first save - create new draft
    if (!draftId) {
      const newDraftId = crypto.randomUUID();

      // Initialize form_data with first field
      const formData: Record<string, any> = { [fieldName]: value };

      // If saving email field, delete any existing draft with this email
      // This handles the "Start Fresh" scenario where user uses same email
      if (fieldName === 'email') {
        await env.DB.prepare(`
          DELETE FROM incomplete_applications WHERE email = ?
        `).bind(value).run();
      }

      // Create draft in D1
      await env.DB.prepare(`
        INSERT INTO incomplete_applications (
          id,
          email,
          form_data,
          completed_fields,
          current_step,
          last_field_saved,
          session_id,
          ip_address,
          user_agent,
          created_at,
          last_updated,
          expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        newDraftId,
        fieldName === 'email' ? value : null,  // Set email if that's the first field
        JSON.stringify(formData),
        1,  // 1 field completed
        currentStep,
        fieldName,
        sessionId,
        ipAddress,
        userAgent,
        now,
        now,
        now + (30 * 24 * 60 * 60 * 1000)  // Expires in 30 days
      ).run();

      return c.json({
        success: true,
        draftId: newDraftId,
        message: 'Draft created',
        bitrixItemId: null,  // Not created yet
      });
    }

    // Update existing draft
    const draft = await env.DB.prepare(`
      SELECT * FROM incomplete_applications WHERE id = ?
    `).bind(draftId).first();

    if (!draft) {
      return c.json({ error: 'Draft not found' }, 404);
    }

    // Parse existing form data
    const formData: Record<string, any> = JSON.parse(draft.form_data as string);

    // Update field
    formData[fieldName] = value;

    // Update metadata fields if relevant
    if (fieldName === 'email' && !draft.email) {
      // Delete any OTHER draft with this email (handles Resume -> change email scenario)
      await env.DB.prepare(`
        DELETE FROM incomplete_applications WHERE email = ? AND id != ?
      `).bind(value, draftId).run();

      await env.DB.prepare(`
        UPDATE incomplete_applications SET email = ? WHERE id = ?
      `).bind(value, draftId).run();
    }
    if (fieldName === 'firstName' && !draft.first_name) {
      await env.DB.prepare(`
        UPDATE incomplete_applications SET first_name = ? WHERE id = ?
      `).bind(value, draftId).run();
    }
    if (fieldName === 'lastName' && !draft.last_name) {
      await env.DB.prepare(`
        UPDATE incomplete_applications SET last_name = ? WHERE id = ?
      `).bind(value, draftId).run();
    }
    if (fieldName === 'phone' && !draft.phone) {
      await env.DB.prepare(`
        UPDATE incomplete_applications SET phone = ? WHERE id = ?
      `).bind(value, draftId).run();
    }
    if (fieldName === 'position' && !draft.position) {
      await env.DB.prepare(`
        UPDATE incomplete_applications SET position = ? WHERE id = ?
      `).bind(value, draftId).run();
    }

    // Count completed fields (non-empty values)
    const completedCount = Object.values(formData).filter(v =>
      v !== null && v !== undefined && v !== '' && (Array.isArray(v) ? v.length > 0 : true)
    ).length;

    // Update D1 draft
    await env.DB.prepare(`
      UPDATE incomplete_applications
      SET
        form_data = ?,
        completed_fields = ?,
        current_step = ?,
        last_field_saved = ?,
        last_updated = ?
      WHERE id = ?
    `).bind(
      JSON.stringify(formData),
      completedCount,
      currentStep,
      fieldName,
      now,
      draftId
    ).run();

    // Check if we should create Bitrix24 item
    let bitrixItemId = draft.bitrix_item_id;

    // IMPORTANT: Only create Bitrix24 item if email is verified
    if (!draft.bitrix_created && draft.verified === 1 && shouldCreateBitrixItem(formData)) {
      // Create Bitrix24 item in "App Incomplete" stage
      const bitrixClient = new BitrixClient(env);

      try {
        const title = `${formData.firstName || 'Applicant'} ${formData.lastName || ''} - ${formData.position || 'Position TBD'}`.trim();

        const bitrixFields: Record<string, any> = {
          title,
          categoryId: 18,  // Recruitment pipeline
          stageId: 'DT1054_18:APP_INCOMPLETE',  // App Incomplete stage
          ufCrm6Source: 'Web Application Form - Auto-save',
          ufCrm6AppliedDate: new Date().toISOString(),
          ufCrm6IpAddress: ipAddress,
        };

        // Map all form fields to Bitrix24
        for (const [key, val] of Object.entries(formData)) {
          const bitrixFieldName = mapFieldToBitrix(key);
          if (bitrixFieldName && val !== null && val !== undefined) {
            bitrixFields[bitrixFieldName] = prepareValueForBitrix(key, val);
          }
        }

        const bitrixResult = await bitrixClient.createItem(bitrixFields);
        bitrixItemId = bitrixResult.id;

        // Update D1 with Bitrix ID
        await env.DB.prepare(`
          UPDATE incomplete_applications
          SET bitrix_item_id = ?, bitrix_created = 1
          WHERE id = ?
        `).bind(bitrixItemId, draftId).run();

        console.log(`Created Bitrix24 item ${bitrixItemId} for draft ${draftId}`);

      } catch (error) {
        console.error('Failed to create Bitrix24 item:', error);
        // Continue - Bitrix24 creation is non-critical, we have D1 backup
      }
    }

    // If Bitrix24 item exists, update it
    if (bitrixItemId) {
      const bitrixClient = new BitrixClient(env);

      try {
        const bitrixFieldName = mapFieldToBitrix(fieldName);
        if (bitrixFieldName) {
          await bitrixClient.updateItem(bitrixItemId, {
            [bitrixFieldName]: prepareValueForBitrix(fieldName, value),
            ufCrm6LastAutoSaved: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error(`Failed to update Bitrix24 item ${bitrixItemId}:`, error);
        // Non-critical - D1 has the data
      }
    }

    return c.json({
      success: true,
      draftId,
      bitrixItemId,
      completedFields: completedCount,
      message: 'Field saved'
    });

  } catch (error) {
    console.error('Save field error:', error);
    return c.json({ error: 'Failed to save field' }, 500);
  }
});

// ============================================================================
// GET /api/applications/resume/:draftId
// ============================================================================

app.get('/resume/:draftId', async (c) => {
  const env = c.env;
  const draftId = c.req.param('draftId');

  try {
    const draft = await env.DB.prepare(`
      SELECT * FROM incomplete_applications WHERE id = ?
    `).bind(draftId).first();

    if (!draft) {
      return c.json({ error: 'Draft not found' }, 404);
    }

    // Increment resume count
    await env.DB.prepare(`
      UPDATE incomplete_applications
      SET resume_count = resume_count + 1, last_resumed_at = ?
      WHERE id = ?
    `).bind(Date.now(), draftId).run();

    return c.json({
      success: true,
      formData: JSON.parse(draft.form_data as string),
      completedFields: draft.completed_fields,
      currentStep: draft.current_step,
      lastUpdated: new Date(draft.last_updated as number).toISOString(),
    });

  } catch (error) {
    console.error('Resume draft error:', error);
    return c.json({ error: 'Failed to load draft' }, 500);
  }
});

// ============================================================================
// SECURITY HELPERS FOR VERIFICATION
// ============================================================================

/**
 * Check if IP is currently blocked
 */
async function isIPBlocked(env: Env, ipAddress: string): Promise<{ blocked: boolean; reason?: string; expiresAt?: number }> {
  const now = Date.now();

  const block = await env.DB.prepare(`
    SELECT reason, expires_at FROM ip_blocks
    WHERE ip_address = ? AND expires_at > ?
  `).bind(ipAddress, now).first();

  if (block) {
    return {
      blocked: true,
      reason: block.reason as string,
      expiresAt: block.expires_at as number,
    };
  }

  return { blocked: false };
}

/**
 * Block an IP for 1 hour
 */
async function blockIP(env: Env, ipAddress: string, reason: string): Promise<void> {
  const now = Date.now();
  const expiresAt = now + (60 * 60 * 1000); // 1 hour

  await env.DB.prepare(`
    INSERT OR REPLACE INTO ip_blocks (ip_address, reason, blocked_at, expires_at, attempt_count)
    VALUES (?, ?, ?, ?, 1)
  `).bind(ipAddress, reason, now, expiresAt).run();

  console.log(`[Security] Blocked IP ${ipAddress} for: ${reason} (expires at ${new Date(expiresAt).toISOString()})`);
}

/**
 * Check rate limit for PIN sends (3 per hour per email)
 */
async function checkPinSendRateLimit(env: Env, email: string, ipAddress: string): Promise<{ allowed: boolean; attemptsLeft?: number }> {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);

  // Count PIN sends for this email in the last hour
  const emailCount = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM pin_rate_limits
    WHERE email = ? AND action = 'send' AND created_at > ?
  `).bind(email, oneHourAgo).first();

  const emailAttempts = (emailCount?.count as number) || 0;

  if (emailAttempts >= 3) {
    return { allowed: false, attemptsLeft: 0 };
  }

  return { allowed: true, attemptsLeft: 3 - emailAttempts };
}

/**
 * Check failed verification attempts (15 per hour per IP = block)
 */
async function checkFailedVerificationAttempts(env: Env, ipAddress: string): Promise<boolean> {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);

  const failedCount = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM pin_rate_limits
    WHERE ip_address = ? AND action = 'verify_failed' AND created_at > ?
  `).bind(ipAddress, oneHourAgo).first();

  const attempts = (failedCount?.count as number) || 0;

  if (attempts >= 15) {
    // Block this IP for 1 hour
    await blockIP(env, ipAddress, 'too_many_failed_verifications');
    return true; // Exceeded limit
  }

  return false; // Still allowed
}

/**
 * Log rate limit action
 */
async function logRateLimitAction(env: Env, email: string, ipAddress: string, action: string): Promise<void> {
  const id = crypto.randomUUID();
  const now = Date.now();

  await env.DB.prepare(`
    INSERT INTO pin_rate_limits (id, ip_address, email, action, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(id, ipAddress, email, action, now).run();
}

/**
 * Generate cryptographically secure 6-digit PIN
 */
function generatePIN(): string {
  const array = new Uint8Array(3);
  crypto.getRandomValues(array);

  // Convert to 6-digit number (000000-999999)
  const num = (array[0] * 65536 + array[1] * 256 + array[2]) % 1000000;
  return num.toString().padStart(6, '0');
}

/**
 * Constant-time string comparison (prevents timing attacks)
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

// ============================================================================
// POST /api/applications/send-verification
// ============================================================================

app.post('/send-verification', async (c) => {
  const env = c.env;

  try {
    const body = await c.req.json();
    const { email, draftId } = SendVerificationSchema.parse(body);

    const ipAddress = c.req.header('CF-Connecting-IP') || 'unknown';

    // 1. Check if IP is blocked
    const ipBlock = await isIPBlocked(env, ipAddress);
    if (ipBlock.blocked) {
      const expiresIn = Math.ceil(((ipBlock.expiresAt || 0) - Date.now()) / 60000);
      return c.json({
        error: 'Too many requests. Please try again later.',
        blockedUntil: new Date(ipBlock.expiresAt || 0).toISOString(),
        expiresInMinutes: expiresIn,
      }, 429);
    }

    // 2. Check rate limit (3 per hour per email)
    const rateLimit = await checkPinSendRateLimit(env, email, ipAddress);
    if (!rateLimit.allowed) {
      return c.json({
        error: 'Too many verification requests. Please try again in 1 hour.',
        attemptsLeft: 0,
      }, 429);
    }

    // 3. Generate PIN
    const pin = generatePIN();
    const pinId = crypto.randomUUID();
    const now = Date.now();
    const expiresAt = now + (10 * 60 * 1000); // 10 minutes

    // 4. Store PIN in database
    await env.DB.prepare(`
      INSERT INTO verification_pins (
        id, email, pin, draft_id, ip_address, user_agent,
        attempts, max_attempts, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 0, 5, ?, ?)
    `).bind(
      pinId,
      email,
      pin,
      draftId || null,
      ipAddress,
      c.req.header('User-Agent') || 'unknown',
      expiresAt,
      now
    ).run();

    // 5. Log rate limit action
    await logRateLimitAction(env, email, ipAddress, 'send');

    // 6. Send email
    const emailTemplate = getEmailVerificationEmail({
      employeeName: email.split('@')[0], // Use email prefix as name
      verificationPin: pin,
      expiresInMinutes: 10,
    });

    const emailSent = await sendEmail(env, {
      to: email,
      toName: email.split('@')[0],
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
      type: 'email_verification',
    });

    if (!emailSent) {
      console.error(`[Verification] Failed to send PIN to ${email}`);
      return c.json({ error: 'Failed to send verification email' }, 500);
    }

    console.log(`[Verification] Sent PIN to ${email} (expires in 10min)`);

    return c.json({
      success: true,
      message: 'Verification code sent to your email',
      expiresInMinutes: 10,
      attemptsLeft: rateLimit.attemptsLeft! - 1,
    });

  } catch (error) {
    console.error('Send verification error:', error);
    return c.json({ error: 'Failed to send verification code' }, 500);
  }
});

// ============================================================================
// POST /api/applications/verify-pin
// ============================================================================

app.post('/verify-pin', async (c) => {
  const env = c.env;

  try {
    const body = await c.req.json();
    const { email, pin, draftId } = VerifyPinSchema.parse(body);

    const ipAddress = c.req.header('CF-Connecting-IP') || 'unknown';
    const now = Date.now();

    // 1. Check if IP is blocked
    const ipBlock = await isIPBlocked(env, ipAddress);
    if (ipBlock.blocked) {
      const expiresIn = Math.ceil(((ipBlock.expiresAt || 0) - now) / 60000);
      return c.json({
        error: 'Too many failed attempts. Please try again later.',
        blockedUntil: new Date(ipBlock.expiresAt || 0).toISOString(),
        expiresInMinutes: expiresIn,
      }, 429);
    }

    // 2. Get most recent PIN for this email
    const storedPin = await env.DB.prepare(`
      SELECT * FROM verification_pins
      WHERE email = ? AND expires_at > ? AND verified_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `).bind(email, now).first();

    if (!storedPin) {
      await logRateLimitAction(env, email, ipAddress, 'verify_failed');
      return c.json({ error: 'Invalid or expired verification code' }, 400);
    }

    // 3. Check attempts
    if ((storedPin.attempts as number) >= (storedPin.max_attempts as number)) {
      await logRateLimitAction(env, email, ipAddress, 'verify_failed');
      return c.json({
        error: 'Too many failed attempts. Please request a new code.',
        attemptsLeft: 0,
      }, 400);
    }

    // 4. Verify PIN (constant-time comparison)
    if (!timingSafeEqual(pin, storedPin.pin as string)) {
      // Increment attempts
      await env.DB.prepare(`
        UPDATE verification_pins
        SET attempts = attempts + 1
        WHERE id = ?
      `).bind(storedPin.id).run();

      await logRateLimitAction(env, email, ipAddress, 'verify_failed');

      // Check if we should block this IP (15 failed attempts in 1 hour)
      await checkFailedVerificationAttempts(env, ipAddress);

      const attemptsLeft = (storedPin.max_attempts as number) - (storedPin.attempts as number) - 1;

      return c.json({
        error: 'Invalid verification code',
        attemptsLeft: Math.max(0, attemptsLeft),
      }, 400);
    }

    // 5. PIN is correct! Mark as verified
    await env.DB.prepare(`
      UPDATE verification_pins
      SET verified_at = ?
      WHERE id = ?
    `).bind(now, storedPin.id).run();

    // 6. Mark draft as verified (if draftId exists)
    let bitrixItemId = null;

    if (draftId) {
      const draft = await env.DB.prepare(`
        SELECT * FROM incomplete_applications WHERE id = ?
      `).bind(draftId).first();

      if (draft) {
        // Mark draft as verified
        await env.DB.prepare(`
          UPDATE incomplete_applications
          SET verified = 1
          WHERE id = ?
        `).bind(draftId).run();

        // If draft has 3+ fields and no Bitrix item yet, create it NOW
        const formData = JSON.parse(draft.form_data as string);

        if (!draft.bitrix_created && shouldCreateBitrixItem(formData)) {
          const bitrixClient = new BitrixClient(env);

          try {
            const title = `${formData.firstName || 'Applicant'} ${formData.lastName || ''} - ${formData.position || 'Position TBD'}`.trim();

            const bitrixFields: Record<string, any> = {
              title,
              categoryId: 18,  // Recruitment pipeline
              stageId: 'DT1054_18:APP_INCOMPLETE',  // App Incomplete stage
              ufCrm6Source: 'Web Application Form - Verified Email',
              ufCrm6AppliedDate: new Date().toISOString(),
              ufCrm6IpAddress: ipAddress,
            };

            // Map all form fields to Bitrix24
            for (const [key, val] of Object.entries(formData)) {
              const bitrixFieldName = mapFieldToBitrix(key);
              if (bitrixFieldName && val !== null && val !== undefined) {
                bitrixFields[bitrixFieldName] = prepareValueForBitrix(key, val);
              }
            }

            const bitrixResult = await bitrixClient.createItem(bitrixFields);
            bitrixItemId = bitrixResult.id;

            // Update D1 with Bitrix ID
            await env.DB.prepare(`
              UPDATE incomplete_applications
              SET bitrix_item_id = ?, bitrix_created = 1
              WHERE id = ?
            `).bind(bitrixItemId, draftId).run();

            console.log(`[Verification] Created Bitrix24 item ${bitrixItemId} after email verification`);

          } catch (error) {
            console.error('[Verification] Failed to create Bitrix24 item:', error);
            // Non-critical - verification still succeeded
          }
        } else if (draft.bitrix_item_id) {
          bitrixItemId = draft.bitrix_item_id as number;
        }
      }
    }

    // 7. Log successful verification
    await logRateLimitAction(env, email, ipAddress, 'verify_success');

    console.log(`[Verification] Email ${email} verified successfully`);

    return c.json({
      success: true,
      message: 'Email verified successfully',
      verified: true,
      bitrixItemId,
    });

  } catch (error) {
    console.error('Verify PIN error:', error);
    return c.json({ error: 'Failed to verify code' }, 500);
  }
});

export default app;
