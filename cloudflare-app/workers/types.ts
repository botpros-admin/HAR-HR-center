/**
 * TypeScript type definitions for Cloudflare Workers
 */

export interface Env {
  // D1 Database
  DB: D1Database;

  // KV Namespace (Redis-like cache)
  CACHE: KVNamespace;
  EMPLOYEE_CACHE: KVNamespace; // Employee data cache

  // R2 Buckets
  ASSETS: R2Bucket;
  DOCUMENTS: R2Bucket;

  // Analytics Engine (optional)
  ANALYTICS?: AnalyticsEngineDataset;

  // Secrets (from wrangler secret put)
  BITRIX24_WEBHOOK_URL: string;
  OPENSIGN_API_TOKEN: string;
  OPENSIGN_WEBHOOK_SECRET: string;
  SESSION_SECRET: string;
  TURNSTILE_SECRET_KEY: string; // Cloudflare CAPTCHA
  RESEND_API_KEY: string; // Resend email service
  ANTHROPIC_API_KEY: string; // Claude API for AI AutoMap

  // Environment variables
  BITRIX24_ENTITY_TYPE_ID: string;
  OPENSIGN_ENV: 'sandbox' | 'production';
  SESSION_MAX_AGE: string;
  RATE_LIMIT_MAX_ATTEMPTS: string;
  RATE_LIMIT_WINDOW: string;
}

export interface SessionData {
  employeeId: number;
  bitrixId: number;
  badgeNumber: string;
  name: string;
  email: string;
  role: 'employee' | 'hr_admin';
  position?: string;
  department?: string;
  createdAt: number;
}

export interface Employee {
  id: number;
  bitrixId: number;
  badgeNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  dateOfBirth: string;
  ssn?: string; // Encrypted
  email: string[];
  phone: string[];
  position: string;
  department: string;
  employmentStatus: 'active' | 'inactive';
  hireDate?: string;
  data: Record<string, any>; // Full Bitrix24 data
}

export interface LoginRequest {
  employeeId: string;
  dateOfBirth: string;
  turnstileToken?: string; // CAPTCHA token
}

export interface SSNVerificationRequest {
  sessionId: string;
  ssnLast4: string;
}

export interface AuditLogEntry {
  employeeId?: number;
  bitrixId?: number;
  badgeNumber?: string;
  action: string;
  status: 'success' | 'failure' | 'blocked';
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  requiresCaptcha: boolean;
}

export interface PendingTask {
  id: number;
  type: 'sign_document' | 'complete_profile' | 'review_benefits' | 'update_info';
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  relatedId?: string;
}

export interface SignatureRequest {
  id: string;
  employeeId: number;
  documentType: string;
  title: string;
  status: 'pending' | 'signed' | 'declined' | 'expired';
  opensignUrl?: string;
  createdAt: string;
  signedAt?: string;
}

export interface BitrixEmployee {
  id: number;

  // System Fields
  title?: string;
  xmlId?: string;
  createdTime?: string;
  updatedTime?: string;
  createdBy?: number;
  updatedBy?: number;
  assignedById?: number;
  opened?: boolean;
  movedTime?: string;
  movedBy?: number;
  stageId?: string;
  previousStageId?: string;
  lastCommunicationTime?: string;

  // Personal Information (18 fields)
  ufCrm6Name: string; // First Name
  ufCrm6SecondName?: string; // Middle Name
  ufCrm6LastName: string; // Last Name
  ufCrm6PreferredName?: string;
  ufCrm6PersonalBirthday?: string; // Date of Birth
  ufCrm6PersonalGender?: string; // Sex: 2002 = Female, 2003 = Male
  ufCrm6MaritalStatus?: string; // 2021 = Single, 2022 = Married, etc.
  ufCrm6Citizenship?: string; // 2026 = US Citizen, 2027 = Permanent Resident, etc.
  ufCrm6Email?: string[]; // Personal Email (multi)
  ufCrm6PersonalMobile?: string[]; // Personal Cellphone (multi)
  ufCrm6WorkPhone?: string; // Work Cellphone
  ufCrm6PersonalPhone?: string; // Direct Office Phone
  ufCrm61748054470?: string; // Office Phone Extension
  ufCrm6Address?: string; // Address Line 1 (composite)
  ufCrm6UfLegalAddress?: string; // Legal Address (composite/formatted)
  ufCrm6ProfilePhoto?: number; // File ID

  // Emergency Contact (3 fields)
  ufCrm6EmergencyContactName?: string;
  ufCrm6EmergencyContactPhone?: string;
  ufCrm6Relationship?: string; // Emergency Contact Relationship

