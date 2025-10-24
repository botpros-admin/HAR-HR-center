import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../types';
import { verifySession } from '../lib/auth';
import { BitrixClient } from '../lib/bitrix';
import { sendEmail, getAssignmentCreatedEmail } from '../lib/email';
import { resolveTemplateWorkflow } from '../lib/workflow-resolver';

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

  // Attach session to context for later use
  c.set('session', session);

  await next();
});

// Super admin middleware helper
async function requireSuperAdmin(c: any, next: any) {
  const env = c.env;
  const session = c.get('session');

  // Check if user is super admin
  const adminRecord = await env.DB.prepare(`
    SELECT is_super_admin FROM hr_admins WHERE bitrix_id = ? AND is_active = 1
  `).bind(session.bitrixId).first();

  if (!adminRecord || !adminRecord.is_super_admin) {
    return c.json({ error: 'Forbidden - Super admin access required' }, 403);
  }

  await next();
}

// ========== ADMIN MANAGEMENT ENDPOINTS ==========

// Get all admins
adminRoutes.get('/admins', async (c) => {
  const env = c.env;

  try {
    // Fetch all active admins with employee details
    const result = await env.DB.prepare(`
      SELECT
        ha.id,
        ha.bitrix_id,
        ha.employee_name,
        ha.employee_email,
        ha.is_super_admin,
        ha.is_active,
        ha.promoted_by,
        ha.promoted_at,
        ha.notes,
        ec.full_name,
        ec.email,
        ec.badge_number,
        ec.position
      FROM hr_admins ha
      LEFT JOIN employee_cache ec ON ha.bitrix_id = ec.bitrix_id
      WHERE ha.is_active = 1
      ORDER BY ha.is_super_admin DESC, ha.promoted_at ASC
    `).all();

    const admins = result.results.map((row: any) => ({
      id: row.id,
      bitrixId: row.bitrix_id,
      employeeName: row.full_name || row.employee_name,
      employeeEmail: row.email || row.employee_email,
      badgeNumber: row.badge_number,
      position: row.position,
      isSuperAdmin: row.is_super_admin === 1,
      isActive: row.is_active === 1,
      promotedBy: row.promoted_by,
      promotedAt: row.promoted_at,
      notes: row.notes
    }));

    return c.json({ admins });

  } catch (error) {
    console.error('Error fetching admins:', error);
    return c.json({ error: 'Failed to fetch admins', details: (error as Error).message }, 500);
  }
});

