import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../types';
import { verifySession } from '../lib/auth';
import { BitrixClient } from '../lib/bitrix';
import { OpenSignClient } from '../lib/opensign';

export const adminRoutes = new Hono<{ Bindings: Env }>();

// Admin authentication middleware
adminRoutes.use('/*', async (c, next) => {
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

  await next();
});

// Field mapping: Frontend camelCase -> Bitrix ufCrm6* fields
// COMPREHENSIVE mapping for all 100+ employee fields
const FIELD_MAP: Record<string, string> = {
  // Personal Information (18 fields)
  firstName: 'ufCrm6Name',
  middleName: 'ufCrm6SecondName',
  lastName: 'ufCrm6LastName',
  preferredName: 'ufCrm6PreferredName',
  dateOfBirth: 'ufCrm6PersonalBirthday',
  gender: 'ufCrm6PersonalGender',
  maritalStatus: 'ufCrm6MaritalStatus',
  citizenship: 'ufCrm6Citizenship',
  personalEmail: 'ufCrm6Email', // Frontend uses 'personalEmail' not 'email'
  personalPhone: 'ufCrm6PersonalMobile', // Frontend uses 'personalPhone' not 'phone'
  workPhone: 'ufCrm6WorkPhone',
  officePhone: 'ufCrm6PersonalPhone',
  officeExtension: 'ufCrm6_1748054470',
  address: 'ufCrm6Address',
  addressLine1: 'ufCrm6Address', // Will be combined with other address fields
  addressLine2: 'ufCrm6Address', // Will be combined with other address fields
  city: 'ufCrm6Address', // Will be combined with other address fields
  state: 'ufCrm6Address', // Will be combined with other address fields
  zipCode: 'ufCrm6Address', // Will be combined with other address fields
  profilePhoto: 'ufCrm6ProfilePhoto',

  // Legacy aliases for backward compatibility
  email: 'ufCrm6Email',
  phone: 'ufCrm6PersonalMobile',

  // Emergency Contact (3 fields)
  emergencyContactName: 'ufCrm6EmergencyContactName',
  emergencyContactPhone: 'ufCrm6EmergencyContactPhone',
  emergencyContactRelationship: 'ufCrm6Relationship',

  // Employment Details (11 fields)
  badgeNumber: 'ufCrm6BadgeNumber',
  position: 'ufCrm6WorkPosition',
  subsidiary: 'ufCrm6Subsidiary',
  employmentStatus: 'ufCrm6EmploymentStatus',
  hireDate: 'ufCrm6EmploymentStartDate',
  employmentType: 'ufCrm6EmploymentType',
  shift: 'ufCrm6Shift',
  payRate: 'ufCrm6PayRate',
  benefitsEligible: 'ufCrm6BenefitsEligible',
  salesTerritory: 'ufCrm6Sales',
  projectCategory: 'ufCrm_6_SALES_UF_USER_LEGAL_1740423289664',
  wcCode: 'ufCrm6WcCode',

  // Compensation & Benefits (5 fields)
  ssn: 'ufCrm6Ssn',
  ptoDays: 'ufCrm6PtoDays',
  healthInsurance: 'ufCrm6HealthInsurance',
  has401k: 'ufCrm_6_401K_ENROLLMENT',
  lifeBeneficiaries: 'ufCrm6LifeBeneficiaries',

  // Tax & Payroll (5 fields)
  paymentMethod: 'ufCrm_6_UF_USR_1737120507262',
  taxFilingStatus: 'ufCrm6TaxFilingStatus',
  w4Exemptions: 'ufCrm_6_W4_EXEMPTIONS',
  additionalFedWithhold: 'ufCrm6AdditionalFedWithhold',
  additionalStateWithhold: 'ufCrm6AdditionalStateWithhold',

  // Banking & Direct Deposit (5 fields)
  bankName: 'ufCrm6BankName',
  bankAccountName: 'ufCrm6BankAccountName',
  bankAccountType: 'ufCrm6BankAccountType',
  bankRouting: 'ufCrm6BankRouting',
  bankAccountNumber: 'ufCrm6BankAccountNumber',

  // Dependents (4 fields)
  dependentNames: 'ufCrm6DependentNames',
  dependentSsns: 'ufCrm6DependentSsns',
  dependentRelationships: 'ufCrm6DependentRelationships',
  dependentsInfo: 'ufCrm6DependentsInfo',

  // Education & Skills (7 fields)
  educationLevel: 'ufCrm6EducationLevel',
  schoolName: 'ufCrm6SchoolName',
  graduationYear: 'ufCrm6GraduationYear',
  fieldsOfStudy: 'ufCrm6FieldOfStudy', // Frontend uses plural 'fieldsOfStudy'
  fieldOfStudy: 'ufCrm6FieldOfStudy', // Legacy alias
  skills: 'ufCrm6Skills',
  certifications: 'ufCrm6Certifications',
  skillsLevel: 'ufCrm6SkillsLevel',

  // Training & Compliance (6 fields)
  requiredTrainingStatus: 'ufCrm6RequiredTraining',
  safetyTrainingStatus: 'ufCrm6SafetyTraining',
  complianceTrainingStatus: 'ufCrm6ComplianceTraining',
  trainingDate: 'ufCrm6TrainingDate',
  nextTrainingDue: 'ufCrm6NextTrainingDue',
  trainingNotes: 'ufCrm6TrainingNotes',

  // IT & Equipment (11 fields)
  softwareExperience: 'ufCrm6SoftwareExperience',
  equipmentAssigned: 'ufCrm6EquipmentAssigned',
  equipmentStatus: 'ufCrm6EquipmentStatus',
  equipmentReturn: 'ufCrm6EquipmentReturn',
  softwareAccess: 'ufCrm6SoftwareAccess',
  accessPermissions: 'ufCrm6AccessPermissions',
  accessLevel: 'ufCrm6AccessLevel',
  securityClearance: 'ufCrm6SecurityClearance',
  networkStatus: 'ufCrm6NetworkStatus',
  vpnAccess: 'ufCrm6VpnAccess',
  remoteAccess: 'ufCrm6RemoteAccess',

  // Vehicle & Licensing (2 fields)
  driversLicenseExpiry: 'ufCrm_6_UF_USR_1747966315398_EXPIRY',
  autoInsuranceExpiry: 'ufCrm_6_UF_USR_1737120327618_EXPIRY',

  // Work Authorization (1 field)
  visaExpiry: 'ufCrm6VisaExpiry',

  // Performance & Reviews (3 fields)
  reviewDates: 'ufCrm6ReviewDate',
  terminationDate: 'ufCrm6TerminationDate',
  rehireEligible: 'ufCrm6RehireEligible',

  // Additional Information (1 field)
  additionalInfo: 'ufCrm6AdditionalInfo',
};

