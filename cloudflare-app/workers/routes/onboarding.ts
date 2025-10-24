/**
 * Onboarding Portal Routes
 * Handles magic link authentication and onboarding data submission
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import { BitrixClient } from '../lib/bitrix';

export const onboardingRoutes = new Hono<{ Bindings: Env }>();

/**
 * GET /onboard/validate-token
 * Validates magic link token and returns employee data for pre-filling
 */
onboardingRoutes.get('/validate-token', async (c) => {
  try {
    const token = c.req.query('token');

    if (!token) {
      return c.json({ success: false, error: 'Token required' }, 400);
    }

    console.log(`[Onboarding] Validating token: ${token.substring(0, 8)}...`);

    // Fetch token from database
    const tokenData = await c.env.DB.prepare(`
      SELECT * FROM onboarding_tokens WHERE token = ?
    `).bind(token).first();

    if (!tokenData) {
      console.log('[Onboarding] Token not found');
      return c.json({ success: false, error: 'Invalid token' }, 404);
    }

    const now = Date.now();

    // Check if token is expired
    if (now > tokenData.expires_at) {
      console.log('[Onboarding] Token expired');
      return c.json({
        success: false,
        error: 'Token expired',
        expiredAt: new Date(tokenData.expires_at).toISOString()
      }, 410);
    }

    // Check if token was already used
    if (tokenData.used_at) {
      console.log('[Onboarding] Token already used');
      return c.json({
        success: false,
        error: 'Token already used',
        usedAt: new Date(tokenData.used_at).toISOString()
      }, 410);
    }

    // Fetch employee data from Bitrix24 for pre-filling
    const bitrix = new BitrixClient(c.env);
    const employee = await bitrix.getEmployee(tokenData.bitrix_id);

    if (!employee) {
      console.error(`[Onboarding] Employee not found in Bitrix24: ${tokenData.bitrix_id}`);
      return c.json({ success: false, error: 'Employee data not found' }, 404);
    }

    console.log(`[Onboarding] ✓ Token valid for employee ${tokenData.bitrix_id}`);

    // Helper to extract first element from array or return string
    const extractValue = (val: any): string => {
      if (Array.isArray(val)) return val[0] || '';
      return val || '';
    };

    // Construct full name from first and last name
    const fullName = `${employee.ufCrm6Name || ''} ${employee.ufCrm6LastName || ''}`.trim();

    // Return employee data for form pre-filling
    return c.json({
      success: true,
      employee: {
        bitrixId: tokenData.bitrix_id,
        name: fullName || tokenData.employee_name,
        email: tokenData.employee_email,
        // Pre-fill data from application (all editable)
        firstName: employee.ufCrm6Name || '',
        middleName: employee.ufCrm6SecondName || '',
        lastName: employee.ufCrm6LastName || '',
        phone: extractValue(employee.ufCrm6PersonalMobile),
        address: employee.ufCrm6AddressStreet || '',
        city: employee.ufCrm6AddressCity || '',
        state: employee.ufCrm6AddressState || '',
        zipCode: employee.ufCrm6AddressZip || '',
        dateOfBirth: employee.ufCrm6PersonalBirthday || '',
        position: employee.ufCrm6Position || '',
      },
      tokenExpiresAt: new Date(tokenData.expires_at).toISOString(),
    });

  } catch (error) {
    console.error('[Onboarding] Token validation error:', error);
    return c.json({
      success: false,
      error: 'Internal server error'
    }, 500);
  }
});

/**
 * POST /onboard/submit
 * Submits onboarding data, syncs to Bitrix24, and auto-assigns documents
 */