  // Employment Details (12 fields)
  ufCrm6BadgeNumber: string; // Employee ID
  ufCrm6WorkPosition: string; // Position
  ufCrm6Subsidiary?: string; // 2012 = Construction, 2013 = Painting, 2014 = Windows & Doors
  ufCrm6EmploymentStatus: 'Y' | 'N'; // Active/Inactive checkbox
  ufCrm6EmploymentStartDate?: string; // Start Date
  ufCrm6EmploymentType?: string; // 2030 = Full-Time, 2031 = Part-Time, etc.
  ufCrm6Shift?: string;
  ufCrm6PayRate?: string; // Pay Rate/Salary
  ufCrm6BenefitsEligible?: boolean; // Checkbox
  ufCrm6Sales?: string; // Sales Territory: 2019 = Northern, 2020 = Southern
  ufCrm6SalesUfUserLegal1740423289664?: string; // Project Category: 2015 = Commercial, etc.
  ufCrm6WcCode?: number; // WC Code

  // Citizenship & Work Authorization (3 fields)
  ufCrm6WorkVisa?: number; // File ID
  ufCrm6VisaExpiry?: string; // Date

  // Compensation & Benefits (8 fields)
  ufCrm6Ssn?: string; // Social Security Number
  ufCrm6PtoDays?: string; // PTO Days Allocated
  ufCrm6HealthInsurance?: number; // Health Insurance Enrollment file ID
  ufCrm_6_401K_ENROLLMENT?: number; // 401k Enrollment file ID
  ufCrm6LifeBeneficiaries?: string; // Life Insurance Beneficiaries text

  // Tax & Payroll Information (10 fields)
  ufCrm6UfUsr1737120507262?: string; // Payment Method: 2010 = Direct Deposit, 2011 = Check
  ufCrm6TaxFilingStatus?: string; // 2039 = Single, 2040 = Married Filing Jointly, etc.
  ufCrm6W4Exemptions?: string; // W-4 Exemptions Claimed
  ufCrm6AdditionalFedWithhold?: string; // Additional Federal Withholding
  ufCrm6AdditionalStateWithhold?: string; // Additional State Withholding
  ufCrm6UfW4File?: number[]; // W-4 Form files
  ufCrm6UfI9File?: number[]; // I-9 Form files
  ufCrm6MultipleJobsWorksheet?: number; // File ID
  ufCrm6DeductionsWorksheet?: number; // File ID

  // Banking & Direct Deposit (6 fields)
  ufCrm6BankName?: string;
  ufCrm6BankAccountName?: string; // Bank Account Holder Name
  ufCrm6BankAccountType?: string; // 2036 = Checking, 2037 = Savings, 2038 = Money Market
  ufCrm6BankRouting?: string;
  ufCrm6BankAccountNumber?: string;
  ufCrm6DirectDeposit?: number; // Direct Deposit Authorization file ID

  // Dependents & Beneficiaries (4 fields)
  ufCrm6DependentsInfo?: string[]; // Multi-text
  ufCrm6DependentNames?: string[]; // Multi-text
  ufCrm6DependentSsns?: string[]; // Multi-text
  ufCrm6DependentRelationships?: string[]; // Multi-text

  // Education & Skills (7 fields)
  ufCrm6EducationLevel?: string;
  ufCrm6SchoolName?: string;
  ufCrm6GraduationYear?: string;
  ufCrm6FieldOfStudy?: string;
  ufCrm6Skills?: string; // Comma-separated or JSON
  ufCrm6Certifications?: string[]; // Files array
  ufCrm6SkillsLevel?: string; // 2085 = Beginner, 2086 = Intermediate, etc.

  // Training & Compliance (12 fields)
  ufCrm6RequiredTraining?: string; // 2073 = Not Started, 2074 = In Progress, etc.
  ufCrm6SafetyTraining?: string; // Same options as Required Training
  ufCrm6ComplianceTraining?: string; // Same options as Required Training
  ufCrm6TrainingDate?: string; // Training Completion Date
  ufCrm6NextTrainingDue?: string; // Next Training Due Date
  ufCrm6TrainingNotes?: string;
  ufCrm6TrainingComplete?: number[]; // Required Training Completion files
  ufCrm6ProfessionalCertifications?: number[]; // Files array (different from text certifications)
  ufCrm6TrainingRecords?: number[]; // Training Records files
  ufCrm6SkillsAssessment?: number; // Skills Assessment file
  ufCrm6TrainingDocs?: number[]; // Training Documents files