// Sensitive fields that should be redacted in audit logs
const SENSITIVE_FIELDS = [
  'ufCrm6Ssn',
  'ufCrm6Salary',
  'ufCrm6BankRouting',
  'ufCrm6BankAccountNumber',
  'ufCrm6DependentSsns'
];

// Validation schema for employee updates
// COMPREHENSIVE schema matching frontend - all fields optional for PATCH updates
const EmployeeUpdateSchema = z.object({
  // Personal Information (18 fields)
  firstName: z.string().min(1).max(100).optional(),
  middleName: z.string().max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  preferredName: z.string().max(100).optional(),
  dateOfBirth: z.string().regex(/^(\d{4}-\d{2}-\d{2}|)$/).optional(),
  gender: z.string().optional(),
  maritalStatus: z.string().optional(),
  citizenship: z.string().optional(),
  personalEmail: z.array(z.string().email()).optional(), // Frontend uses 'personalEmail'
  personalPhone: z.array(z.string().regex(/^\+?[\d\s\-\(\)]+$/)).optional(), // Frontend uses 'personalPhone'
  workPhone: z.string().optional(),
  officePhone: z.string().optional(),
  officeExtension: z.string().optional(),
  address: z.string().max(500).optional(),
  addressLine1: z.string().max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(2).optional(),
  zipCode: z.string().max(10).optional(),
  profilePhoto: z.string().optional(),

  // Legacy aliases for backward compatibility
  email: z.array(z.string().email()).optional(),
  phone: z.array(z.string().regex(/^\+?[\d\s\-\(\)]+$/)).optional(),

  // Emergency Contact (3 fields)
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),

  // Employment Details (11 fields)
  badgeNumber: z.string().min(1).optional(),
  position: z.string().min(1).max(200).optional(),
  subsidiary: z.string().max(200).optional(),
  employmentStatus: z.enum(['Y', 'N']).optional(),
  hireDate: z.string().regex(/^(\d{4}-\d{2}-\d{2}|)$/).optional(),
  employmentType: z.string().max(100).optional(),
  shift: z.string().max(100).optional(),
  payRate: z.string().optional(),
  benefitsEligible: z.boolean().optional(),
  salesTerritory: z.string().optional(),
  projectCategory: z.string().optional(),
  wcCode: z.number().optional(),

  // Compensation & Benefits (5 fields)
  ssn: z.string().regex(/^(\d{3}-\d{2}-\d{4}|)$/, 'SSN must be in format XXX-XX-XXXX').optional(),
  ptoDays: z.string().max(10).optional(),
  healthInsurance: z.union([z.string(), z.number().int()]).optional(), // Accept both for flexibility
  has401k: z.union([z.string(), z.number().int()]).optional(),
  lifeBeneficiaries: z.string().optional(),

  // Tax & Payroll (5 fields)
  paymentMethod: z.string().optional(),
  taxFilingStatus: z.string().optional(),
  w4Exemptions: z.string().optional(),
  additionalFedWithhold: z.string().optional(),
  additionalStateWithhold: z.string().optional(),

  // Banking & Direct Deposit (5 fields)
  bankName: z.string().optional(),
  bankAccountName: z.string().optional(),
  bankAccountType: z.string().optional(),
  bankRouting: z.string().optional(),
  bankAccountNumber: z.string().optional(),

  // Dependents (4 fields)
  dependentNames: z.array(z.string()).optional(),
  dependentSsns: z.array(z.string()).optional(),
  dependentRelationships: z.array(z.string()).optional(),
  dependentsInfo: z.array(z.string()).optional(),

  // Education & Skills (7 fields)
  educationLevel: z.string().max(100).optional(),
  schoolName: z.string().max(200).optional(),
  graduationYear: z.string().regex(/^(\d{4}|)$/).optional(),
  fieldsOfStudy: z.array(z.string()).optional(), // Frontend uses plural
  fieldOfStudy: z.union([z.string().max(200), z.array(z.string())]).optional(), // Legacy alias
  skills: z.union([z.string().max(1000), z.array(z.string())]).optional(), // Accept string or array
  certifications: z.union([z.string().max(1000), z.array(z.string())]).optional(),
  skillsLevel: z.string().optional(),

  // Training & Compliance (6 fields)
  requiredTrainingStatus: z.string().optional(),
  safetyTrainingStatus: z.string().optional(),
  complianceTrainingStatus: z.string().optional(),
  trainingDate: z.string().optional(),
  nextTrainingDue: z.string().optional(),
  trainingNotes: z.string().optional(),

  // IT & Equipment (11 fields)
  softwareExperience: z.union([z.string().max(1000), z.array(z.string())]).optional(),
  equipmentAssigned: z.array(z.string()).optional(),
  equipmentStatus: z.string().optional(),
  equipmentReturn: z.string().optional(),
  softwareAccess: z.array(z.string()).optional(),
  accessPermissions: z.array(z.string()).optional(),
  accessLevel: z.string().optional(),
  securityClearance: z.string().optional(),
  networkStatus: z.string().optional(),
  vpnAccess: z.boolean().optional(),
  remoteAccess: z.boolean().optional(),

  // Vehicle & Licensing (2 fields)
  driversLicenseExpiry: z.string().optional(),
  autoInsuranceExpiry: z.string().optional(),

  // Work Authorization (1 field)
  visaExpiry: z.string().optional(),

  // Performance & Reviews (3 fields)
  reviewDates: z.array(z.string()).optional(),
  terminationDate: z.string().optional(),
  rehireEligible: z.boolean().optional(),

  // Additional Information (1 field)
  additionalInfo: z.string().max(5000).optional(),
}).passthrough(); // Allow extra fields not in schema (they'll be filtered by FIELD_MAP)