onboardingRoutes.post('/submit', async (c) => {
  try {
    const body = await c.req.json();
    const { token, data } = body;

    if (!token || !data) {
      return c.json({ success: false, error: 'Token and data required' }, 400);
    }

    console.log(`[Onboarding] Processing submission for token: ${token.substring(0, 8)}...`);

    // Validate token again
    const tokenData = await c.env.DB.prepare(`
      SELECT * FROM onboarding_tokens WHERE token = ?
    `).bind(token).first();

    if (!tokenData) {
      return c.json({ success: false, error: 'Invalid token' }, 404);
    }

    const now = Date.now();

    if (now > tokenData.expires_at) {
      return c.json({ success: false, error: 'Token expired' }, 410);
    }

    if (tokenData.used_at) {
      return c.json({ success: false, error: 'Token already used' }, 410);
    }

    // Mark token as used
    await c.env.DB.prepare(`
      UPDATE onboarding_tokens SET used_at = ? WHERE token = ?
    `).bind(now, token).run();

    // Get request metadata for audit
    const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
    const userAgent = c.req.header('user-agent') || 'unknown';

    // Store submission in database
    const submission = await c.env.DB.prepare(`
      INSERT INTO onboarding_submissions (
        token_id, bitrix_id, submission_data, ip_address, user_agent, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      RETURNING id
    `).bind(
      tokenData.id,
      tokenData.bitrix_id,
      JSON.stringify(data),
      ipAddress,
      userAgent,
      now
    ).first();

    console.log(`[Onboarding] Submission saved with ID: ${submission?.id}`);

    // Sync data to Bitrix24
    const bitrix = new BitrixClient(c.env);
    const updateSuccess = await syncOnboardingDataToBitrix(c.env, tokenData.bitrix_id, data);

    if (updateSuccess) {
      // Mark as synced
      await c.env.DB.prepare(`
        UPDATE onboarding_submissions SET synced_to_bitrix_at = ? WHERE id = ?
      `).bind(now, submission?.id).run();

      console.log(`[Onboarding] ✓ Data synced to Bitrix24 for employee ${tokenData.bitrix_id}`);
    } else {
      console.error(`[Onboarding] Failed to sync data to Bitrix24`);
    }

    // Auto-assign onboarding documents
    const documentsAssigned = await autoAssignOnboardingDocuments(c.env, tokenData.bitrix_id);

    console.log(`[Onboarding] ✓ Assigned ${documentsAssigned} documents to employee ${tokenData.bitrix_id}`);

    // Move employee to "Onboarding → In Progress" stage
    try {
      await bitrix.moveToStage(tokenData.bitrix_id, 'DT1054_10:PREPARATION'); // In Progress
      console.log(`[Onboarding] ✓ Moved employee ${tokenData.bitrix_id} to Onboarding → In Progress`);
    } catch (error) {
      console.error(`[Onboarding] Failed to move to In Progress stage:`, error);
    }

    return c.json({
      success: true,
      message: 'Onboarding data submitted successfully',
      submissionId: submission?.id,
      documentsAssigned,
    });

  } catch (error) {
    console.error('[Onboarding] Submission error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, 500);
  }
});

/**
 * Helper: Sync onboarding data to Bitrix24
 */
async function syncOnboardingDataToBitrix(env: Env, bitrixId: number, data: any): Promise<boolean> {
  try {
    const bitrix = new BitrixClient(env);

    // Map form fields to Bitrix24 fields
    const updateFields: Record<string, any> = {};

    // Personal Information
    if (data.firstName) updateFields.UF_CRM_6_FIRST_NAME = data.firstName;
    if (data.middleName) updateFields.UF_CRM_6_MIDDLE_NAME = data.middleName;
    if (data.lastName) updateFields.UF_CRM_6_LAST_NAME = data.lastName;
    if (data.dateOfBirth) updateFields.UF_CRM_6_PERSONAL_BIRTHDAY = data.dateOfBirth;
    if (data.ssn) updateFields.UF_CRM_6_SSN = data.ssn;
    if (data.gender) updateFields.UF_CRM_6_GENDER = data.gender;
    if (data.maritalStatus) updateFields.UF_CRM_6_MARITAL_STATUS = data.maritalStatus;
    if (data.citizenship) updateFields.UF_CRM_6_CITIZENSHIP = data.citizenship;

    // Contact Information
    if (data.phone) updateFields.UF_CRM_6_PERSONAL_MOBILE = [data.phone]; // Phone as array
    if (data.email) updateFields.UF_CRM_6_EMAIL = [data.email]; // Email as array

    // Address - combine line1 and line2 for street address
    const streetAddress = [data.address, data.addressLine2].filter(Boolean).join(', ');
    if (streetAddress) updateFields.UF_CRM_6_ADDRESS_STREET = streetAddress;
    if (data.city) updateFields.UF_CRM_6_ADDRESS_CITY = data.city;
    if (data.state) updateFields.UF_CRM_6_ADDRESS_STATE = data.state;
    if (data.zipCode) updateFields.UF_CRM_6_ADDRESS_ZIP = data.zipCode;

    // Emergency Contact
    if (data.emergencyContactName) updateFields.UF_CRM_6_EMERGENCY_CONTACT_NAME = data.emergencyContactName;
    if (data.emergencyContactPhone) updateFields.UF_CRM_6_EMERGENCY_CONTACT_PHONE = data.emergencyContactPhone;
    if (data.emergencyContactRelationship) updateFields.UF_CRM_6_EMERGENCY_CONTACT_RELATIONSHIP = data.emergencyContactRelationship;

    // Direct Deposit (stored as JSON)
    if (data.directDeposit) {
      updateFields.UF_CRM_6_DIRECT_DEPOSIT = JSON.stringify(data.directDeposit);
    }

    // W-4 Tax Information
    if (data.taxFilingStatus) updateFields.UF_CRM_6_TAX_FILING_STATUS = data.taxFilingStatus;
    if (data.w4Allowances) updateFields.UF_CRM_6_W4_ALLOWANCES = data.w4Allowances;
    if (data.w4AdditionalWithholding) updateFields.UF_CRM_6_W4_ADDITIONAL_WITHHOLDING = data.w4AdditionalWithholding;
    if (data.w4Exempt) updateFields.UF_CRM_6_W4_EXEMPT = data.w4Exempt ? 'Yes' : 'No';

    // Benefits
    if (data.healthInsurance) updateFields.UF_CRM_6_HEALTH_INSURANCE = data.healthInsurance;
    if (data.dentalInsurance) updateFields.UF_CRM_6_DENTAL_INSURANCE = data.dentalInsurance;
    if (data.visionInsurance) updateFields.UF_CRM_6_VISION_INSURANCE = data.visionInsurance;
    if (data.retirement401k) updateFields.UF_CRM_6_401K_ENROLLMENT = data.retirement401k;
    if (data.retirement401kPercent) updateFields.UF_CRM_6_401K_PERCENT = data.retirement401kPercent;

    // Driver Information
    if (data.driversLicenseNumber) updateFields.UF_CRM_6_DRIVERS_LICENSE_NUMBER = data.driversLicenseNumber;
    if (data.driversLicenseState) updateFields.UF_CRM_6_DRIVERS_LICENSE_STATE = data.driversLicenseState;
    if (data.driversLicenseExpiration) updateFields.UF_CRM_6_DRIVERS_LICENSE_EXPIRATION = data.driversLicenseExpiration;
    if (data.autoInsuranceProvider) updateFields.UF_CRM_6_AUTO_INSURANCE_PROVIDER = data.autoInsuranceProvider;
    if (data.autoInsurancePolicyNumber) updateFields.UF_CRM_6_AUTO_INSURANCE_POLICY = data.autoInsurancePolicyNumber;

    // Employee Handbook Acknowledgment
    if (data.handbookAcknowledged) {
      updateFields.UF_CRM_6_HANDBOOK_ACKNOWLEDGED = 'Yes';
      updateFields.UF_CRM_6_HANDBOOK_ACKNOWLEDGED_DATE = new Date().toISOString().split('T')[0];
    }

    // Update Bitrix24
    const response = await fetch(`${env.BITRIX_WEBHOOK_URL}/crm.item.update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityTypeId: 1054, // HR Center SPA
        id: bitrixId,
        fields: updateFields,
      }),
    });

    const result = await response.json();

    if (result.result) {
      console.log(`[Bitrix] Updated employee ${bitrixId} with onboarding data`);
      return true;
    } else {
      console.error('[Bitrix] Update failed:', result.error_description || result.error);
      return false;
    }
  } catch (error) {
    console.error('[Bitrix] Sync error:', error);
    return false;
  }
}

/**
 * Helper: Auto-assign onboarding documents (I-9, W-4, Drug Test, Background Check)
 */
async function autoAssignOnboardingDocuments(env: Env, bitrixId: number): Promise<number> {
  try {
    // Fetch onboarding templates from database
    const templates = await env.DB.prepare(`
      SELECT id, title, category
      FROM document_templates
      WHERE category IN ('i9', 'w4', 'drug_test', 'background_check', 'employee_handbook')
      AND is_active = 1
    `).all();

    if (!templates.results || templates.results.length === 0) {
      console.log('[Onboarding] No onboarding templates found');
      return 0;
    }

    let assignedCount = 0;
    const now = new Date().toISOString();

    for (const template of templates.results) {
      // Check if already assigned
      const existing = await env.DB.prepare(`
        SELECT id FROM document_assignments
        WHERE employee_id = ? AND template_id = ?
      `).bind(bitrixId, template.id).first();

      if (existing) {
        console.log(`[Onboarding] Template ${template.title} already assigned to ${bitrixId}`);
        continue;
      }

      // Auto-assign document
      await env.DB.prepare(`
        INSERT INTO document_assignments (
          employee_id, template_id, status, priority, assigned_at, created_at
        ) VALUES (?, ?, 'assigned', 'high', ?, ?)
      `).bind(bitrixId, template.id, now, now).run();

      assignedCount++;
      console.log(`[Onboarding] ✓ Assigned ${template.title} to employee ${bitrixId}`);
    }

    return assignedCount;
  } catch (error) {
    console.error('[Onboarding] Document assignment error:', error);
    return 0;
  }
}