  // IT & Equipment (13 fields)
  ufCrm6SoftwareExperience?: string;
  ufCrm6EquipmentAssigned?: string[]; // Multiselect: 2043 = Phone, 2044 = Laptop, etc.
  ufCrm6EquipmentStatus?: string; // 2065 = Issued, 2066 = Returned, etc.
  ufCrm6EquipmentReturn?: string; // IT Equipment Return Tracking
  ufCrm6SoftwareAccess?: string[]; // Multiselect: 2050 = Office 365, 2051 = CRM, etc.
  ufCrm6AccessPermissions?: string[]; // Multi-text
  ufCrm6AccessLevel?: string; // 2057 = Basic User, 2058 = Power User, etc.
  ufCrm6SecurityClearance?: string; // 2061 = None, 2062 = Confidential, etc.
  ufCrm6NetworkStatus?: string; // 2069 = Active, 2070 = Inactive, etc.
  ufCrm6VpnAccess?: boolean; // Checkbox
  ufCrm6RemoteAccess?: boolean; // Remote Access Approved checkbox

  // Vehicle & Licensing (4 fields)
  ufCrm6UfUsr1747966315398?: number; // Driver's License file
  ufCrm6UfUsr1747966315398Expiry?: string; // Driver's License Expiry
  ufCrm6UfUsr1737120327618?: number; // Automobile Insurance file
  ufCrm6UfUsr1737120327618Expiry?: string; // Automobile Insurance Expiry

  // Performance & Reviews (3 fields)
  ufCrm6ReviewDate?: string[]; // Performance Review Dates (multi-date)
  ufCrm6TerminationDate?: string;
  ufCrm6RehireEligible?: boolean; // Checkbox

  // Documents (7 files)
  ufCrm6HiringPaperwork?: number[]; // Hiring Paperwork files
  ufCrm6HandbookAck?: number; // Employee Handbook Acknowledgment file
  ufCrm6BackgroundCheck?: number; // File
  ufCrm6DrugTest?: number[]; // Drug Test Results files
  ufCrm6Nda?: number; // NDA Agreement file
  ufCrm6Noncompete?: number; // Non-Compete Agreement file

  // Additional data stored as JSON blob
  ufCrm6AdditionalInfo?: string; // Stores: work experiences, references, documents, legal fields, etc.

  // Catch-all for any other Bitrix24 fields
  [key: string]: any;
}

export interface DocumentTemplate {
  id: string;
  title: string;
  description?: string;
  category: 'onboarding' | 'tax' | 'benefits' | 'policy' | 'other';
  templateUrl: string; // R2 key/path
  fileName: string;
  fileSize?: number;
  requiresSignature: boolean;
  fieldPositions?: string; // JSON: SignatureField[]
  defaultSignerConfig?: string; // JSON: DefaultSignerConfig
  isActive: boolean;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentAssignment {
  id: number;
  templateId: string;
  employeeId: number;
  bitrixId: number;
  signatureRequestId?: string;
  status: 'assigned' | 'sent' | 'signed' | 'declined' | 'expired';
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  assignedAt: string;
  assignedBy?: number;
  signedAt?: string;
  signedDocumentUrl?: string;
  bitrixFileId?: string;
  notes?: string;
  // Multi-signer fields
  signingWorkflow?: string; // JSON: SigningWorkflowConfig
  currentSignerStep?: number;
  isMultiSigner?: boolean;
}

// Multi-signer configuration
export interface SigningWorkflowConfig {
  signers: SignerConfig[];
  sequential: boolean; // true = sequential, false = parallel (for future)
  createdAt: string;
}

export interface SignerConfig {
  order: number; // 1, 2, 3...
  bitrixId: number;
  employeeName: string;
  employeeEmail?: string;
  roleName: string; // 'Employee', 'Manager', 'HR Representative'
}

export interface DocumentSigner {
  id: number;
  assignmentId: number;
  employeeId: number;
  bitrixId: number;
  employeeName: string;
  employeeEmail?: string;
  signingOrder: number;
  roleName?: string;
  status: 'pending' | 'signed' | 'declined';
  signedAt?: string;
  signatureUrl?: string; // R2 path to signed PDF version
  signatureImageUrl?: string; // R2 path to signature image
  declineReason?: string;
  notifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Template default signer configuration (V2 - Template-Level Workflow)
export interface DefaultSignerConfig {
  mode: 'single_signer' | 'multi_signer';
  signers?: TemplateSignerConfig[];
  description?: string;
}

export type SignerType = 'assignee' | 'hr_admin' | 'assignees_manager' | 'specific_person';

export interface TemplateSignerConfig {
  order: number;
  signerType: SignerType;
  roleName: string;
  bitrixId?: number; // Only for 'specific_person'
  description?: string;
}

// Database query result types
export interface DocumentAssignmentWithTemplate extends DocumentAssignment {
  template_url: string;
  title: string;
}

export interface DocumentAssignmentWithSigners extends DocumentAssignmentWithTemplate {
  signers: DocumentSigner[];
  totalSigners: number;
  signedCount: number;
  pendingCount: number;
  declinedCount: number;
}

export interface SystemConfigResult {
  value: string;
}