// Admin endpoints (placeholder for future)
adminRoutes.get('/stats', async (c) => {
  return c.json({ message: 'Admin stats endpoint' });
});

// Get all employees
adminRoutes.get('/employees', async (c) => {
  const env = c.env;

  try {
    // Get from employee_cache table (fast)
    const cachedEmployees = await env.DB.prepare(`
      SELECT
        badge_number,
        full_name,
        position,
        bitrix_id,
        json_extract(data, '$.ufCrm6Email[0]') as email,
        json_extract(data, '$.ufCrm6PersonalMobile[0]') as phone,
        json_extract(data, '$.ufCrm6WorkPosition') as work_position,
        json_extract(data, '$.ufCrm6EmploymentStatus') as employment_status,
        json_extract(data, '$.ufCrm6EmploymentStartDate') as hire_date,
        last_sync
      FROM employee_cache
      ORDER BY full_name ASC
    `).all();

    const employees = cachedEmployees.results.map((emp: any) => ({
      id: emp.bitrix_id,
      badgeNumber: emp.badge_number,
      name: emp.full_name,
      position: emp.work_position || emp.position,
      email: emp.email,
      phone: emp.phone,
      employmentStatus: emp.employment_status === 'Y' ? 'Active' : 'Inactive',
      hireDate: emp.hire_date,
      lastUpdated: emp.last_sync
    }));

    return c.json({ employees });

  } catch (error) {
    console.error('Error fetching employees:', error);
    return c.json({ error: 'Failed to fetch employees', details: (error as Error).message }, 500);
  }
});

// Refresh employees from Bitrix24
adminRoutes.post('/employees/refresh', async (c) => {
  const env = c.env;

  try {
    // Fetch all employees from Bitrix24 (this will update the cache)
    const bitrix = new BitrixClient(env);
    const bitrixEmployees = await bitrix.listEmployees();

    return c.json({
      success: true,
      count: bitrixEmployees.length,
      message: `Successfully refreshed ${bitrixEmployees.length} employees`
    });

  } catch (error) {
    console.error('Error refreshing employees:', error);
    return c.json({ error: 'Failed to refresh employees', details: (error as Error).message }, 500);
  }
});

// Get full employee details by Bitrix ID
adminRoutes.get('/employee/:bitrixId', async (c) => {
  const env = c.env;
  const bitrixId = parseInt(c.req.param('bitrixId'));

  if (isNaN(bitrixId)) {
    return c.json({ error: 'Invalid employee ID' }, 400);
  }

  try {
    const bitrix = new BitrixClient(env);
    const employee = await bitrix.getEmployee(bitrixId);

    if (!employee) {
      return c.json({ error: 'Employee not found' }, 404);
    }

    // Return full Bitrix employee data
    return c.json({ employee });

  } catch (error) {
    console.error('Error fetching employee details:', error);
    return c.json({ error: 'Failed to fetch employee details', details: (error as Error).message }, 500);
  }
});

