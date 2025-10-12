# Hartzell HR Center - Technical Specification

**Version:** 1.0 (As-Deployed)
**Last Updated:** October 12, 2025
**Status:** Production

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Infrastructure](#infrastructure)
4. [Authentication & Security](#authentication--security)
5. [Data Model](#data-model)
6. [API Specification](#api-specification)
7. [Frontend Application](#frontend-application)
8. [Deployment](#deployment)

---

## System Overview

### Purpose

The Hartzell HR Center provides a secure web portal for:
1. **Employees** - View/edit personal information, emergency contacts, tax/banking details
2. **Administrators** - Manage employee records, upload document templates, assign documents

All employee data is stored in Bitrix24 CRM (entity type 1054). The system acts as a user-friendly interface layer over Bitrix24.

### Production URLs

- **Employee Portal:** https://app.hartzell.work
- **Backend API:** https://hartzell.work/api/*

### Core Features (Implemented)

1. **3-Tier Authentication**
   - Tier 1: Badge Number + Date of Birth
   - Tier 2: Employee ID verification
   - Tier 3: Last 4 SSN + hCaptcha

2. **Employee Self-Service**
   - View/edit 100+ profile fields
   - Emergency contact updates
   - Address changes
   - Banking/tax information updates

3. **Admin Dashboard**
   - Employee directory with search/filter
   - Individual employee detail pages
   - Bulk employee sync from Bitrix24
   - Field-level editing with validation

4. **Document Management**
   - Upload PDF templates to R2 storage
   - Define field positions (drag-drop interface)
   - Assign templates to employees
   - Track assignment status (pending/completed)

### Not Implemented

- E-signature system (OpenSign integration was planned but abandoned)
- Email notifications
- Performance review system
- Disciplinary action tracking
- Recruitment/application portal
- Onboarding checklist system
- Offboarding workflow

---

## Architecture

### High-Level Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Cloudflare CDN                          │
│                  (TLS termination, caching)                  │
└───────────────────────┬──────────────────────────────────────┘
                        │
        ┌───────────────┴────────────────┐
        │                                │
        ▼                                ▼
┌───────────────────┐          ┌─────────────────────┐
│  Cloudflare Pages │          │ Cloudflare Workers  │
│  (Next.js Static) │          │  (Hono Framework)   │
│                   │          │                     │
│  app.hartzell.work│─────────▶│ hartzell.work/api/* │
└───────────────────┘          └──────────┬──────────┘
                                          │
                      ┌───────────────────┼───────────────────┐
                      │                   │                   │
                      ▼                   ▼                   ▼
              ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
              │ D1 Database  │   │  KV Cache    │   │  R2 Storage  │
              │  (SQLite)    │   │  (24hr TTL)  │   │    (PDFs)    │
              │              │   │              │   │              │
              │ - sessions   │   │ - employees  │   │ - templates  │
              │ - admins     │   └──────────────┘   │ - assets     │
              │ - templates  │                      └──────────────┘
              │ - assignments│
              └──────────────┘
                      │
                      │ (Bitrix24 API calls)
                      ▼
              ┌──────────────────────────┐
              │   Bitrix24 CRM           │
              │   Entity Type 1054       │
              │   (Source of Truth)      │
              │                          │
              │ - 39 employees           │
              │ - 100+ custom fields     │
              │ - File storage           │
              └──────────────────────────┘
```

### Technology Stack

**Backend (Cloudflare Workers):**
```
Runtime:     Cloudflare Workers (V8 isolates, edge compute)
Framework:   Hono 4.x (Express-like API for Workers)
Language:    TypeScript 5.3+
Database:    Cloudflare D1 (SQLite, 7 tables)
Cache:       Cloudflare KV (key-value store, 24hr TTL)
Storage:     Cloudflare R2 (S3-compatible object storage)
Validation:  Zod
Auth:        Custom session management (encrypted cookies)
CAPTCHA:     hCaptcha
```

**Frontend (Cloudflare Pages):**
```
Framework:   Next.js 14 (App Router, static export)
Language:    TypeScript 5.3+
Styling:     Tailwind CSS 3.4+
Components:  shadcn/ui, Radix UI primitives
Icons:       Lucide React
Animation:   Framer Motion, Lottie
Forms:       React Hook Form + Zod validation
HTTP:        Native fetch (credentials: 'include' for cookies)
```

**Integration:**
```
Bitrix24:    REST API via webhook URL
             Entity Type: 1054 (HR Center SPA)
             100+ custom fields (ufCrm6* prefix)
```

---

## Infrastructure

### Cloudflare Account

**Account ID:** b68132a02e46f8cc02bcf9c5745a72b9

### Production Resources

#### 1. Cloudflare Worker

**Name:** hartzell-hr-center-production
**Routes:** `hartzell.work/api/*`
**Current Version:** e702eb84-6e35-498f-899b-4961d876fda9
**Deployed:** October 12, 2025

**Entry Point:** `workers/index.ts` (Hono app)

**Routes:**
- `POST /api/auth/login` - Tier 1 auth (badge + DOB)
- `POST /api/auth/verify-ssn` - Tier 3 auth (SSN + CAPTCHA)
- `POST /api/auth/logout` - Session termination
- `GET /api/auth/session` - Session validation
- `GET /api/employee/profile` - Employee data (authenticated)
- `PUT /api/employee/profile` - Update employee data
- `GET /api/employee/dashboard` - Dashboard summary
- `GET /api/employee/tasks` - Pending tasks
- `GET /api/employee/documents` - Assigned documents
- `GET /api/admin/employees` - Employee list (admin)
- `POST /api/admin/employees/refresh` - Sync from Bitrix24
- `GET /api/admin/employee/:id` - Employee detail (admin)
- `PATCH /api/admin/employee/:id` - Update employee (admin)
- `GET /api/admin/templates` - Template list
- `POST /api/admin/templates` - Upload template
- `DELETE /api/admin/templates/:id` - Delete template
- `PUT /api/admin/templates/:id/fields` - Update field positions
- `GET /api/admin/assignments` - Assignment list
- `POST /api/admin/assignments` - Create assignment
- `DELETE /api/admin/assignments/:id` - Delete assignment
- `GET /api/signatures/pending` - Pending signatures (placeholder)
- `GET /api/signatures/:id/url` - Signature URL (placeholder)

#### 2. D1 Database

**Name:** hartzell_hr_prod
**ID:** 9926c3a9-c6e1-428f-8c36-fdb001c326fd

**Schema:**
```sql
-- Session management
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  bitrix_id INTEGER NOT NULL,
  full_name TEXT NOT NULL,
  badge_number TEXT NOT NULL,
  auth_level INTEGER NOT NULL, -- 1, 2, or 3
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_activity INTEGER NOT NULL
);

-- Rate limiting
CREATE TABLE login_attempts (
  ip_address TEXT NOT NULL,
  attempt_time INTEGER NOT NULL,
  success INTEGER DEFAULT 0,
  PRIMARY KEY (ip_address, attempt_time)
);

-- Admin authentication
CREATE TABLE admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, -- bcrypt
  full_name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_login INTEGER
);

-- Employee cache (for quick lookups)
CREATE TABLE employee_cache (
  bitrix_id INTEGER PRIMARY KEY,
  badge_number TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  position TEXT,
  department TEXT,
  email TEXT,
  phone TEXT,
  data TEXT, -- JSON snapshot
  last_sync INTEGER NOT NULL
);

-- Signature requests (placeholder for future)
CREATE TABLE signature_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  document_type TEXT NOT NULL,
  document_title TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, completed, cancelled
  signature_url TEXT,
  created_at INTEGER NOT NULL,
  completed_at INTEGER
);

-- PDF templates
CREATE TABLE templates (
  id TEXT PRIMARY KEY, -- UUID
  filename TEXT NOT NULL,
  category TEXT NOT NULL, -- onboarding, compliance, benefits, performance, other
  description TEXT,
  field_positions TEXT, -- JSON array of field definitions
  active INTEGER DEFAULT 1,
  r2_key TEXT NOT NULL, -- R2 object key
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Document assignments
CREATE TABLE assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id TEXT NOT NULL,
  employee_bitrix_id INTEGER NOT NULL,
  assigned_by TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, completed, cancelled
  priority TEXT DEFAULT 'normal', -- low, normal, high
  due_date INTEGER,
  notes TEXT,
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  FOREIGN KEY (template_id) REFERENCES templates(id)
);
```

#### 3. KV Namespace

**Binding:** CACHE
**ID:** 54f7714316b14265a8224c255d9a7f80

**Usage:**
- Cache employee data fetched from Bitrix24
- Key format: `employee:badge:{badgeNumber}` or `employee:id:{bitrixId}`
- TTL: 24 hours (86400 seconds)
- Reduces Bitrix24 API calls
- Invalidated on employee updates

#### 4. R2 Storage

**Buckets:**
1. **hartzell-assets-prod** (Binding: ASSETS)
   - General assets (images, files)
   - Public read access

2. **hartzell-hr-templates-prod** (Binding: DOCUMENTS)
   - PDF templates uploaded by admins
   - Private access (authenticated only)
   - Object naming: `templates/{uuid}.pdf`

#### 5. Cloudflare Pages

**Project:** hartzell-hr-frontend
**Production URL:** https://app.hartzell.work
**Latest Deployment:** ba780ac1.hartzell-hr-frontend.pages.dev
**Build Command:** `npm run build` (generates static export to `out/`)
**Output Directory:** `out/`

**Environment Variables:**
- `NEXT_PUBLIC_API_URL` = `https://hartzell.work/api`
- `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` = (hCaptcha site key)

### Secrets (Cloudflare Workers)

Stored securely, accessed via `env` parameter:

1. **BITRIX24_WEBHOOK_URL** - Bitrix24 REST API webhook
2. **SESSION_SECRET** - 32-byte hex string for session encryption
3. **HCAPTCHA_SECRET** - hCaptcha secret key for verification

### Environment Variables (wrangler.toml)

```toml
[vars]
BITRIX24_ENTITY_TYPE_ID = "1054"
SESSION_MAX_AGE = "28800"          # 8 hours in seconds
RATE_LIMIT_MAX_ATTEMPTS = "5"
RATE_LIMIT_WINDOW = "900"          # 15 minutes in seconds
```

---

## Authentication & Security

### Authentication Flow

#### Tier 1: Badge Number + DOB
```
POST /api/auth/login
{
  "badgeNumber": "EMP1001",
  "dateOfBirth": "1990-01-15"
}

Success Response (200):
{
  "success": true,
  "authLevel": 1,
  "employeeId": 123,
  "fullName": "John Doe",
  "nextStep": "verify-ssn"
}

Error Response (401):
{
  "error": "Invalid credentials",
  "remainingAttempts": 4
}

Error Response (429):
{
  "error": "Too many attempts. Please try again later.",
  "requiresCaptcha": true,
  "retryAfter": 900
}
```

**Process:**
1. Client sends badge number and DOB
2. Worker queries Bitrix24 via `BitrixClient.getEmployeeByBadgeNumber()`
3. If found, compare DOB (format: YYYY-MM-DD)
4. If match, create session with `authLevel: 1`
5. Return session cookie (HttpOnly, Secure, SameSite=Strict)

#### Tier 2: Employee ID Verification
```
Employee ID is displayed on screen after Tier 1 success.
Employee must verify the displayed ID matches their badge.
This is UI-only, no API call required.
```

#### Tier 3: SSN + CAPTCHA
```
POST /api/auth/verify-ssn
{
  "ssnLast4": "1234",
  "captchaToken": "..."
}

Success Response (200):
{
  "success": true,
  "authLevel": 3,
  "csrfToken": "...",
  "employee": {
    "badgeNumber": "EMP1001",
    "fullName": "John Doe",
    "position": "Project Manager",
    "department": "Operations"
  }
}

Error Response (401):
{
  "error": "Invalid SSN",
  "remainingAttempts": 3
}

Error Response (400):
{
  "error": "Invalid or expired CAPTCHA token"
}
```

**Process:**
1. Worker verifies session exists with `authLevel >= 1`
2. Verify hCaptcha token with hCaptcha API
3. Fetch employee full SSN from Bitrix24
4. Compare last 4 digits
5. If match, upgrade session to `authLevel: 3`
6. Generate CSRF token, store in session
7. Return CSRF token in response

### Session Management

**Implementation:** Encrypted cookie-based sessions

**Session Data:**
```typescript
interface SessionData {
  sessionId: string;         // UUID
  employeeId: number;        // Internal ID
  bitrixId: number;          // Bitrix24 entity ID
  fullName: string;
  badgeNumber: string;
  authLevel: 1 | 2 | 3;      // Authentication tier
  createdAt: number;         // Unix timestamp
  expiresAt: number;         // Unix timestamp (createdAt + 8 hours)
  lastActivity: number;      // Unix timestamp
  csrfToken?: string;        // Set after Tier 3 auth
  isAdmin?: boolean;         // Admin session flag
}
```

**Cookie Properties:**
- Name: `hr_session`
- HttpOnly: true (prevents JavaScript access)
- Secure: true (HTTPS only)
- SameSite: Strict (CSRF protection)
- Max-Age: 28800 seconds (8 hours)
- Encrypted: AES-256-GCM with SESSION_SECRET

**Session Storage:**
- Stored in D1 `sessions` table
- Indexed by `id` (session ID)
- Cleaned up on expiry (automatic via worker cron or on-demand)

**Session Validation:**
```typescript
async function validateSession(cookie: string, env: Env): Promise<SessionData | null> {
  // 1. Decrypt cookie
  const sessionId = await decryptCookie(cookie, env.SESSION_SECRET);

  // 2. Query D1
  const session = await env.DB.prepare(
    'SELECT * FROM sessions WHERE id = ? AND expires_at > ?'
  ).bind(sessionId, Date.now()).first();

  if (!session) return null;

  // 3. Update last_activity
  await env.DB.prepare(
    'UPDATE sessions SET last_activity = ? WHERE id = ?'
  ).bind(Date.now(), sessionId).run();

  return session as SessionData;
}
```

### Rate Limiting

**Configuration:**
- Max attempts: 5 per 15 minutes per IP address
- Tracked in D1 `login_attempts` table
- After 5 failed attempts, CAPTCHA required
- Cleanup: Delete attempts older than 15 minutes on each request

**Implementation:**
```typescript
async function checkRateLimit(ip: string, env: Env): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = Date.now() - 900000; // 15 minutes ago

  // Cleanup old attempts
  await env.DB.prepare(
    'DELETE FROM login_attempts WHERE attempt_time < ?'
  ).bind(windowStart).run();

  // Count recent attempts
  const result = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM login_attempts WHERE ip_address = ? AND attempt_time >= ? AND success = 0'
  ).bind(ip, windowStart).first();

  const attempts = result.count;
  const remaining = 5 - attempts;

  return {
    allowed: attempts < 5,
    remaining: Math.max(0, remaining)
  };
}
```

### CSRF Protection

**Token Generation:**
- 32-byte random hex string
- Generated after Tier 3 authentication
- Stored in session
- Sent to client in response body (NOT in cookie)

**Validation:**
- Required on POST, PUT, PATCH, DELETE requests
- Sent in `X-CSRF-Token` header
- Worker compares header token with session token
- If mismatch, return 403 Forbidden

**Frontend Implementation:**
```typescript
// API client stores CSRF token
class ApiClient {
  private csrfToken: string | null = null;

  setCsrfToken(token: string) {
    this.csrfToken = token;
  }

  async request(endpoint: string, options: RequestInit) {
    const headers = { ...options.headers };

    // Add CSRF token for state-changing requests
    if (this.csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method)) {
      headers['X-CSRF-Token'] = this.csrfToken;
    }

    return fetch(endpoint, { ...options, headers, credentials: 'include' });
  }
}
```

### Security Headers

**Set by Worker on all responses:**
```typescript
{
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
}
```

### Sensitive Data Handling

**Fields Redacted from Logs:**
```typescript
const SENSITIVE_FIELDS = [
  'ufCrm6Ssn',
  'ufCrm6BankRouting',
  'ufCrm6BankAccountNumber',
  'ufCrm6DependentSsns'
];

function redactSensitiveFields(data: Record<string, any>): Record<string, any> {
  const redacted = { ...data };
  for (const field of SENSITIVE_FIELDS) {
    if (redacted[field]) {
      redacted[field] = '[REDACTED]';
    }
  }
  return redacted;
}
```

**Bitrix24 Encryption:**
- Sensitive fields stored encrypted at rest in Bitrix24
- Worker does not perform additional encryption
- Data transmitted over HTTPS only

---

## Data Model

### Bitrix24 Entity

**Entity Type ID:** 1054 (HR Center SPA)

**100+ Custom Fields** (prefix `ufCrm6*`):

#### Personal Information (18 fields)
```typescript
ufCrm6Name: string;                  // First Name
ufCrm6SecondName?: string;           // Middle Name
ufCrm6LastName: string;              // Last Name
ufCrm6PreferredName?: string;        // Preferred Name
ufCrm6PersonalBirthday: string;      // Date of Birth (YYYY-MM-DD)
ufCrm6PersonalGender: "Male" | "Female" | "Other";
ufCrm6MaritalStatus?: "Single" | "Married" | "Divorced" | "Widowed" | "Separated";
ufCrm6Citizenship: string;           // US Citizen, Permanent Resident, etc.
ufCrm6Email: string[];               // Email addresses (array)
ufCrm6PersonalMobile: string[];      // Personal phone (array)
ufCrm6WorkPhone?: string;
ufCrm6PersonalPhone?: string;
ufCrm6Ssn: string;                   // Social Security Number (encrypted)
ufCrm6DriversLicenseNumber?: string;
ufCrm6DriversLicenseState?: string;
ufCrm6DriversLicenseExpiry?: string;
ufCrm6VeteranStatus?: string;
ufCrm6Ethnicity?: string;
```

#### Contact Information (8 fields)
```typescript
ufCrm6MailingAddress?: string;
ufCrm6MailingCity?: string;
ufCrm6MailingState?: string;
ufCrm6MailingZip?: string;
ufCrm6PhysicalAddress?: string;
ufCrm6PhysicalCity?: string;
ufCrm6PhysicalState?: string;
ufCrm6PhysicalZip?: string;
```

#### Emergency Contacts (20 fields - 2 contacts)
```typescript
// Primary Emergency Contact
ufCrm6EmergencyContactName: string;
ufCrm6Relationship: string;
ufCrm6EmergencyContactPhone: string;
ufCrm6EmergencyContactEmail?: string;
ufCrm6EmergencyContactAddress?: string;
ufCrm6EmergencyContactCity?: string;
ufCrm6EmergencyContactState?: string;
ufCrm6EmergencyContactZip?: string;
ufCrm6EmergencyContactCitizenship?: string;
ufCrm6EmergencyContactBirthday?: string;

// Secondary Emergency Contact
ufCrm6EmergencyContact2Name?: string;
ufCrm6EmergencyContact2Relationship?: string;
ufCrm6EmergencyContact2Phone?: string;
ufCrm6EmergencyContact2Email?: string;
ufCrm6EmergencyContact2Address?: string;
ufCrm6EmergencyContact2City?: string;
ufCrm6EmergencyContact2State?: string;
ufCrm6EmergencyContact2Zip?: string;
ufCrm6EmergencyContact2Citizenship?: string;
ufCrm6EmergencyContact2Birthday?: string;
```

#### Employment Information (12 fields)
```typescript
ufCrm6BadgeNumber: string;           // Employee ID (unique)
ufCrm6WorkPosition: string;          // Job Title
ufCrm6Subsidiary: string;            // Company/Division
ufCrm6EmploymentType: "Full-Time" | "Part-Time" | "Contract" | "Temporary";
ufCrm6EmploymentStartDate?: string;  // Hire Date
ufCrm6EmploymentStatus?: "Active" | "Inactive";
ufCrm6PayRate?: number;
ufCrm6BenefitsEligible?: "Y" | "N";
ufCrm6PtoDays?: number;
ufCrm6WcCode?: number;               // Workers' Comp code
ufCrm6TerminationDate?: string;
ufCrm6RehireEligible?: "Y" | "N";
```

#### Tax Information (12 fields)
```typescript
ufCrm6TaxFilingStatus: "Single" | "Married Filing Jointly" | "Married Filing Separately" | "Head of Household";
ufCrm6W4Allowances?: number;
ufCrm6AdditionalFedWithhold?: number;
ufCrm6AdditionalStateWithhold?: number;
ufCrm6StateOfResidence?: string;
ufCrm6StateOfEmployment?: string;
ufCrm6MultipleJobsWorksheet?: number;  // File ID
ufCrm6DeductionsWorksheet?: number;    // File ID
ufCrm_6_W4_EXEMPTIONS?: string;
ufCrm_6_UF_W4_FILE?: number[];         // W-4 form file IDs
ufCrm_6_UF_I9_FILE?: number[];         // I-9 form file IDs
ufCrm6FederalExempt?: "Y" | "N";
```

#### Banking Information (6 fields)
```typescript
ufCrm6BankName?: string;
ufCrm6BankAccountName?: string;
ufCrm6BankAccountType?: "Checking" | "Savings" | "Money Market";
ufCrm6BankRouting?: string;          // Encrypted
ufCrm6BankAccountNumber?: string;    // Encrypted
ufCrm6DirectDeposit?: number;        // File ID (voided check)
```

#### Dependent Information (24 fields - up to 4 dependents)
```typescript
ufCrm6DependentNames?: string[];         // Array of names
ufCrm6DependentSsns?: string[];          // Array of SSNs (encrypted)
ufCrm6DependentRelationships?: string[]; // Array of relationships
ufCrm6DependentBirthdates?: string[];    // Array of DOBs
ufCrm6DependentGenders?: string[];       // Array of genders
ufCrm6DependentCitizenships?: string[];  // Array of citizenships
```

#### Immigration Status (4 fields)
```typescript
ufCrm6WorkVisa?: number;             // Visa document file ID
ufCrm6VisaType?: string;
ufCrm6VisaExpiry?: string;
ufCrm6WorkAuthorization?: string;
```

### Field Mapping (Frontend ↔ Bitrix24)

**Defined in:** `/cloudflare-app/workers/routes/admin.ts`

```typescript
const FIELD_MAP: Record<string, string> = {
  // Frontend camelCase → Bitrix24 ufCrm6*
  firstName: 'ufCrm6Name',
  middleName: 'ufCrm6SecondName',
  lastName: 'ufCrm6LastName',
  preferredName: 'ufCrm6PreferredName',
  dateOfBirth: 'ufCrm6PersonalBirthday',
  gender: 'ufCrm6PersonalGender',
  maritalStatus: 'ufCrm6MaritalStatus',
  citizenship: 'ufCrm6Citizenship',
  personalEmail: 'ufCrm6Email',
  personalPhone: 'ufCrm6PersonalMobile',
  ssn: 'ufCrm6Ssn',

  // ... 95+ more mappings

  badgeNumber: 'ufCrm6BadgeNumber',
  position: 'ufCrm6WorkPosition',
  department: 'ufCrm6Subsidiary',
  hireDate: 'ufCrm6EmploymentStartDate',
};
```

**Usage:**
```typescript
// Converting frontend data to Bitrix24 format
const bitrixFields: Record<string, any> = {};
for (const [frontendKey, value] of Object.entries(formData)) {
  const bitrixKey = FIELD_MAP[frontendKey];
  if (bitrixKey) {
    bitrixFields[bitrixKey] = value;
  }
}

// Send to Bitrix24
await bitrixClient.updateEmployee(bitrixId, bitrixFields);
```

---

## API Specification

### Authentication Endpoints

#### POST /api/auth/login
Tier 1 authentication (Badge Number + DOB).

**Request:**
```json
{
  "badgeNumber": "EMP1001",
  "dateOfBirth": "1990-01-15"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "authLevel": 1,
  "employeeId": 123,
  "fullName": "John Doe"
}
```

**Error Responses:**
- 401: Invalid credentials
- 429: Too many attempts (rate limit exceeded)
- 500: Server error

#### POST /api/auth/verify-ssn
Tier 3 authentication (SSN last 4 + CAPTCHA).

**Request:**
```json
{
  "ssnLast4": "1234",
  "captchaToken": "hcaptcha_token_here"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "authLevel": 3,
  "csrfToken": "abc123...",
  "employee": {
    "badgeNumber": "EMP1001",
    "fullName": "John Doe",
    "position": "Project Manager",
    "department": "Operations"
  }
}
```

#### POST /api/auth/logout
Terminate session.

**Response (200):**
```json
{
  "success": true
}
```

#### GET /api/auth/session
Validate current session.

**Response (200):**
```json
{
  "valid": true,
  "session": {
    "employeeId": 123,
    "fullName": "John Doe",
    "badgeNumber": "EMP1001",
    "authLevel": 3
  }
}
```

### Employee Endpoints

#### GET /api/employee/profile
Get authenticated employee's profile.

**Authentication:** Required (authLevel >= 3)

**Response (200):**
```json
{
  "id": 123,
  "badgeNumber": "EMP1001",
  "firstName": "John",
  "lastName": "Doe",
  "position": "Project Manager",
  "department": "Operations",
  "email": ["john.doe@example.com"],
  "phone": ["555-1234"],
  // ... 95+ more fields
}
```

#### PUT /api/employee/profile
Update authenticated employee's profile.

**Authentication:** Required (authLevel >= 3, CSRF token)

**Request:**
```json
{
  "field": "personalPhone",
  "value": ["555-5678"]
}
```

**Response (200):**
```json
{
  "success": true,
  "employee": { /* updated employee data */ }
}
```

### Admin Endpoints

#### GET /api/admin/employees
List all employees (admin only).

**Authentication:** Admin session required

**Query Parameters:**
- `search` (optional): Search by name or badge
- `department` (optional): Filter by department
- `status` (optional): Filter by employment status

**Response (200):**
```json
{
  "employees": [
    {
      "bitrixId": 123,
      "badgeNumber": "EMP1001",
      "fullName": "John Doe",
      "position": "Project Manager",
      "department": "Operations",
      "email": "john.doe@example.com",
      "phone": "555-1234"
    },
    // ... more employees
  ]
}
```

#### POST /api/admin/employees/refresh
Sync all employees from Bitrix24 to D1 cache.

**Authentication:** Admin session required

**Response (200):**
```json
{
  "success": true,
  "count": 39,
  "message": "Refreshed 39 employees from Bitrix24"
}
```

#### GET /api/admin/employee/:bitrixId
Get employee detail (admin only).

**Authentication:** Admin session required

**Response (200):**
```json
{
  "employee": {
    "id": 123,
    "badgeNumber": "EMP1001",
    // ... all 100+ fields
  }
}
```

#### PATCH /api/admin/employee/:bitrixId
Update employee (admin only).

**Authentication:** Admin session required, CSRF token

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "position": "Senior Project Manager"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Employee updated successfully",
  "employee": { /* updated employee data */ }
}
```

### Template & Assignment Endpoints

#### GET /api/admin/templates
List PDF templates.

**Authentication:** Admin session required

**Query Parameters:**
- `category` (optional): Filter by category
- `active_only` (optional): Show only active templates

**Response (200):**
```json
{
  "templates": [
    {
      "id": "uuid-1234",
      "filename": "W-4.pdf",
      "category": "onboarding",
      "description": "Federal Tax Withholding",
      "fieldPositions": [...],
      "active": true,
      "createdAt": 1696291200000
    }
  ]
}
```

#### POST /api/admin/templates
Upload PDF template.

**Authentication:** Admin session required, CSRF token

**Request:** FormData with:
- `file`: PDF file
- `category`: Template category
- `description`: Template description

**Response (200):**
```json
{
  "success": true,
  "template": {
    "id": "uuid-1234",
    "filename": "W-4.pdf",
    "r2Key": "templates/uuid-1234.pdf"
  }
}
```

#### DELETE /api/admin/templates/:id
Delete template.

**Authentication:** Admin session required, CSRF token

**Response (200):**
```json
{
  "success": true,
  "message": "Template deleted"
}
```

#### PUT /api/admin/templates/:id/fields
Update template field positions.

**Authentication:** Admin session required, CSRF token

**Request:**
```json
{
  "fieldPositions": [
    {
      "name": "firstName",
      "type": "text",
      "page": 1,
      "x": 100,
      "y": 200,
      "width": 150,
      "height": 20
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Field positions updated"
}
```

#### GET /api/admin/assignments
List document assignments.

**Authentication:** Admin session required

**Query Parameters:**
- `status` (optional): Filter by status
- `employee_id` (optional): Filter by employee

**Response (200):**
```json
{
  "assignments": [
    {
      "id": 1,
      "templateId": "uuid-1234",
      "employeeBitrixId": 123,
      "status": "pending",
      "priority": "normal",
      "dueDate": 1696550400000,
      "createdAt": 1696291200000
    }
  ]
}
```

#### POST /api/admin/assignments
Create document assignment.

**Authentication:** Admin session required, CSRF token

**Request:**
```json
{
  "templateId": "uuid-1234",
  "employeeIds": [123, 456],
  "priority": "high",
  "dueDate": "2025-10-15",
  "notes": "Complete by end of week"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Created 2 assignments",
  "assignments": [ /* assignment objects */ ]
}
```

#### DELETE /api/admin/assignments/:id
Delete assignment.

**Authentication:** Admin session required, CSRF token

**Response (200):**
```json
{
  "success": true,
  "message": "Assignment deleted"
}
```

---

## Frontend Application

### Pages

**Public:**
- `/` - Landing page

**Authentication:**
- `/login` - Tier 1 auth (Badge + DOB)
- `/login/verify-id` - Tier 2 auth (ID display)
- `/login/verify-ssn` - Tier 3 auth (SSN + CAPTCHA)

**Employee Portal:**
- `/dashboard` - Employee dashboard
- `/dashboard/profile` - View/edit profile
- `/dashboard/documents` - View assigned documents
- `/dashboard/tasks` - View pending tasks

**Admin:**
- `/admin` - Admin dashboard
- `/admin/employees` - Employee directory
- `/admin/employees/detail?id=:bitrixId` - Employee detail page
- `/admin/templates` - Template management
- `/admin/templates/upload` - Upload new template
- `/admin/templates/:id/fields` - Field editor (drag-drop)
- `/admin/assignments` - Assignment management

### Components

**shadcn/ui components used:**
- Button, Input, Label, Select, Textarea
- Card, CardHeader, CardContent
- Dialog, AlertDialog
- Table, TableHeader, TableBody, TableRow, TableCell
- Tabs, TabsList, TabsTrigger, TabsContent
- Badge, Avatar
- Form, FormField, FormItem, FormLabel, FormControl, FormMessage
- Toast, Toaster
- Dropdown Menu, Context Menu
- Separator, Skeleton, Progress

**Custom components:**
- `EmployeeTable` - Sortable employee list
- `ProfileForm` - Multi-section employee profile editor
- `TemplateUpload` - PDF upload with drag-drop
- `FieldEditor` - Drag-drop field positioning on PDF
- `AssignmentDialog` - Create document assignment
- `ThreeTierAuth` - Authentication flow
- `SessionProvider` - Client-side session management

### State Management

**No global state library (Zustand, Redux, etc.).**

**Approach:**
- React Server Components for initial data
- Client Components with `useState` for local state
- React Hook Form for form state
- API client with `credentials: 'include'` for session cookies

### API Client

**Location:** `/frontend/src/lib/api.ts`

```typescript
class ApiClient {
  private baseUrl = 'https://hartzell.work/api';
  private csrfToken: string | null = null;

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>
    };

    // Add CSRF token for state-changing requests
    if (this.csrfToken && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method || '')) {
      headers['X-CSRF-Token'] = this.csrfToken;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include' // Send session cookie
    });

    const data = await response.json();

    // Update CSRF token if provided
    if (data.csrfToken) {
      this.setCsrfToken(data.csrfToken);
    }

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  }

  // Authentication methods
  async login(badgeNumber: string, dateOfBirth: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ badgeNumber, dateOfBirth })
    });
  }

  async verifySSN(ssnLast4: string, captchaToken: string) {
    return this.request('/auth/verify-ssn', {
      method: 'POST',
      body: JSON.stringify({ ssnLast4, captchaToken })
    });
  }

  // Employee methods
  async getProfile() {
    return this.request('/employee/profile');
  }

  async updateProfile(field: string, value: any) {
    return this.request('/employee/profile', {
      method: 'PUT',
      body: JSON.stringify({ field, value })
    });
  }

  // Admin methods
  async getEmployees() {
    return this.request('/admin/employees');
  }

  async updateEmployee(bitrixId: number, updates: Record<string, any>) {
    return this.request(`/admin/employee/${bitrixId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  // ... more methods
}

export const api = new ApiClient();
```

---

## Deployment

### Backend Deployment

**Command:**
```bash
cd /mnt/c/Users/Agent/Desktop/HR\ Center/cloudflare-app
wrangler deploy
```

**Process:**
1. Compiles TypeScript (`workers/index.ts`) to JavaScript
2. Bundles dependencies
3. Uploads to Cloudflare Workers
4. Updates route configuration
5. Returns deployment URL and version ID

**Post-Deployment:**
- Verify deployment: `wrangler deployments list`
- Monitor logs: `wrangler tail` or Cloudflare Dashboard → Workers → Logs
- Check routes: `curl -I https://hartzell.work/api/auth/session`

### Frontend Deployment

**Build Command:**
```bash
cd /mnt/c/Users/Agent/Desktop/HR\ Center/frontend
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build  # Generates static export to ./out
```

**Deploy Command:**
```bash
npx wrangler pages deploy out --project-name=hartzell-hr-frontend --commit-dirty=true
```

**Process:**
1. Builds Next.js app in static export mode
2. Generates HTML/CSS/JS to `out/` directory
3. Uploads `out/` to Cloudflare Pages
4. Publishes to production
5. Updates `app.hartzell.work` custom domain

**Post-Deployment:**
- Verify deployment: `npx wrangler pages deployment list --project-name=hartzell-hr-frontend`
- Check custom domain: `curl -I https://app.hartzell.work`
- Test login flow: Visit https://app.hartzell.work/login

### Environment Variables

**Backend (Set via Cloudflare Dashboard or `wrangler secret put`):**
```bash
wrangler secret put BITRIX24_WEBHOOK_URL
wrangler secret put SESSION_SECRET
wrangler secret put HCAPTCHA_SECRET
```

**Frontend (Set in Cloudflare Pages Dashboard):**
1. Go to: Pages → hartzell-hr-frontend → Settings → Environment variables
2. Add for both Production and Preview:
   - `NEXT_PUBLIC_API_URL` = `https://hartzell.work/api`
   - `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` = (hCaptcha site key)

### Database Migrations

**Initial setup (already completed):**
```bash
cd /mnt/c/Users/Agent/Desktop/HR\ Center/cloudflare-app
wrangler d1 create hartzell_hr_prod
wrangler d1 execute hartzell_hr_prod --file=workers/schema.sql
```

**Adding new tables/columns:**
1. Update `workers/schema.sql`
2. Run migration:
   ```bash
   wrangler d1 execute hartzell_hr_prod --command="ALTER TABLE ..."
   ```

### Monitoring

**Worker Logs:**
```bash
wrangler tail  # Live tail
wrangler tail --env production --format pretty
```

**Cloudflare Dashboard:**
- Workers: https://dash.cloudflare.com/b68132a02e46f8cc02bcf9c5745a72b9/workers
- Pages: https://dash.cloudflare.com/b68132a02e46f8cc02bcf9c5745a72b9/pages
- D1: https://dash.cloudflare.com/b68132a02e46f8cc02bcf9c5745a72b9/d1
- KV: https://dash.cloudflare.com/b68132a02e46f8cc02bcf9c5745a72b9/kv
- R2: https://dash.cloudflare.com/b68132a02e46f8cc02bcf9c5745a72b9/r2

**Performance Metrics:**
- Worker analytics: Cloudflare Dashboard → Workers → Analytics
- Pages analytics: Cloudflare Dashboard → Pages → Analytics
- Core Web Vitals: Pages → Analytics → Web Vitals

---

**End of Specification**

**Version:** 1.0 (As-Deployed)
**Last Updated:** October 12, 2025
**Production Status:** ✅ Live and operational