// Promote employee to admin (super admin only)
adminRoutes.post('/admins', requireSuperAdmin, async (c) => {
  const env = c.env;
  const session = c.get('session');

  try {
    const body = await c.req.json();
    const { bitrixId, notes } = body;

    if (!bitrixId) {
      return c.json({ error: 'Missing required field: bitrixId' }, 400);
    }

    // Fetch employee details
    const employee = await env.DB.prepare(`
      SELECT bitrix_id, full_name, email
      FROM employee_cache
      WHERE bitrix_id = ?
    `).bind(bitrixId).first();

    if (!employee) {
      return c.json({ error: 'Employee not found' }, 404);
    }

    // Check if already an admin
    const existingAdmin = await env.DB.prepare(`
      SELECT id, is_active FROM hr_admins WHERE bitrix_id = ?
    `).bind(bitrixId).first();

    if (existingAdmin && existingAdmin.is_active) {
      return c.json({ error: 'Employee is already an admin' }, 400);
    }

    const now = new Date().toISOString();

    // If was previously an admin (deactivated), reactivate
    if (existingAdmin) {
      await env.DB.prepare(`
        UPDATE hr_admins
        SET is_active = 1, promoted_by = ?, promoted_at = ?, notes = ?, updated_at = ?
        WHERE bitrix_id = ?
      `).bind(session.bitrixId, now, notes || null, now, bitrixId).run();
    } else {
      // Create new admin record
      await env.DB.prepare(`
        INSERT INTO hr_admins (
          bitrix_id, employee_name, employee_email, is_super_admin,
          is_active, promoted_by, promoted_at, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        bitrixId,
        employee.full_name,
        employee.email,
        0, // Not super admin
        1, // Active
        session.bitrixId,
        now,
        notes || null,
        now,
        now
      ).run();
    }

    // Log activity
    await env.DB.prepare(`
      INSERT INTO admin_activity_log (
        admin_bitrix_id, action, target_bitrix_id, resource_type,
        metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      session.bitrixId,
      'promoted_admin',
      bitrixId,
      'admin',
      JSON.stringify({
        promotedEmployeeName: employee.full_name,
        notes: notes || null
      }),
      now
    ).run();

    return c.json({
      success: true,
      message: `Successfully promoted ${employee.full_name} to admin`,
      admin: {
        bitrixId,
        employeeName: employee.full_name,
        employeeEmail: employee.email,
        isSuperAdmin: false,
        isActive: true,
        promotedBy: session.bitrixId,
        promotedAt: now
      }
    }, 201);

  } catch (error) {
    console.error('Error promoting admin:', error);
    return c.json({ error: 'Failed to promote admin', details: (error as Error).message }, 500);
  }
});

// Remove admin (super admin only)
adminRoutes.delete('/admins/:bitrixId', requireSuperAdmin, async (c) => {
  const env = c.env;
  const session = c.get('session');
  const bitrixId = parseInt(c.req.param('bitrixId'));

  if (isNaN(bitrixId)) {
    return c.json({ error: 'Invalid admin ID' }, 400);
  }

  try {
    // Check if admin exists
    const adminRecord = await env.DB.prepare(`
      SELECT id, bitrix_id, employee_name, is_super_admin, is_active
      FROM hr_admins
      WHERE bitrix_id = ?
    `).bind(bitrixId).first();

    if (!adminRecord) {
      return c.json({ error: 'Admin not found' }, 404);
    }

    if (!adminRecord.is_active) {
      return c.json({ error: 'Admin is already inactive' }, 400);
    }

    // Prevent removing super admin
    if (adminRecord.is_super_admin) {
      return c.json({ error: 'Cannot remove super admin' }, 403);
    }

    // Prevent removing self
    if (bitrixId === session.bitrixId) {
      return c.json({ error: 'Cannot remove yourself' }, 400);
    }

    const now = new Date().toISOString();

    // Soft delete (set is_active = 0)
    await env.DB.prepare(`
      UPDATE hr_admins
      SET is_active = 0, deactivated_at = ?, deactivated_by = ?, updated_at = ?
      WHERE bitrix_id = ?
    `).bind(now, session.bitrixId, now, bitrixId).run();

    // Log activity
    await env.DB.prepare(`
      INSERT INTO admin_activity_log (
        admin_bitrix_id, action, target_bitrix_id, resource_type,
        metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      session.bitrixId,
      'removed_admin',
      bitrixId,
      'admin',
      JSON.stringify({
        removedEmployeeName: adminRecord.employee_name
      }),
      now
    ).run();

    return c.json({
      success: true,
      message: `Successfully removed ${adminRecord.employee_name} as admin`
    });

  } catch (error) {
    console.error('Error removing admin:', error);
    return c.json({ error: 'Failed to remove admin', details: (error as Error).message }, 500);
  }
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

  // File Fields (22 fields) - VERIFIED against Bitrix24 API
  profilePhoto: 'ufCrm6ProfilePhoto',
  workVisa: 'ufCrm6WorkVisa',
  w4File: 'ufCrm_6_UF_W4_FILE', // CORRECTED: Multiple file field
  i9File: 'ufCrm_6_UF_I9_FILE', // CORRECTED: Multiple file field
  multipleJobsWorksheet: 'ufCrm6MultipleJobsWorksheet',
  deductionsWorksheet: 'ufCrm6DeductionsWorksheet',
  directDeposit: 'ufCrm6DirectDeposit',
  healthInsurance: 'ufCrm6HealthInsurance',
  has401k: 'ufCrm_6_401K_ENROLLMENT',
  trainingComplete: 'ufCrm6TrainingComplete',
  professionalCertifications: 'ufCrm6Certifications', // NOTE: Different from field name
  trainingRecords: 'ufCrm6TrainingRecords',
  skillsAssessment: 'ufCrm6SkillsAssessment',
  trainingDocs: 'ufCrm6TrainingDocs',
  driversLicense: 'ufCrm_6_UF_USR_1747966315398', // CORRECTED: Underscores not camelCase
  autoInsurance: 'ufCrm_6_UF_USR_1737120327618', // CORRECTED: Underscores not camelCase
  hiringPaperwork: 'ufCrm6HiringPaperwork',
  handbookAck: 'ufCrm6HandbookAck',
  backgroundCheck: 'ufCrm6BackgroundCheck',
  drugTest: 'ufCrm6DrugTest',
  nda: 'ufCrm6Nda',
  noncompete: 'ufCrm6Noncompete',
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
  profilePhoto: z.any().optional().nullable(),

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

  // Tax & Payroll (8 fields - including file fields)
  paymentMethod: z.string().optional(),
  taxFilingStatus: z.string().optional(),
  w4Exemptions: z.string().optional(),
  additionalFedWithhold: z.string().optional(),
  additionalStateWithhold: z.string().optional(),
  w4File: z.union([z.array(z.any()), z.any()]).optional().nullable(),
  i9File: z.union([z.array(z.any()), z.any()]).optional().nullable(),
  multipleJobsWorksheet: z.any().optional().nullable(),
  deductionsWorksheet: z.any().optional().nullable(),

  // Banking & Direct Deposit (6 fields - including file field)
  bankName: z.string().optional(),
  bankAccountName: z.string().optional(),
  bankAccountType: z.string().optional(),
  bankRouting: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  directDeposit: z.any().optional().nullable(),

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

  // Training & Compliance (11 fields - including file fields)
  requiredTrainingStatus: z.string().optional(),
  safetyTrainingStatus: z.string().optional(),
  complianceTrainingStatus: z.string().optional(),
  trainingDate: z.string().optional(),
  nextTrainingDue: z.string().optional(),
  trainingNotes: z.string().optional(),
  trainingComplete: z.union([z.array(z.any()), z.any()]).optional().nullable(),
  professionalCertifications: z.any().optional().nullable(),
  trainingRecords: z.union([z.array(z.any()), z.any()]).optional().nullable(),
  skillsAssessment: z.any().optional().nullable(),
  trainingDocs: z.union([z.array(z.any()), z.any()]).optional().nullable(),

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

  // Vehicle & Licensing (4 fields - including file fields)
  driversLicense: z.any().optional().nullable(),
  driversLicenseExpiry: z.string().optional(),
  autoInsurance: z.any().optional().nullable(),
  autoInsuranceExpiry: z.string().optional(),

  // Work Authorization (2 fields - including file field)
  workVisa: z.any().optional().nullable(),
  visaExpiry: z.string().optional(),

  // Performance & Reviews (3 fields)
  reviewDates: z.array(z.string()).optional(),
  terminationDate: z.string().optional(),
  rehireEligible: z.boolean().optional(),

  // Onboarding & Compliance (6 file fields)
  hiringPaperwork: z.union([z.array(z.any()), z.any()]).optional().nullable(),
  handbookAck: z.any().optional().nullable(),
  backgroundCheck: z.any().optional().nullable(),
  drugTest: z.union([z.array(z.any()), z.any()]).optional().nullable(),
  nda: z.any().optional().nullable(),
  noncompete: z.any().optional().nullable(),

  // Additional Information (1 field)
  additionalInfo: z.string().max(5000).optional(),
}).passthrough(); // Allow extra fields not in schema (they'll be filtered by FIELD_MAP)

// Subsidiary (Division) ID to name mapping
// Source: UF_CRM_6_SUBSIDIARY field definition
const SUBSIDIARY_MAP: Record<string, string> = {
  '2012': 'Construction',
  '2013': 'Painting',
  '2014': 'Windows & Doors',
};

// Helper to convert subsidiary ID to name
function getSubsidiaryName(id: any): string {
  if (!id) return 'N/A';
  const idStr = String(id);
  return SUBSIDIARY_MAP[idStr] || `Division ${idStr}`;
}

// ========== DASHBOARD STATS ENDPOINTS ==========

// Get dashboard statistics
adminRoutes.get('/stats', async (c) => {
  const env = c.env;

  try {
    // Get total templates and active templates
    const templatesResult = await env.DB.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active
      FROM document_templates
    `).first();

    const totalTemplates = templatesResult?.total || 0;
    const activeTemplates = templatesResult?.active || 0;

    // Get pending signatures (status = 'assigned')
    const pendingResult = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM document_assignments
      WHERE status = 'assigned'
    `).first();

    const pendingSignatures = pendingResult?.count || 0;

    // Get completed today (status = 'signed' AND signed_at >= today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const completedTodayResult = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM document_assignments
      WHERE status = 'signed'
        AND signed_at >= ?
    `).bind(todayISO).first();

    const completedToday = completedTodayResult?.count || 0;

    // Get overdue assignments (due_date < now AND status != 'signed')
    const now = new Date().toISOString();
    const overdueResult = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM document_assignments
      WHERE status != 'signed'
        AND due_date IS NOT NULL
        AND due_date < ?
    `).bind(now).first();

    const overdueAssignments = overdueResult?.count || 0;

    // Get total employees
    const employeesResult = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM employee_cache
    `).first();

    const totalEmployees = employeesResult?.count || 0;

    return c.json({
      stats: {
        totalTemplates,
        activeTemplates,
        pendingSignatures,
        completedToday,
        overdueAssignments,
        totalEmployees
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return c.json({ error: 'Failed to fetch dashboard stats', details: (error as Error).message }, 500);
  }
});

// Get recent activity from audit logs
adminRoutes.get('/recent-activity', async (c) => {
  const env = c.env;

  try {
    const { searchParams } = new URL(c.req.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get recent audit logs with employee names
    const result = await env.DB.prepare(`
      SELECT
        al.id,
        al.employee_id,
        al.bitrix_id,
        al.action,
        al.status,
        al.metadata,
        al.timestamp,
        ec.full_name as employee_name,
        ec.badge_number as employee_badge
      FROM audit_logs al
      LEFT JOIN employee_cache ec ON al.bitrix_id = ec.bitrix_id
      ORDER BY al.timestamp DESC
      LIMIT ?
    `).bind(limit).all();

    const activities = result.results.map((row: any) => {
      // Parse metadata JSON if it exists
      let metadata = null;
      try {
        if (row.metadata) {
          metadata = JSON.parse(row.metadata);
        }
      } catch (e) {
        console.warn('Failed to parse audit log metadata:', e);
      }

      // Build human-readable message
      let message = '';
      let type: 'success' | 'error' | 'info' = 'info';

      switch (row.action) {
        case 'employee_update':
          if (row.status === 'success') {
            const changedFields = metadata?.changeCount || 0;
            message = `${row.employee_name || 'Employee'} was updated (${changedFields} field${changedFields !== 1 ? 's' : ''})`;
            type = 'success';
          } else {
            message = `Failed to update ${row.employee_name || 'employee'}`;
            type = 'error';
          }
          break;

        case 'document_signed':
          message = `${row.employee_name || 'Employee'} signed a document`;
          type = 'success';
          break;

        case 'document_assigned':
          message = `Document assigned to ${row.employee_name || 'employee'}`;
          type = 'info';
          break;

        case 'template_created':
          message = `New document template created`;
          type = 'success';
          break;

        case 'template_deleted':
          message = `Document template deleted`;
          type = 'info';
          break;

        default:
          message = `${row.action.replace(/_/g, ' ')}`;
          type = row.status === 'success' ? 'success' : row.status === 'failure' ? 'error' : 'info';
      }

      return {
        id: row.id,
        employeeId: row.employee_id,
        bitrixId: row.bitrix_id,
        employeeName: row.employee_name,
        employeeBadge: row.employee_badge,
        action: row.action,
        status: row.status,
        message,
        type,
        metadata,
        timestamp: row.timestamp
      };
    });

    return c.json({ activities });

  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return c.json({ error: 'Failed to fetch recent activity', details: (error as Error).message }, 500);
  }
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
        json_extract(data, '$.ufCrm6Subsidiary') as subsidiary,
        json_extract(data, '$.ufCrm6EmploymentStatus') as employment_status,
        json_extract(data, '$.ufCrm6EmploymentStartDate') as hire_date,
        json_extract(data, '$.ufCrm6ProfilePhoto') as profile_photo,
        last_sync
      FROM employee_cache
      ORDER BY full_name ASC
    `).all();

    const employees = cachedEmployees.results.map((emp: any) => {
      // Parse profilePhoto if it's a JSON string
      let profilePhoto = emp.profile_photo;
      if (typeof profilePhoto === 'string' && profilePhoto.startsWith('{')) {
        try {
          profilePhoto = JSON.parse(profilePhoto);
        } catch (e) {
          // If parse fails, keep as-is
        }
      }

      return {
        id: emp.bitrix_id,
        badgeNumber: emp.badge_number,
        name: emp.full_name,
        position: emp.work_position || emp.position,
        subsidiary: getSubsidiaryName(emp.subsidiary),
        email: emp.email,
        phone: emp.phone,
        employmentStatus: emp.employment_status === 'Y' ? 'Active' : 'Inactive',
        hireDate: emp.hire_date,
        profilePhoto,
        lastUpdated: emp.last_sync
      };
    });

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
        default_signer_config,
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
      defaultSignerConfig: row.default_signer_config,
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
    const defaultSignerConfig = formData.get('defaultSignerConfig') as string || null;

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
        requires_signature, default_signer_config, is_active, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      templateId,
      title,
      description,
      category,
      r2Key,
      file.name,
      file.size,
      requiresSignature ? 1 : 0,
      defaultSignerConfig,
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
        defaultSignerConfig,
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

// Update template metadata
adminRoutes.patch('/templates/:id', async (c) => {
  const env = c.env;
  const templateId = c.req.param('id');

  try {
    const body = await c.req.json();
    const { title, description, category, requiresSignature, defaultSignerConfig } = body;

    // Verify template exists
    const template = await env.DB.prepare('SELECT id, title FROM document_templates WHERE id = ?')
      .bind(templateId)
      .first();

    if (!template) {
      return c.json({ error: 'Template not found' }, 404);
    }

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const params: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      params.push(category);
    }
    if (requiresSignature !== undefined) {
      updates.push('requires_signature = ?');
      params.push(requiresSignature ? 1 : 0);
    }
    if (defaultSignerConfig !== undefined) {
      updates.push('default_signer_config = ?');
      params.push(defaultSignerConfig);
    }

    // Always update updated_at
    updates.push('updated_at = ?');
    params.push(new Date().toISOString());

    // Add templateId for WHERE clause
    params.push(templateId);

    // Execute update
    await env.DB.prepare(`
      UPDATE document_templates
      SET ${updates.join(', ')}
      WHERE id = ?
    `).bind(...params).run();

    // Fetch updated template
    const updatedTemplate = await env.DB.prepare(`
      SELECT
        id, title, description, category, template_url, file_name, file_size,
        requires_signature, field_positions, default_signer_config, is_active,
        created_by, created_at, updated_at
      FROM document_templates
      WHERE id = ?
    `).bind(templateId).first();

    return c.json({
      success: true,
      message: 'Template updated successfully',
      template: {
        id: updatedTemplate?.id,
        title: updatedTemplate?.title,
        description: updatedTemplate?.description,
        category: updatedTemplate?.category,
        templateUrl: updatedTemplate?.template_url,
        fileName: updatedTemplate?.file_name,
        fileSize: updatedTemplate?.file_size,
        requiresSignature: updatedTemplate?.requires_signature === 1,
        fieldPositions: updatedTemplate?.field_positions,
        defaultSignerConfig: updatedTemplate?.default_signer_config,
        isActive: updatedTemplate?.is_active === 1,
        createdBy: updatedTemplate?.created_by,
        createdAt: updatedTemplate?.created_at,
        updatedAt: updatedTemplate?.updated_at
      }
    });

  } catch (error) {
    console.error('Error updating template:', error);
    return c.json({ error: 'Failed to update template', details: (error as Error).message }, 500);
  }
});

// Delete template
adminRoutes.delete('/templates/:id', async (c) => {
  const env = c.env;
  const templateId = c.req.param('id');

  try {
    // Get template info
    const template = await env.DB.prepare('SELECT template_url, title FROM document_templates WHERE id = ?')
      .bind(templateId)
      .first();

    if (!template) {
      return c.json({ error: 'Template not found' }, 404);
    }

    // Check for active assignments
    const activeAssignments = await env.DB.prepare(`
      SELECT
        da.id,
        da.status,
        da.due_date,
        ec.full_name as employee_name,
        ec.badge_number,
        ec.email
      FROM document_assignments da
      LEFT JOIN employee_cache ec ON da.bitrix_id = ec.bitrix_id
      WHERE da.template_id = ?
        AND da.status IN ('assigned', 'sent')
      ORDER BY da.due_date ASC NULLS LAST
    `).bind(templateId).all();

    // If there are active assignments, prevent deletion
    if (activeAssignments.results.length > 0) {
      const assignmentDetails = activeAssignments.results.map((a: any) => ({
        employeeName: a.employee_name || 'Unknown',
        badgeNumber: a.badge_number,
        email: a.email,
        status: a.status,
        dueDate: a.due_date
      }));

      return c.json({
        error: 'Cannot delete template with active assignments',
        message: `This template has ${activeAssignments.results.length} active assignment(s). You must cancel all assignments before deleting the template.`,
        canDelete: false,
        activeAssignments: assignmentDetails,
        totalActiveAssignments: activeAssignments.results.length
      }, 400);
    }

    // Check for completed assignments (informational)
    const completedAssignments = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM document_assignments
      WHERE template_id = ?
        AND status = 'signed'
    `).bind(templateId).first();

    const completedCount = completedAssignments?.count || 0;

    // Delete from R2
    await env.DOCUMENTS.delete(template.template_url as string);

    // Delete from database
    await env.DB.prepare('DELETE FROM document_templates WHERE id = ?')
      .bind(templateId)
      .run();

    // Delete completed/expired assignments (safe to delete)
    await env.DB.prepare(`
      DELETE FROM document_assignments
      WHERE template_id = ?
        AND status IN ('signed', 'declined', 'expired')
    `).bind(templateId).run();

    return c.json({
      success: true,
      message: `Template "${template.title}" deleted successfully`,
      deletedCompletedAssignments: completedCount
    });

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

// Create new assignment (V2: Template-level workflow configuration)
adminRoutes.post('/assignments', async (c) => {
  const env = c.env;

  try {
    const body = await c.req.json();
    const { templateId, employeeIds, priority = 'medium', dueDate, notes } = body;

    // Validate required fields
    if (!templateId || !employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return c.json({ error: 'Missing required fields: templateId, employeeIds' }, 400);
    }

    // Fetch template with workflow configuration
    const template = await env.DB.prepare(`
      SELECT id, title, template_url, file_name, requires_signature,
             field_positions, default_signer_config
      FROM document_templates
      WHERE id = ?
    `).bind(templateId).first();

    if (!template) {
      return c.json({ error: 'Template not found' }, 404);
    }

    // Get session to determine assigned_by
    const session = c.get('session');
    const assignedBy = session?.bitrixId || null;

    // Parse workflow configuration
    let workflowConfig = null;
    if (template.default_signer_config) {
      try {
        workflowConfig = JSON.parse(template.default_signer_config as string);
      } catch (error) {
        console.error('Failed to parse default_signer_config:', error);
        return c.json({ error: 'Invalid template workflow configuration' }, 500);
      }
    }

    const now = new Date().toISOString();

    // SINGLE-SIGNER MODE: No workflow config or mode === 'single_signer'
    if (!workflowConfig || workflowConfig.mode === 'single_signer') {
      console.log(`[Assignment] Creating ${employeeIds.length} single-signer assignment(s)`);

      const createdAssignments = [];

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

        // Create assignment
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

        // Send email notification
        if (employee.email) {
          try {
            const emailTemplate = getAssignmentCreatedEmail({
              employeeName: employee.full_name as string,
              documentTitle: template.title as string,
              dueDate: dueDate || null,
              assignmentUrl: 'https://app.hartzell.work/dashboard/documents'
            });

            await sendEmail(env, {
              to: employee.email as string,
              toName: employee.full_name as string,
              subject: emailTemplate.subject,
              html: emailTemplate.html,
              text: emailTemplate.text,
              type: 'assignment_created',
              employeeId: employee.bitrix_id as number
            });

            console.log(`[Assignment] Email sent to ${employee.email}`);
          } catch (emailError) {
            console.error(`[Assignment] Failed to send email:`, emailError);
          }
        }

        createdAssignments.push({
          employeeId: employee.bitrix_id,
          employeeName: employee.full_name,
          status: 'assigned'
        });
      }

      return c.json({
        success: true,
        message: `Created ${createdAssignments.length} assignment(s)`,
        assignments: createdAssignments
      }, 201);
    }

    // MULTI-SIGNER MODE: Resolve workflow for each employee
    console.log(`[Assignment] Creating multi-signer assignments for ${employeeIds.length} employee(s)`);

    // Use workflow resolver to expand template workflow
    const resolvedAssignments = await resolveTemplateWorkflow(workflowConfig, {
      assigneeIds: employeeIds,
      creatingAdminId: assignedBy || 0,
      env
    });

    const createdAssignments = [];

    for (const resolved of resolvedAssignments) {
      // Get employee details
      const employee = await env.DB.prepare(`
        SELECT bitrix_id, full_name, email, badge_number
        FROM employee_cache
        WHERE bitrix_id = ?
      `).bind(resolved.assigneeId).first();

      if (!employee) {
        console.warn(`Employee ${resolved.assigneeId} not found, skipping`);
        continue;
      }

      // Create document_assignments record
      const assignmentResult = await env.DB.prepare(`
        INSERT INTO document_assignments (
          template_id, employee_id, bitrix_id, signature_request_id,
          status, priority, due_date, assigned_at, assigned_by, notes,
          is_multi_signer, signing_workflow, current_signer_step
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        templateId,
        resolved.assigneeId,
        resolved.assigneeId,
        null,
        'assigned',
        priority,
        dueDate || null,
        now,
        assignedBy,
        notes || null,
        1, // is_multi_signer
        JSON.stringify({ signers: resolved.signers, sequential: true, createdAt: now }),
        1 // current_signer_step
      ).run();

      const assignmentId = assignmentResult.meta.last_row_id;

      // Create document_signers records
      for (const signer of resolved.signers) {
        await env.DB.prepare(`
          INSERT INTO document_signers (
            assignment_id, employee_id, bitrix_id, employee_name, employee_email,
            signing_order, role_name, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          assignmentId,
          signer.bitrixId,
          signer.bitrixId,
          signer.employeeName,
          signer.employeeEmail || null,
          signer.order,
          signer.roleName,
          signer.order === 1 ? 'pending' : 'pending',
          now,
          now
        ).run();
      }

      // Send email to first signer
      const firstSigner = resolved.signers[0];
      if (firstSigner && firstSigner.employeeEmail) {
        try {
          const emailTemplate = getAssignmentCreatedEmail({
            employeeName: firstSigner.employeeName,
            documentTitle: template.title as string,
            dueDate: dueDate || null,
            assignmentUrl: 'https://app.hartzell.work/dashboard/documents'
          });

          await sendEmail(env, {
            to: firstSigner.employeeEmail,
            toName: firstSigner.employeeName,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
            text: emailTemplate.text,
            type: 'assignment_created',
            employeeId: firstSigner.bitrixId
          });

          console.log(`[Assignment] Email sent to first signer: ${firstSigner.employeeEmail}`);
        } catch (emailError) {
          console.error(`[Assignment] Failed to send email to first signer:`, emailError);
        }
      }

      createdAssignments.push({
        assignmentId,
        employeeId: resolved.assigneeId,
        employeeName: employee.full_name,
        isMultiSigner: true,
        totalSigners: resolved.signers.length,
        signers: resolved.signers.map(s => ({
          bitrixId: s.bitrixId,
          employeeName: s.employeeName,
          order: s.order,
          roleName: s.roleName
        }))
      });
    }

    return c.json({
      success: true,
      message: `Created ${createdAssignments.length} multi-signer assignment(s)`,
      assignments: createdAssignments
    }, 201);

  } catch (error) {
    console.error('Error creating assignments:', error);
    return c.json({ error: 'Failed to create assignments', details: (error as Error).message }, 500);
  }
});

// Get assignment signers (for multi-signer assignments)
adminRoutes.get('/assignments/:id/signers', async (c) => {
  const env = c.env;
  const assignmentId = c.req.param('id');

  try {
    // Get assignment info
    const assignment = await env.DB.prepare(`
      SELECT
        da.id,
        da.template_id,
        da.is_multi_signer,
        da.signing_workflow,
        da.current_signer_step,
        da.status as assignment_status,
        da.priority,
        da.due_date,
        dt.title as document_title
      FROM document_assignments da
      LEFT JOIN document_templates dt ON da.template_id = dt.id
      WHERE da.id = ?
    `).bind(assignmentId).first();

    if (!assignment) {
      return c.json({ error: 'Assignment not found' }, 404);
    }

    // If not multi-signer, return empty signers array
    if (!assignment.is_multi_signer) {
      return c.json({
        assignment: {
          id: assignment.id,
          templateId: assignment.template_id,
          documentTitle: assignment.document_title,
          isMultiSigner: false,
          status: assignment.assignment_status
        },
        signers: []
      });
    }

    // Get signers for multi-signer assignment
    const signersResult = await env.DB.prepare(`
      SELECT
        id,
        employee_id,
        bitrix_id,
        employee_name,
        employee_email,
        signing_order,
        role_name,
        status,
        signed_at,
        signature_url,
        decline_reason,
        notified_at,
        created_at
      FROM document_signers
      WHERE assignment_id = ?
      ORDER BY signing_order ASC
    `).bind(assignmentId).all();

    const signers = signersResult.results.map((row: any) => ({
      id: row.id,
      bitrixId: row.bitrix_id,
      employeeName: row.employee_name,
      employeeEmail: row.employee_email,
      signingOrder: row.signing_order,
      roleName: row.role_name,
      status: row.status,
      signedAt: row.signed_at,
      signatureUrl: row.signature_url,
      declineReason: row.decline_reason,
      notifiedAt: row.notified_at
    }));

    return c.json({
      assignment: {
        id: assignment.id,
        templateId: assignment.template_id,
        documentTitle: assignment.document_title,
        isMultiSigner: true,
        currentSignerStep: assignment.current_signer_step,
        status: assignment.assignment_status,
        priority: assignment.priority,
        dueDate: assignment.due_date
      },
      signers,
      totalSigners: signers.length,
      signedCount: signers.filter((s: any) => s.status === 'signed').length,
      pendingCount: signers.filter((s: any) => s.status === 'pending').length
    });

  } catch (error) {
    console.error('Error fetching assignment signers:', error);
    return c.json({ error: 'Failed to fetch assignment signers', details: (error as Error).message }, 500);
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

    // Delete assignment
    // (Signature request cancellation handled by native signature system if needed)
    await env.DB.prepare('DELETE FROM document_assignments WHERE id = ?')
      .bind(assignmentId)
      .run();

    return c.json({ success: true, message: 'Assignment deleted successfully' });

  } catch (error) {
    console.error('Error deleting assignment:', error);
    return c.json({ error: 'Failed to delete assignment', details: (error as Error).message }, 500);
  }
});

// DEBUG: Get raw employee data to inspect file field format
adminRoutes.get('/debug/employee/:bitrixId', async (c) => {
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

    // Return raw employee data with specific focus on file fields
    return c.json({
      success: true,
      profilePhotoField: (employee as any).ufCrm6ProfilePhoto,
      allFileFields: {
        profilePhoto: (employee as any).ufCrm6ProfilePhoto,
        w4File: (employee as any).ufCrm6UfW4File,
        i9File: (employee as any).ufCrm6UfI9File,
      },
      fullEmployee: employee
    });

  } catch (error) {
    console.error('Error fetching employee:', error);
    return c.json({ error: 'Failed to fetch employee', details: (error as Error).message }, 500);
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

// Download file from Bitrix24 by employee ID and field name
adminRoutes.get('/employee/:bitrixId/file/:fieldName', async (c) => {
  const env = c.env;
  const bitrixId = parseInt(c.req.param('bitrixId'));
  const frontendFieldName = c.req.param('fieldName');

  if (isNaN(bitrixId)) {
    return c.json({ error: 'Invalid employee ID' }, 400);
  }

  // Map frontend field name to Bitrix field name
  const bitrixFieldName = FIELD_MAP[frontendFieldName];
  if (!bitrixFieldName) {
    return c.json({ error: `Unknown field: ${frontendFieldName}` }, 400);
  }

  try {
    // Fetch employee from Bitrix24
    const bitrix = new BitrixClient(env);
    const employee = await bitrix.getEmployee(bitrixId);

    if (!employee) {
      return c.json({ error: 'Employee not found' }, 404);
    }

    // Get file field value using the Bitrix field name
    const fileValue = (employee as any)[bitrixFieldName];

    console.log(`[File Download] Field: ${frontendFieldName} (${bitrixFieldName})`);
    console.log(`[File Download] FileValue type: ${typeof fileValue}`);
    console.log(`[File Download] FileValue:`, JSON.stringify(fileValue, null, 2));

    if (!fileValue) {
      return c.json({ error: 'File not found' }, 404);
    }

    // Handle different file field formats
    let downloadUrl: string | null = null;
    let fileName = 'file';

    // If fileValue is an object (Bitrix24 file format)
    if (typeof fileValue === 'object' && !Array.isArray(fileValue)) {
      // Prefer urlMachine (REST API with auth token) over url
      downloadUrl = fileValue.urlMachine || fileValue.url || fileValue.showUrl || null;
      fileName = fileValue.name || `${frontendFieldName}.pdf`;
    }
    // If fileValue is an array (multiple files)
    else if (Array.isArray(fileValue) && fileValue.length > 0) {
      const firstFile = fileValue[0];
      downloadUrl = firstFile.urlMachine || firstFile.url || firstFile.showUrl || null;
      fileName = firstFile.name || `${frontendFieldName}.pdf`;
    }
    // If fileValue is just a number (file ID) - legacy format
    else if (typeof fileValue === 'number' || typeof fileValue === 'string') {
      // Try to get file URL using Bitrix24 webhook
      const fileId = String(fileValue);
      // Construct download URL using Bitrix24's file download endpoint
      downloadUrl = `${env.BITRIX24_WEBHOOK_URL.replace(/\/$/, '')}/disk.file.get?id=${fileId}`;
      fileName = `${frontendFieldName}.pdf`;
    }

    if (!downloadUrl) {
      return c.json({
        error: 'Unable to determine file download URL',
        debug: {
          field: frontendFieldName,
          bitrixField: bitrixFieldName,
          valueType: typeof fileValue,
          isArray: Array.isArray(fileValue),
          value: fileValue,
          hasShowUrl: typeof fileValue === 'object' && 'showUrl' in fileValue,
          hasUrl: typeof fileValue === 'object' && 'url' in fileValue,
          hasDownloadUrl: typeof fileValue === 'object' && 'downloadUrl' in fileValue,
          keys: typeof fileValue === 'object' ? Object.keys(fileValue) : null
        }
      }, 500);
    }

    // Fetch file from Bitrix24
    const fileResponse = await fetch(downloadUrl);

    if (!fileResponse.ok) {
      console.error(`Failed to fetch file from Bitrix24: ${fileResponse.statusText}`);
      return c.json({ error: 'Failed to fetch file from Bitrix24' }, 500);
    }

    // Get content type from response or default to application/octet-stream
    const contentType = fileResponse.headers.get('Content-Type') || 'application/octet-stream';

    // Stream file back to client
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Disposition', `inline; filename="${fileName}"`);

    return new Response(fileResponse.body, { headers });

  } catch (error) {
    console.error('Error downloading file:', error);
    return c.json({ error: 'Failed to download file', details: (error as Error).message }, 500);
  }
});

// Upload file to employee record
adminRoutes.post('/employee/:bitrixId/file/:fieldName', async (c) => {
  const env = c.env;
  const bitrixId = parseInt(c.req.param('bitrixId'));
  const frontendFieldName = c.req.param('fieldName');
  const isMultiple = c.req.query('multiple') === 'true'; // Check if this is a multiple file field

  if (isNaN(bitrixId)) {
    return c.json({ error: 'Invalid employee ID' }, 400);
  }

  // Map frontend field name to Bitrix field name
  const bitrixFieldName = FIELD_MAP[frontendFieldName];
  if (!bitrixFieldName) {
    return c.json({ error: `Unknown field: ${frontendFieldName}` }, 400);
  }

  try {
    // Parse multipart form data
    const formData = await c.req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    // Validate file size (max 25MB)
    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      return c.json({ error: 'File too large. Maximum size is 25MB.' }, 400);
    }

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Upload to Bitrix24
    const bitrix = new BitrixClient(env);
    let updatedEmployee;

    if (isMultiple) {
      // Add to array (for multiple file fields)
      updatedEmployee = await bitrix.addFileToEmployee(bitrixId, file.name, arrayBuffer, bitrixFieldName);
    } else {
      // Replace existing (for single file fields)
      updatedEmployee = await bitrix.uploadFileToEmployee(bitrixId, file.name, arrayBuffer, bitrixFieldName);
    }

    if (!updatedEmployee) {
      return c.json({ error: 'Failed to upload file' }, 500);
    }

    return c.json({
      success: true,
      message: 'File uploaded successfully',
      employee: updatedEmployee
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    return c.json({ error: 'Failed to upload file', details: (error as Error).message }, 500);
  }
});

// Delete file from employee record
adminRoutes.delete('/employee/:bitrixId/file/:fieldName', async (c) => {
  const env = c.env;
  const bitrixId = parseInt(c.req.param('bitrixId'));
  const frontendFieldName = c.req.param('fieldName');
  const fileIdToRemove = c.req.query('fileId'); // Optional: for removing specific file from array

  console.log(`[File Delete] Employee: ${bitrixId}, Field: ${frontendFieldName}, FileId: ${fileIdToRemove}`);

  if (isNaN(bitrixId)) {
    return c.json({ error: 'Invalid employee ID' }, 400);
  }

  // Map frontend field name to Bitrix field name
  const bitrixFieldName = FIELD_MAP[frontendFieldName];
  if (!bitrixFieldName) {
    console.error(`[File Delete] Unknown field: ${frontendFieldName}`);
    return c.json({ error: `Unknown field: ${frontendFieldName}` }, 400);
  }

  console.log(`[File Delete] Mapped to Bitrix field: ${bitrixFieldName}`);

  try {
    const bitrix = new BitrixClient(env);

    // Remove file from employee record
    const updatedEmployee = await bitrix.removeFileFromEmployee(
      bitrixId,
      bitrixFieldName,
      fileIdToRemove ? parseInt(fileIdToRemove) : undefined
    );

    if (!updatedEmployee) {
      console.error(`[File Delete] No employee returned after delete`);
      return c.json({ error: 'Failed to delete file' }, 500);
    }

    console.log(`[File Delete] Success`);
    return c.json({
      success: true,
      message: 'File deleted successfully',
      employee: updatedEmployee
    });

  } catch (error) {
    console.error('[File Delete] Error:', error);
    console.error('[File Delete] Error stack:', (error as Error).stack);
    console.error('[File Delete] Error message:', (error as Error).message);
    return c.json({
      error: 'Failed to delete file',
      details: (error as Error).message,
      stack: (error as Error).stack
    }, 500);
  }
});