// Update employee details in Bitrix
adminRoutes.put('/employee/:bitrixId', async (c) => {
  const env = c.env;
  const bitrixId = parseInt(c.req.param('bitrixId'));

  if (isNaN(bitrixId)) {
    return c.json({ error: 'Invalid employee ID' }, 400);
  }

  try {
    const body = await c.req.json();
    const { updates } = body;

    if (!updates || typeof updates !== 'object') {
      return c.json({ error: 'Missing or invalid updates object' }, 400);
    }

    // Validate that badge number and ID are not being changed
    if (updates.id || updates.ufCrm6BadgeNumber) {
      return c.json({ error: 'Cannot modify employee ID or badge number' }, 400);
    }

    // Get session to track who made the update
    let sessionId = c.req.header('Cookie')
      ?.split('; ')
      .find(row => row.startsWith('session='))
      ?.split('=')[1];

    let updatedBy: string | null = null;
    if (sessionId) {
      const session = await env.DB.prepare('SELECT full_name FROM sessions s JOIN employee_cache ec ON s.employee_id = ec.bitrix_id WHERE s.id = ?').bind(sessionId).first();
      if (session) {
        updatedBy = session.full_name as string;
      }
    }

    // Update employee in Bitrix24
    const bitrix = new BitrixClient(env);
    const updatedEmployee = await bitrix.updateEmployee(bitrixId, updates);

    if (!updatedEmployee) {
      return c.json({ error: 'Failed to update employee in Bitrix24' }, 500);
    }

    // Log the update in audit log
    await env.DB.prepare(`
      INSERT INTO audit_logs (
        employee_id, bitrix_id, action, status, metadata, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      bitrixId,
      bitrixId,
      'employee_update',
      'success',
      JSON.stringify({
        updatedBy,
        updatedFields: Object.keys(updates),
        timestamp: new Date().toISOString()
      }),
      new Date().toISOString()
    ).run();

    return c.json({
      success: true,
      message: 'Employee updated successfully',
      employee: updatedEmployee
    });

  } catch (error) {
    console.error('Error updating employee:', error);

    // Log the failed update
    try {
      await env.DB.prepare(`
        INSERT INTO audit_logs (
          employee_id, bitrix_id, action, status, metadata, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        bitrixId,
        bitrixId,
        'employee_update',
        'failure',
        JSON.stringify({
          error: (error as Error).message,
          timestamp: new Date().toISOString()
        }),
        new Date().toISOString()
      ).run();
    } catch (auditError) {
      console.error('Failed to log audit entry:', auditError);
    }

    return c.json({ error: 'Failed to update employee', details: (error as Error).message }, 500);
  }
});

