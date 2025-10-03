/**
 * TypeScript type definitions for Cloudflare Workers
 */

export interface Env {
  // D1 Database
  DB: D1Database;

  // KV Namespace (Redis-like cache)
  CACHE: KVNamespace;

  // Analytics Engine (optional)
  ANALYTICS?: AnalyticsEngineDataset;

  // Secrets (from wrangler secret put)
  BITRIX24_WEBHOOK_URL: string;
  OPENSIGN_API_TOKEN: string;
  OPENSIGN_WEBHOOK_SECRET: string;
  SESSION_SECRET: string;
  TURNSTILE_SECRET_KEY: string; // Cloudflare CAPTCHA

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
  ufCrm6BadgeNumber: string;
  ufCrm6Name: string;
  ufCrm6SecondName?: string;
  ufCrm6LastName: string;
  ufCrm6PersonalBirthday: string;
  ufCrm6Ssn?: string;
  ufCrm6Email: string[];
  ufCrm6PersonalMobile: string[];
  ufCrm6WorkPosition: string;
  ufCrm6Subsidiary: string;
  ufCrm6EmploymentStatus: 'Y' | 'N';
  ufCrm6EmploymentStartDate?: string;
  ufCrm6PtoDays?: string;
  ufCrm6HealthInsurance?: number;
  ufCrm_6_401K_ENROLLMENT?: number;
  ufCrm6EquipmentAssigned?: string[];
  ufCrm6HiringPaperwork?: number[];
  // ... other Bitrix24 fields
  [key: string]: any;
}