// PATCH employee (NEW - proper REST endpoint with validation and diff tracking)
adminRoutes.patch('/employee/:bitrixId', async (c) => {
  const env = c.env;
  const bitrixId = parseInt(c.req.param('bitrixId'));

  if (isNaN(bitrixId)) {
    return c.json({ error: 'Invalid employee ID' }, 400);
  }

  try {
    const body = await c.req.json();
    console.log(`[PATCH /employee/${bitrixId}] Request body:`, JSON.stringify(body, null, 2));

    // Validate with Zod
    const validation = EmployeeUpdateSchema.safeParse(body);
    if (!validation.success) {
      console.error(`[PATCH /employee/${bitrixId}] Validation failed:`, JSON.stringify(validation.error.errors, null, 2));
      return c.json({
        error: 'Validation failed',
        details: validation.error.errors
      }, 400);
    }

    const validatedData = validation.data;

    // Map frontend field names to Bitrix field names
    const bitrixFields: Record<string, any> = {};
    const unmappedFields: string[] = [];
    for (const [key, value] of Object.entries(validatedData)) {
      const bitrixKey = FIELD_MAP[key];
      if (bitrixKey) {
        // Only map known fields to Bitrix format
        bitrixFields[bitrixKey] = value;
      } else {
        // Track unmapped fields for debugging
        unmappedFields.push(key);
      }
    }

    // Combine separate address fields into single address if provided
    if (validatedData.addressLine1 || validatedData.city || validatedData.state || validatedData.zipCode) {
      const addressParts: string[] = [];

      if (validatedData.addressLine1) {
        addressParts.push(validatedData.addressLine1);
      }
      if (validatedData.addressLine2) {
        addressParts.push(validatedData.addressLine2);
      }
      if (validatedData.city || validatedData.state || validatedData.zipCode) {
        const cityStateZip = [
          validatedData.city,
          validatedData.state,
          validatedData.zipCode
        ].filter(Boolean).join(' ');

        if (cityStateZip) {
          addressParts.push(cityStateZip);
        }
      }

      // Combine with commas
      const fullAddress = addressParts.join(', ');
      if (fullAddress) {
        bitrixFields['ufCrm6Address'] = fullAddress;
      }
    }

    // Log unmapped fields for debugging
    if (unmappedFields.length > 0) {
      console.log(`[PATCH /employee/${bitrixId}] Unmapped fields (will be ignored):`, unmappedFields);
    }
    console.log(`[PATCH /employee/${bitrixId}] Mapped fields to send to Bitrix:`, Object.keys(bitrixFields));

    // Fetch current employee data for diff tracking
    const bitrix = new BitrixClient(env);
    const currentEmployee = await bitrix.getEmployee(bitrixId);

    if (!currentEmployee) {
      return c.json({ error: 'Employee not found' }, 404);
    }

    // Build diff with before/after values
    const diff: Record<string, { before: any; after: any }> = {};
    for (const [field, newValue] of Object.entries(bitrixFields)) {
      const oldValue = (currentEmployee as any)[field];

      // Only track actual changes
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        // Redact sensitive fields
        if (SENSITIVE_FIELDS.includes(field)) {
          diff[field] = {
            before: oldValue ? '[REDACTED]' : null,
            after: newValue ? '[REDACTED]' : null
          };
        } else {
          diff[field] = { before: oldValue, after: newValue };
        }
      }
    }

    // If no changes, return early
    if (Object.keys(diff).length === 0) {
      return c.json({
        success: true,
        message: 'No changes to update',
        employee: currentEmployee
      });
    }

    // Get session to track who made the update
    let sessionId = c.req.header('Cookie')
      ?.split('; ')
      .find(row => row.startsWith('session='))
      ?.split('=')[1];

    let updatedBy: string | null = null;
    if (sessionId) {
      const session = await env.DB.prepare(
        'SELECT full_name FROM sessions s JOIN employee_cache ec ON s.employee_id = ec.bitrix_id WHERE s.id = ?'
      ).bind(sessionId).first();
      if (session) {
        updatedBy = session.full_name as string;
      }
    }

    // Update employee in Bitrix24 with enhanced error logging
    console.log(`[PATCH /employee/${bitrixId}] About to call bitrix.updateEmployee with fields:`, JSON.stringify(bitrixFields, null, 2));

    let updatedEmployee;
    try {
      updatedEmployee = await bitrix.updateEmployee(bitrixId, bitrixFields);
      console.log(`[PATCH /employee/${bitrixId}] Bitrix update successful`);
    } catch (bitrixError: any) {
      // Log detailed Bitrix error
      console.error(`[PATCH /employee/${bitrixId}] Bitrix24 API Error:`, {
        message: bitrixError.message,
        stack: bitrixError.stack,
        name: bitrixError.name,
        cause: bitrixError.cause,
        // Log the entire error object in case it has custom properties
        fullError: JSON.stringify(bitrixError, Object.getOwnPropertyNames(bitrixError), 2)
      });

      // Return detailed error to frontend
      return c.json({
        error: 'Bitrix24 API rejected the update',
        details: bitrixError.message || 'Unknown Bitrix error',
        bitrixError: {
          message: bitrixError.message,
          type: bitrixError.name,
          // Include any additional error properties that might exist
          ...bitrixError
        },
        sentFields: Object.keys(bitrixFields),
        sentPayload: bitrixFields // Include full payload for debugging (remove in production)
      }, 500);
    }

    if (!updatedEmployee) {
      console.error(`[PATCH /employee/${bitrixId}] Bitrix updateEmployee returned null/undefined`);
      return c.json({ error: 'Failed to update employee in Bitrix24 - no data returned' }, 500);
    }

    // Log the update with full diff in audit log
    await env.DB.prepare(`
      INSERT INTO audit_logs (
        employee_id, bitrix_id, action, status, metadata, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      bitrixId,
      bitrixId,
      'employee_update',
      'success',
      JSON.stringify({
        updatedBy,
        changeCount: Object.keys(diff).length,
        changes: diff,
        timestamp: new Date().toISOString()
      }),
      new Date().toISOString()
    ).run();

    return c.json({
      success: true,
      message: `Successfully updated ${Object.keys(diff).length} field(s)`,
      employee: updatedEmployee
    });

  } catch (error) {
    console.error('Error updating employee:', error);

    // Log the failed update
    try {
      await env.DB.prepare(`
        INSERT INTO audit_logs (
          employee_id, bitrix_id, action, status, metadata, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        bitrixId,
        bitrixId,
        'employee_update',
        'failure',
        JSON.stringify({
          error: (error as Error).message,
          timestamp: new Date().toISOString()
        }),
        new Date().toISOString()
      ).run();
    } catch (auditError) {
      console.error('Failed to log audit entry:', auditError);
    }

    return c.json({ error: 'Failed to update employee', details: (error as Error).message }, 500);
  }
});

// ========== TEMPLATES ENDPOINTS ==========

// Get all templates
adminRoutes.get('/templates', async (c) => {
  const env = c.env;

  try {
    const { searchParams } = new URL(c.req.url);
    const category = searchParams.get('category');
    const activeOnly = searchParams.get('active_only') === 'true';

    let query = `
      SELECT
        id,
        title,
        description,
        category,
        template_url,
        file_name,
        file_size,
        requires_signature,
        field_positions,
        is_active,
        created_by,
        created_at,
        updated_at
      FROM document_templates
      WHERE 1=1
    `;
    const params: any[] = [];

    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (activeOnly) {
      query += ' AND is_active = 1';
    }

    query += ' ORDER BY created_at DESC';

    const stmt = params.length > 0
      ? env.DB.prepare(query).bind(...params)
      : env.DB.prepare(query);

    const result = await stmt.all();

    const templates = result.results.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      templateUrl: row.template_url,
      fileName: row.file_name,
      fileSize: row.file_size,
      requiresSignature: row.requires_signature === 1,
      fieldPositions: row.field_positions,
      isActive: row.is_active === 1,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return c.json({ templates });

  } catch (error) {
    console.error('Error fetching templates:', error);
    return c.json({ error: 'Failed to fetch templates', details: (error as Error).message }, 500);
  }
});

// Upload new template
adminRoutes.post('/templates', async (c) => {
  const env = c.env;

  try {
    const formData = await c.req.formData();

    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string || '';
    const category = formData.get('category') as string;
    const requiresSignature = formData.get('requiresSignature') === 'true';

    if (!file || !title || !category) {
      return c.json({ error: 'Missing required fields: file, title, category' }, 400);
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: 'Invalid file type. Only PDF, DOC, and DOCX are allowed.' }, 400);
    }

    // Validate file size (max 25MB)
    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      return c.json({ error: 'File too large. Maximum size is 25MB.' }, 400);
    }

    // Generate unique ID and R2 key
    const templateId = crypto.randomUUID();
    const r2Key = `templates/${templateId}/${file.name}`;

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer();
    await env.DOCUMENTS.put(r2Key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type
      },
      customMetadata: {
        templateId,
        title,
        category
      }
    });

    // Get session to determine created_by
    let sessionId = c.req.header('Cookie')
      ?.split('; ')
      .find(row => row.startsWith('session='))
      ?.split('=')[1];

    let createdBy: number | null = null;
    if (sessionId) {
      const session = await env.DB.prepare('SELECT employee_id FROM sessions WHERE id = ?').bind(sessionId).first();
      if (session) {
        createdBy = session.employee_id as number;
      }
    }

    // Insert into database
    const now = new Date().toISOString();
    await env.DB.prepare(`
      INSERT INTO document_templates (
        id, title, description, category, template_url, file_name, file_size,
        requires_signature, is_active, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      templateId,
      title,
      description,
      category,
      r2Key,
      file.name,
      file.size,
      requiresSignature ? 1 : 0,
      1, // is_active
      createdBy,
      now,
      now
    ).run();

    return c.json({
      success: true,
      template: {
        id: templateId,
        title,
        description,
        category,
        templateUrl: r2Key,
        fileName: file.name,
        fileSize: file.size,
        requiresSignature,
        isActive: true,
        createdBy,
        createdAt: now,
        updatedAt: now
      }
    }, 201);

  } catch (error) {
    console.error('Error uploading template:', error);
    return c.json({ error: 'Failed to upload template', details: (error as Error).message }, 500);
  }
});

// Get template file (download/preview)
adminRoutes.get('/templates/:id/download', async (c) => {
  const env = c.env;
  const templateId = c.req.param('id');

  try {
    // Get template info
    const template = await env.DB.prepare('SELECT template_url, file_name FROM document_templates WHERE id = ?')
      .bind(templateId)
      .first();

    if (!template) {
      return c.json({ error: 'Template not found' }, 404);
    }

    // Get file from R2
    const object = await env.DOCUMENTS.get(template.template_url as string);

    if (!object) {
      return c.json({ error: 'File not found in storage' }, 404);
    }

    // Return file with appropriate headers
    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
    headers.set('Content-Disposition', `inline; filename="${template.file_name}"`);

    return new Response(object.body, { headers });

  } catch (error) {
    console.error('Error downloading template:', error);
    return c.json({ error: 'Failed to download template', details: (error as Error).message }, 500);
  }
});

// Delete template
adminRoutes.delete('/templates/:id', async (c) => {
  const env = c.env;
  const templateId = c.req.param('id');

  try {
    // Get template info
    const template = await env.DB.prepare('SELECT template_url FROM document_templates WHERE id = ?')
      .bind(templateId)
      .first();

    if (!template) {
      return c.json({ error: 'Template not found' }, 404);
    }

    // Delete from R2
    await env.DOCUMENTS.delete(template.template_url as string);

    // Delete from database
    await env.DB.prepare('DELETE FROM document_templates WHERE id = ?')
      .bind(templateId)
      .run();

    // Also delete any assignments
    await env.DB.prepare('DELETE FROM document_assignments WHERE template_id = ?')
      .bind(templateId)
      .run();

    return c.json({ success: true, message: 'Template deleted successfully' });

  } catch (error) {
    console.error('Error deleting template:', error);
    return c.json({ error: 'Failed to delete template', details: (error as Error).message }, 500);
  }
});

// Update template field positions
adminRoutes.put('/templates/:id/fields', async (c) => {
  const env = c.env;
  const templateId = c.req.param('id');

  try {
    const body = await c.req.json();
    const { fieldPositions } = body;

    if (!fieldPositions || !Array.isArray(fieldPositions)) {
      return c.json({ error: 'Invalid field positions data' }, 400);
    }

    // Verify template exists
    const template = await env.DB.prepare('SELECT id FROM document_templates WHERE id = ?')
      .bind(templateId)
      .first();

    if (!template) {
      return c.json({ error: 'Template not found' }, 404);
    }

    // Store field positions as JSON
    await env.DB.prepare(`
      UPDATE document_templates
      SET field_positions = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(JSON.stringify(fieldPositions), templateId).run();

    return c.json({
      success: true,
      message: 'Field positions saved successfully'
    });

  } catch (error) {
    console.error('Error updating template fields:', error);
    return c.json({ error: 'Failed to update field positions', details: (error as Error).message }, 500);
  }
});

// ========== ASSIGNMENTS ENDPOINTS ==========

// Get all assignments
adminRoutes.get('/assignments', async (c) => {
  const env = c.env;

  try {
    const { searchParams } = new URL(c.req.url);
    const status = searchParams.get('status');
    const employeeId = searchParams.get('employee_id');

    let query = `
      SELECT
        da.id,
        da.template_id,
        da.employee_id,
        da.bitrix_id,
        da.signature_request_id,
        da.status,
        da.priority,
        da.due_date,
        da.assigned_at,
        da.assigned_by,
        da.signed_at,
        da.notes,
        dt.title as template_title,
        dt.category as template_category,
        dt.requires_signature,
        ec.full_name as employee_name,
        ec.email as employee_email,
        ec.badge_number as employee_badge
      FROM document_assignments da
      LEFT JOIN document_templates dt ON da.template_id = dt.id
      LEFT JOIN employee_cache ec ON da.bitrix_id = ec.bitrix_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      query += ' AND da.status = ?';
      params.push(status);
    }

    if (employeeId) {
      query += ' AND da.employee_id = ?';
      params.push(parseInt(employeeId));
    }

    query += ' ORDER BY da.assigned_at DESC';

    const stmt = params.length > 0
      ? env.DB.prepare(query).bind(...params)
      : env.DB.prepare(query);

    const result = await stmt.all();

    const assignments = result.results.map((row: any) => ({
      id: row.id,
      templateId: row.template_id,
      employeeId: row.employee_id,
      bitrixId: row.bitrix_id,
      signatureRequestId: row.signature_request_id,
      status: row.status,
      priority: row.priority,
      dueDate: row.due_date,
      assignedAt: row.assigned_at,
      assignedBy: row.assigned_by,
      signedAt: row.signed_at,
      notes: row.notes,
      template: {
        title: row.template_title,
        category: row.template_category,
        requiresSignature: row.requires_signature === 1
      },
      employee: {
        name: row.employee_name,
        email: row.employee_email,
        badgeNumber: row.employee_badge
      }
    }));

    return c.json({ assignments });

  } catch (error) {
    console.error('Error fetching assignments:', error);
    return c.json({ error: 'Failed to fetch assignments', details: (error as Error).message }, 500);
  }
});

// Create new assignment
adminRoutes.post('/assignments', async (c) => {
  const env = c.env;

  try {
    const body = await c.req.json();
    const { templateId, employeeIds, priority = 'medium', dueDate, notes } = body;

    if (!templateId || !employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return c.json({ error: 'Missing required fields: templateId, employeeIds' }, 400);
    }

    // Get template info
    const template = await env.DB.prepare(`
      SELECT id, title, template_url, file_name, requires_signature, field_positions
      FROM document_templates
      WHERE id = ?
    `).bind(templateId).first();

    if (!template) {
      return c.json({ error: 'Template not found' }, 404);
    }

    // Get session to determine assigned_by
    let sessionId = c.req.header('Cookie')
      ?.split('; ')
      .find(row => row.startsWith('session='))
      ?.split('=')[1];

    let assignedBy: number | null = null;
    if (sessionId) {
      const session = await env.DB.prepare('SELECT employee_id FROM sessions WHERE id = ?').bind(sessionId).first();
      if (session) {
        assignedBy = session.employee_id as number;
      }
    }

    const createdAssignments = [];

    // Create assignment for each employee
    for (const employeeId of employeeIds) {
      // Get employee details from cache
      const employee = await env.DB.prepare(`
        SELECT bitrix_id, full_name, email, badge_number
        FROM employee_cache
        WHERE bitrix_id = ?
      `).bind(employeeId).first();

      if (!employee) {
        console.warn(`Employee ${employeeId} not found, skipping`);
        continue;
      }

      const now = new Date().toISOString();
      let signatureRequestId: string | null = null;

      // If template requires signature, create OpenSign request
      if (template.requires_signature === 1) {
        try {
          const opensign = new OpenSignClient(env);

          // Get PDF from R2
          const r2Object = await env.DOCUMENTS.get(template.template_url as string);
          if (!r2Object) {
            throw new Error('Template file not found in storage');
          }

          const pdfBuffer = await r2Object.arrayBuffer();

          // Parse field positions if available
          let fieldPositions = null;
          if (template.field_positions) {
            try {
              fieldPositions = JSON.parse(template.field_positions as string);
            } catch (e) {
              console.warn('Failed to parse field positions:', e);
            }
          }

          // Create signature request
          const signatureRequest = await opensign.createSignatureRequestFromPDF({
            pdfBuffer,
            fileName: template.file_name as string,
            documentTitle: template.title as string,
            signerEmail: employee.email as string,
            signerName: employee.full_name as string,
            fieldPositions,
            metadata: {
              employeeId: employee.bitrix_id,
              badgeNumber: employee.badge_number,
              templateId: template.id
            }
          });

          signatureRequestId = signatureRequest.id;

          // Update status to 'sent' since OpenSign sends email automatically
          await env.DB.prepare(`
            INSERT INTO document_assignments (
              template_id, employee_id, bitrix_id, signature_request_id,
              status, priority, due_date, assigned_at, assigned_by, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            templateId,
            employee.bitrix_id,
            employee.bitrix_id,
            signatureRequestId,
            'sent',
            priority,
            dueDate || null,
            now,
            assignedBy,
            notes || null
          ).run();

        } catch (opensignError) {
          console.error('OpenSign error:', opensignError);
          // Fall back to 'assigned' status if OpenSign fails
          await env.DB.prepare(`
            INSERT INTO document_assignments (
              template_id, employee_id, bitrix_id, signature_request_id,
              status, priority, due_date, assigned_at, assigned_by, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            templateId,
            employee.bitrix_id,
            employee.bitrix_id,
            null,
            'assigned',
            priority,
            dueDate || null,
            now,
            assignedBy,
            `${notes || ''}\nOpenSign error: ${(opensignError as Error).message}`.trim()
          ).run();
        }
      } else {
        // No signature required, just create assignment
        await env.DB.prepare(`
          INSERT INTO document_assignments (
            template_id, employee_id, bitrix_id, signature_request_id,
            status, priority, due_date, assigned_at, assigned_by, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          templateId,
          employee.bitrix_id,
          employee.bitrix_id,
          null,
          'assigned',
          priority,
          dueDate || null,
          now,
          assignedBy,
          notes || null
        ).run();
      }

      createdAssignments.push({
        employeeId: employee.bitrix_id,
        employeeName: employee.full_name,
        status: template.requires_signature === 1 && signatureRequestId ? 'sent' : 'assigned'
      });
    }

    return c.json({
      success: true,
      message: `Created ${createdAssignments.length} assignment(s)`,
      assignments: createdAssignments
    }, 201);

  } catch (error) {
    console.error('Error creating assignments:', error);
    return c.json({ error: 'Failed to create assignments', details: (error as Error).message }, 500);
  }
});

// Delete assignment (cancel)
adminRoutes.delete('/assignments/:id', async (c) => {
  const env = c.env;
  const assignmentId = c.req.param('id');

  try {
    // Get assignment info
    const assignment = await env.DB.prepare(`
      SELECT id, signature_request_id, status
      FROM document_assignments
      WHERE id = ?
    `).bind(assignmentId).first();

    if (!assignment) {
      return c.json({ error: 'Assignment not found' }, 404);
    }

    // If there's a signature request and it's still pending, try to cancel it
    if (assignment.signature_request_id && assignment.status !== 'signed') {
      try {
        const opensign = new OpenSignClient(env);
        await opensign.cancelSignatureRequest(assignment.signature_request_id as string);
      } catch (opensignError) {
        console.error('Failed to cancel OpenSign request:', opensignError);
        // Continue with deletion even if cancellation fails
      }
    }

    // Delete assignment
    await env.DB.prepare('DELETE FROM document_assignments WHERE id = ?')
      .bind(assignmentId)
      .run();

    return c.json({ success: true, message: 'Assignment deleted successfully' });

  } catch (error) {
    console.error('Error deleting assignment:', error);
    return c.json({ error: 'Failed to delete assignment', details: (error as Error).message }, 500);
  }
});

// Get all Bitrix field definitions for HR Center SPA
adminRoutes.get('/bitrix/fields', async (c) => {
  const env = c.env;

  try {
    const bitrix = new BitrixClient(env);
    const fields = await bitrix.getFieldDefinitions();

    // Format the fields into a more readable list
    const fieldList = Object.entries(fields).map(([fieldName, fieldDef]: [string, any]) => ({
      name: fieldName,
      title: fieldDef.title || fieldName,
      type: fieldDef.type || 'unknown',
      isRequired: fieldDef.isRequired || false,
      isReadOnly: fieldDef.isReadOnly || false,
      isMultiple: fieldDef.isMultiple || false,
      settings: fieldDef.settings || null,
    }));

    return c.json({
      success: true,
      entityTypeId: env.BITRIX24_ENTITY_TYPE_ID,
      totalFields: fieldList.length,
      fields: fieldList
    });

  } catch (error) {
    console.error('Error fetching Bitrix fields:', error);
    return c.json({ error: 'Failed to fetch field definitions', details: (error as Error).message }, 500);
  }
});
