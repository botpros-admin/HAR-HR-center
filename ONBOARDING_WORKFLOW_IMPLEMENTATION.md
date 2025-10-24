# Onboarding Workflow Implementation Plan

**Status**: 🚧 **IN PROGRESS**
**Started**: January 2025
**Estimated Completion**: TBD

---

## Table of Contents

1. [Overview](#overview)
2. [User Flow](#user-flow)
3. [Technical Architecture](#technical-architecture)
4. [Database Changes](#database-changes)
5. [Backend API](#backend-api)
6. [Frontend Pages](#frontend-pages)
7. [Email Templates](#email-templates)
8. [Security Considerations](#security-considerations)
9. [Testing Checklist](#testing-checklist)
10. [Implementation Checklist](#implementation-checklist)

---

## Overview

### Goal
Build a secure onboarding workflow that:
1. Sends offer letter email when candidate moves to "Offer" stage
2. Provides magic link to onboarding portal (7-day expiration, one-time use)
3. Collects sensitive employee data (SSN, bank info, W-4, emergency contacts, benefits)
4. Supports multiple direct deposit accounts with flexible splits (%, $ amount, or remainder)
5. Automatically assigns documents for signature after data collection
6. Moves employee to "Onboarding → In Progress" stage

### Key Features
- **Security**: Magic link authentication, HTTPS-only, no client-side storage of sensitive data
- **UX**: Pre-filled data from application (editable), dynamic bank account management
- **Automation**: Auto-assign documents (I-9, W-4, Handbook, etc.) after completion
- **Compliance**: Proper handling of PII, SSN encryption, audit trail

---

## User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. APPLICANT SUBMITS APPLICATION                               │
│    → Bitrix24: Applicants Pipeline → "Under Review"            │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. HR REVIEWS & MOVES TO "OFFER" STAGE                         │
│    → Trigger: Bitrix24 stage change to DT1054_18:SUCCESS       │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. AUTOMATION SENDS OFFER LETTER EMAIL                         │
│    ✉️  Subject: "Congratulations! Job Offer from Hartzell"     │
│    ✉️  Body: Offer details + magic link to onboarding portal   │
│    🔗 Link: https://app.hartzell.work/onboard?token=XYZ123     │
│    ⏰ Token expires in 7 days                                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. CANDIDATE CLICKS MAGIC LINK                                 │
│    → Validates token (not expired, not used, matches employee) │
│    → Creates temporary session                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. ONBOARDING PORTAL LOADS                                     │
│    📝 Pre-filled from application (name, email, phone, etc.)   │
│    📝 New fields to complete:                                  │
│       - Full SSN                                               │
│       - Date of Birth                                          │
│       - Emergency Contact                                      │
│       - Direct Deposit (multi-bank support)                    │
│       - W-4 Tax Withholding                                    │
│       - Benefits (Health, 401k, Life Insurance)                │
│       - Driver's License/Auto Insurance (if applicable)        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. EMPLOYEE SUBMITS ONBOARDING DATA                            │
│    → Validates all required fields                             │
│    → Saves to Bitrix24 (encrypted for SSN/bank info)           │
│    → Marks magic token as "used"                               │
│    → Moves to "Onboarding → In Progress" stage                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. AUTO-ASSIGN DOCUMENTS FOR SIGNATURE                         │
│    📄 I-9 Employment Eligibility Verification                   │
│    📄 W-4 Federal Withholding                                   │
│    📄 Employee Handbook Acknowledgment                          │
│    📄 Background Check Consent                                  │
│    📄 Drug Test Consent                                         │
│    📄 Direct Deposit Authorization                              │
│    → Email sent with document signing link                     │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. EMPLOYEE COMPLETES DOCUMENT SIGNATURES                      │
│    → Uses existing multi-signer system                         │
│    → Signed PDFs uploaded to Bitrix24                          │
│    → Moves to "Onboarding → Pending Review"                    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 9. HR REVIEWS & APPROVES                                       │
│    → Moves to "Onboarding → Ready for Day 1"                   │
│    → Employee gains access to employee portal                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technical Architecture

### Components

```
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│   Bitrix24 CRM   │ ───→ │  Cloudflare      │ ───→ │   Frontend       │
│   (HR Center)    │      │  Workers         │      │   (Next.js)      │
│                  │      │                  │      │                  │
│  • Applicants    │      │  • Offer email   │      │  • Magic link    │
│  • Onboarding    │      │  • Magic tokens  │      │  • Onboarding    │
│  • Employees     │      │  • Data validation│      │    form          │
└──────────────────┘      │  • Document      │      └──────────────────┘
                          │    assignment    │
                          └──────────────────┘
                                   ↕
                          ┌──────────────────┐
                          │   Cloudflare D1  │
                          │   (Database)     │
                          │                  │
                          │  • onboarding_   │
                          │    tokens        │
                          │  • sessions      │
                          └──────────────────┘
```

---

## Database Changes

### ✅ Status: NOT STARTED

### New Table: `onboarding_tokens`

```sql
CREATE TABLE IF NOT EXISTS onboarding_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT UNIQUE NOT NULL,
  bitrix_id INTEGER NOT NULL,
  employee_email TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER DEFAULT NULL,
  created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') * 1000 AS INTEGER)),

  INDEX idx_token (token),
  INDEX idx_bitrix_id (bitrix_id),
  INDEX idx_expires (expires_at)
);
```

**Purpose**: Store magic link tokens for onboarding access

**Fields**:
- `token`: 32-character random token (hex)
- `bitrix_id`: Bitrix24 employee ID
- `expires_at`: Timestamp (7 days from creation)
- `used_at`: When token was redeemed (NULL = not used)

---

## Backend API

### ✅ Status: NOT STARTED

### 1. Offer Email Automation

**File**: `/cloudflare-app/workers/index.ts` (stage change handler)

**Trigger**: When candidate moves to `DT1054_18:SUCCESS` (Offer stage)

**Implementation**:
```typescript
// In handleStageChange() function
if (stageId === STAGES.APPLICANTS_OFFER) {
  // 1. Generate magic token
  const token = crypto.randomUUID().replace(/-/g, '');
  const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days

  // 2. Store token in database
  await env.DB.prepare(`
    INSERT INTO onboarding_tokens (token, bitrix_id, employee_email, employee_name, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(token, itemId, employeeEmail, employeeName, expiresAt).run();

  // 3. Send offer letter email with magic link
  const onboardingUrl = `https://app.hartzell.work/onboard?token=${token}`;
  await sendEmail(env, {
    to: employeeEmail,
    toName: employeeName,
    subject: `Congratulations! Job Offer from Hartzell`,
    html: getOfferLetterEmail({ employeeName, position, onboardingUrl }),
    type: 'offer_letter',
    employeeId: itemId,
  });

  // 4. Log to Bitrix24 timeline
  await logToBitrixTimeline(env, itemId, 'Offer letter sent with onboarding link');
}
```

**Checklist**:
- [ ] Add APPLICANTS_OFFER stage constant (already exists)
- [ ] Create onboarding_tokens table
- [ ] Generate secure random token
- [ ] Store token with 7-day expiration
- [ ] Create offer letter email template
- [ ] Send email with magic link
- [ ] Add timeline log to Bitrix24

---

### 2. Validate Onboarding Token

**Endpoint**: `GET /api/onboard/validate-token`

**Purpose**: Verify magic link token is valid before showing onboarding form

**Request**:
```typescript
GET /api/onboard/validate-token?token=abc123
```

**Response**:
```typescript
// Success
{
  valid: true,
  employee: {
    id: 123,
    name: "John Doe",
    email: "john@example.com",
    position: "Technician",
    // Pre-filled data from application
    firstName: "John",
    lastName: "Doe",
    phone: "954-555-1234",
    address: { ... },
    education: { ... },
    // ... all application data
  },
  token: "abc123"
}

// Error
{
  valid: false,
  error: "Token expired" | "Token already used" | "Token not found"
}
```

**Implementation**:
```typescript
app.get('/api/onboard/validate-token', async (c) => {
  const token = c.req.query('token');

  if (!token) {
    return c.json({ valid: false, error: 'Token required' }, 400);
  }

  // 1. Find token in database
  const tokenRecord = await env.DB.prepare(`
    SELECT * FROM onboarding_tokens WHERE token = ?
  `).bind(token).first();

  if (!tokenRecord) {
    return c.json({ valid: false, error: 'Token not found' }, 404);
  }

  // 2. Check if expired
  if (Date.now() > tokenRecord.expires_at) {
    return c.json({ valid: false, error: 'Token expired' }, 400);
  }

  // 3. Check if already used
  if (tokenRecord.used_at) {
    return c.json({ valid: false, error: 'Token already used' }, 400);
  }

  // 4. Fetch employee data from Bitrix24
  const bitrix = new BitrixClient(env);
  const employee = await bitrix.getEmployee(tokenRecord.bitrix_id);

  if (!employee) {
    return c.json({ valid: false, error: 'Employee not found' }, 404);
  }

  // 5. Return employee data for pre-filling
  return c.json({
    valid: true,
    employee: {
      id: tokenRecord.bitrix_id,
      name: tokenRecord.employee_name,
      email: tokenRecord.employee_email,
      ...employee, // All Bitrix24 fields
    },
    token,
  });
});
```

**Checklist**:
- [ ] Create `/api/onboard/validate-token` endpoint
- [ ] Query onboarding_tokens table
- [ ] Validate token expiration
- [ ] Validate token not already used
- [ ] Fetch employee data from Bitrix24
- [ ] Return pre-fill data

---

### 3. Submit Onboarding Data

**Endpoint**: `POST /api/onboard/submit`

**Purpose**: Save onboarding data to Bitrix24 and trigger document assignment

**Request**:
```typescript
POST /api/onboard/submit
Content-Type: application/json

{
  token: "abc123",

  // Personal Info (editable from application)
  firstName: "John",
  middleName: "A",
  lastName: "Doe",
  email: "john@example.com",
  phone: "954-555-1234",
  address: {
    street: "123 Main St",
    city: "Pompano Beach",
    state: "FL",
    zip: "33069"
  },

  // NEW: Sensitive Personal Data
  ssn: "123-45-6789",
  dateOfBirth: "1990-01-15",
  gender: "male", // Enum: male, female, other
  citizenship: "us_citizen", // Enum ID
  maritalStatus: "single", // Enum ID

  // NEW: Emergency Contact
  emergencyContact: {
    name: "Jane Doe",
    phone: "954-555-9999",
    relationship: "Spouse"
  },

  // NEW: Direct Deposit (Multiple Accounts)
  directDeposit: [
    {
      accountType: "checking", // Enum: checking, savings
      bankName: "Bank of America",
      routingNumber: "026009593",
      accountNumber: "1234567890",
      accountHolderName: "John Doe",
      splitType: "percentage", // percentage | amount | remainder
      splitValue: 60, // 60% goes to this account
    },
    {
      accountType: "savings",
      bankName: "Wells Fargo",
      routingNumber: "121000248",
      accountNumber: "9876543210",
      accountHolderName: "John Doe",
      splitType: "remainder", // Gets remaining 40%
    }
  ],

  // NEW: W-4 Tax Withholding
  w4: {
    filingStatus: "single", // Enum: single, married, head_of_household
    exemptions: 1,
    additionalWithholding: 0,
    additionalStateWithholding: 0,
    dependents: [
      // If claiming dependents
      {
        name: "Child Doe",
        ssn: "987-65-4321",
        relationship: "Son"
      }
    ]
  },

  // NEW: Benefits
  benefits: {
    healthInsurance: "yes", // yes | no | waive
    has401k: "yes", // yes | no
    lifeBeneficiaries: "Jane Doe (Spouse) - 100%"
  },

  // NEW: Driver Info (if applicable)
  driverInfo: {
    hasLicense: true,
    licenseNumber: "D123-456-78-901-0",
    licenseExpiry: "2028-01-15",
    hasAutoInsurance: true,
    insuranceExpiry: "2026-01-15"
  }
}
```

**Response**:
```typescript
{
  success: true,
  message: "Onboarding data saved successfully",
  employeeId: 123,
  assignedDocuments: [
    {
      id: 1,
      title: "I-9 Employment Eligibility Verification",
      status: "pending"
    },
    {
      id: 2,
      title: "W-4 Federal Withholding",
      status: "pending"
    },
    // ... more documents
  ]
}
```

**Implementation**:
```typescript
app.post('/api/onboard/submit', async (c) => {
  const body = await c.req.json();
  const { token, ...data } = body;

  // 1. Validate token
  const tokenRecord = await env.DB.prepare(`
    SELECT * FROM onboarding_tokens WHERE token = ?
  `).bind(token).first();

  if (!tokenRecord || Date.now() > tokenRecord.expires_at || tokenRecord.used_at) {
    return c.json({ error: 'Invalid or expired token' }, 400);
  }

  // 2. Validate required fields
  const validation = validateOnboardingData(data);
  if (!validation.valid) {
    return c.json({ error: validation.errors }, 400);
  }

  // 3. Update Bitrix24 with all onboarding data
  const bitrix = new BitrixClient(env);

  // Convert direct deposit array to JSON string
  const directDepositJson = JSON.stringify(data.directDeposit);

  // Convert dependents to JSON
  const dependentsJson = JSON.stringify(data.w4.dependents || []);

  await bitrix.updateEmployee(tokenRecord.bitrix_id, {
    // Personal
    ufCrm6Ssn: data.ssn,
    ufCrm6PersonalBirthday: data.dateOfBirth,
    ufCrm6PersonalGender: data.gender, // Enum ID
    ufCrm6Citizenship: data.citizenship, // Enum ID
    ufCrm6MaritalStatus: data.maritalStatus, // Enum ID

    // Emergency Contact
    ufCrm6EmergencyContactName: data.emergencyContact.name,
    ufCrm6EmergencyContactPhone: data.emergencyContact.phone,
    ufCrm6Relationship: data.emergencyContact.relationship,

    // Direct Deposit (stored as JSON, admin will see in structured format)
    ufCrm6DirectDepositInfo: directDepositJson,

    // W-4 Tax Info
    ufCrm6TaxFilingStatus: data.w4.filingStatus, // Enum ID
    ufCrm6W4Exemptions: data.w4.exemptions.toString(),
    ufCrm6AdditionalFedWithhold: data.w4.additionalWithholding.toString(),
    ufCrm6AdditionalStateWithhold: data.w4.additionalStateWithholding.toString(),
    ufCrm6DependentsInfo: dependentsJson,

    // Benefits
    ufCrm6HealthInsurance: data.benefits.healthInsurance === 'yes' ? 'Y' : 'N',
    ufCrm_6_401K_ENROLLMENT: data.benefits.has401k === 'yes' ? 'Y' : 'N',
    ufCrm6LifeBeneficiaries: data.benefits.lifeBeneficiaries,

    // Driver Info
    ufCrm_6_UF_USR_1747966315398_EXPIRY: data.driverInfo?.licenseExpiry,
    ufCrm_6_UF_USR_1737120327618_EXPIRY: data.driverInfo?.insuranceExpiry,
  });

  // 4. Move to "Onboarding → In Progress" stage
  await bitrix.updateStage(tokenRecord.bitrix_id, {
    categoryId: 10, // Onboarding
    stageId: 'DT1054_10:PREPARATION' // In Progress
  });

  // 5. Mark token as used
  await env.DB.prepare(`
    UPDATE onboarding_tokens SET used_at = ? WHERE token = ?
  `).bind(Date.now(), token).run();

  // 6. Auto-assign documents for signature
  const documents = await autoAssignOnboardingDocuments(env, tokenRecord.bitrix_id);

  // 7. Send confirmation email
  await sendEmail(env, {
    to: tokenRecord.employee_email,
    toName: tokenRecord.employee_name,
    subject: 'Next Steps: Complete Your Documents',
    html: getDocumentSigningEmail({
      employeeName: tokenRecord.employee_name,
      documentCount: documents.length
    }),
    type: 'document_signing',
    employeeId: tokenRecord.bitrix_id,
  });

  return c.json({
    success: true,
    message: 'Onboarding data saved successfully',
    employeeId: tokenRecord.bitrix_id,
    assignedDocuments: documents,
  });
});
```

**Checklist**:
- [ ] Create `/api/onboard/submit` endpoint
- [ ] Validate token
- [ ] Validate all required fields
- [ ] Map direct deposit array to JSON
- [ ] Map W-4 data to Bitrix24 fields
- [ ] Update employee in Bitrix24
- [ ] Move to "Onboarding → In Progress"
- [ ] Mark token as used
- [ ] Auto-assign documents
- [ ] Send confirmation email

---

### 4. Auto-Assign Onboarding Documents

**Function**: `autoAssignOnboardingDocuments()`

**Purpose**: Automatically create document assignments after onboarding data is submitted

**Implementation**:
```typescript
async function autoAssignOnboardingDocuments(
  env: Env,
  employeeId: number
): Promise<Array<{ id: number; title: string; status: string }>> {
  const documents = [];

  // Document templates to assign (based on category names)
  const templatesToAssign = [
    'I-9',
    'W-4',
    'Handbook',
    'Background Check',
    'Drug Test',
    'Direct Deposit',
    'NDA',
  ];

  for (const category of templatesToAssign) {
    // Find template by category
    const template = await env.DB.prepare(`
      SELECT id, title FROM document_templates WHERE category = ? LIMIT 1
    `).bind(category).first();

    if (!template) {
      console.warn(`Template not found for category: ${category}`);
      continue;
    }

    // Create assignment
    const result = await env.DB.prepare(`
      INSERT INTO document_assignments (
        employee_id, template_id, status, assigned_at, priority
      ) VALUES (?, ?, 'pending', ?, 'high')
    `).bind(
      employeeId,
      template.id,
      Date.now()
    ).run();

    documents.push({
      id: result.meta.last_row_id,
      title: template.title,
      status: 'pending',
    });
  }

  return documents;
}
```

**Checklist**:
- [ ] Create autoAssignOnboardingDocuments() function
- [ ] Query document templates by category
- [ ] Create document assignments
- [ ] Return assigned documents list
- [ ] Handle missing templates gracefully

---

## Frontend Pages

### ✅ Status: NOT STARTED

### 1. Onboarding Portal Page

**File**: `/frontend/src/app/onboard/page.tsx`

**URL**: `https://app.hartzell.work/onboard?token=abc123`

**Features**:
- Validate magic link token on load
- Pre-fill data from application
- Multi-step form with progress indicator
- Direct deposit multi-account manager
- Security messaging for sensitive data
- Submit to backend

**Components Needed**:
1. **Token Validator** - Verifies token before showing form
2. **Progress Stepper** - Shows steps: Personal → Emergency Contact → Tax → Direct Deposit → Benefits
3. **Direct Deposit Manager** - Add/remove bank accounts, configure splits
4. **SSN Input** - Masked input with validation
5. **Date of Birth Picker** - Calendar input
6. **W-4 Form** - Tax withholding configuration
7. **Benefits Selector** - Health, 401k, life insurance

**Checklist**:
- [ ] Create `/onboard` page
- [ ] Add token validation on mount
- [ ] Fetch and pre-fill employee data
- [ ] Build multi-step form UI
- [ ] Add progress stepper
- [ ] Create direct deposit manager component
- [ ] Add SSN masked input
- [ ] Add DOB date picker
- [ ] Create W-4 form section
- [ ] Create benefits selection section
- [ ] Add form validation
- [ ] Handle submit to API
- [ ] Show success confirmation
- [ ] Redirect to document signing

---

### 2. Direct Deposit Manager Component

**File**: `/frontend/src/components/DirectDepositManager.tsx`

**Features**:
- Add up to 3 bank accounts
- For each account:
  - Account type (Checking/Savings)
  - Bank name
  - Routing number (9 digits)
  - Account number
  - Account holder name
  - Split type: Percentage, Fixed Amount, or Remainder
- Validation:
  - Percentages must sum to 100%
  - Must have exactly one "Remainder" account if using amounts
  - Routing number must be valid

**UI Mockup**:
```
┌─────────────────────────────────────────────────────────────────┐
│ Direct Deposit Setup                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Account 1                                                        │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ Account Type: [Checking ▼]                               │   │
│ │ Bank Name: [Bank of America___________________________]  │   │
│ │ Routing Number: [026009593]                              │   │
│ │ Account Number: [••••••••7890]                           │   │
│ │ Account Holder: [John Doe______________________________] │   │
│ │                                                           │   │
│ │ Deposit Amount:                                           │   │
│ │ ○ Percentage: [60] %                                      │   │
│ │ ○ Fixed Amount: $[_____]                                  │   │
│ │ ○ Remainder (all remaining funds)                         │   │
│ │                                                           │   │
│ │ [Remove Account]                                          │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│ Account 2                                                        │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ Account Type: [Savings ▼]                                │   │
│ │ Bank Name: [Wells Fargo_______________________________]  │   │
│ │ Routing Number: [121000248]                              │   │
│ │ Account Number: [••••••••3210]                           │   │
│ │ Account Holder: [John Doe______________________________] │   │
│ │                                                           │   │
│ │ Deposit Amount:                                           │   │
│ │ ○ Percentage: [__] %                                      │   │
│ │ ○ Fixed Amount: $[_____]                                  │   │
│ │ ● Remainder (all remaining funds)                         │   │
│ │                                                           │   │
│ │ [Remove Account]                                          │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│ [+ Add Another Account] (max 3)                                 │
│                                                                  │
│ Total Allocation: 100% ✓                                        │
└─────────────────────────────────────────────────────────────────┘
```

**Validation Logic**:
```typescript
function validateDirectDeposit(accounts: DirectDepositAccount[]): ValidationResult {
  // Must have at least 1 account
  if (accounts.length === 0) {
    return { valid: false, error: 'At least one account required' };
  }

  // Validate each account has required fields
  for (const account of accounts) {
    if (!account.bankName || !account.routingNumber || !account.accountNumber) {
      return { valid: false, error: 'All account fields required' };
    }

    // Validate routing number (9 digits)
    if (!/^\d{9}$/.test(account.routingNumber)) {
      return { valid: false, error: 'Routing number must be 9 digits' };
    }
  }

  // Count split types
  const percentages = accounts.filter(a => a.splitType === 'percentage');
  const amounts = accounts.filter(a => a.splitType === 'amount');
  const remainders = accounts.filter(a => a.splitType === 'remainder');

  // Must have exactly one remainder OR all percentages must sum to 100%
  if (remainders.length === 0) {
    // No remainder - must use percentages that sum to 100%
    const totalPercentage = percentages.reduce((sum, a) => sum + (a.splitValue || 0), 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return { valid: false, error: 'Percentages must add up to 100%' };
    }
  } else if (remainders.length > 1) {
    return { valid: false, error: 'Only one account can be set to Remainder' };
  }

  return { valid: true };
}
```

**Checklist**:
- [ ] Create DirectDepositManager component
- [ ] Add bank account form fields
- [ ] Support adding/removing accounts (max 3)
- [ ] Add split type radio buttons
- [ ] Implement percentage validation
- [ ] Implement remainder account logic
- [ ] Show real-time allocation total
- [ ] Mask account numbers (show last 4 digits)
- [ ] Validate routing numbers
- [ ] Add visual feedback for validation errors

---

## Email Templates

### ✅ Status: NOT STARTED

### 1. Offer Letter Email

**File**: `/cloudflare-app/workers/lib/email.ts`

**Function**: `getOfferLetterEmail()`

**Content**:
```
Subject: Congratulations! Job Offer from Hartzell Companies

Dear [Name],

We are pleased to offer you the position of [Position] at Hartzell Companies!

Your starting salary will be $[Salary] per year, and your expected start date is [Start Date].

NEXT STEPS - Complete Your Onboarding

To finalize your employment, please complete your onboarding paperwork by clicking the secure link below:

[Complete Onboarding]
https://app.hartzell.work/onboard?token=XYZ

This link will expire in 7 days. You'll need approximately 15-20 minutes to complete the process.

What You'll Need:
- Social Security Number
- Bank account information for direct deposit
- Emergency contact information
- Driver's license (if applicable)

Your onboarding will include:
✓ Personal information verification
✓ Tax withholding (W-4) setup
✓ Direct deposit enrollment
✓ Benefits selection
✓ Required document signatures (I-9, handbook, etc.)

After completing your onboarding, you'll receive access to sign your employment documents electronically.

If you have any questions, please don't hesitate to reach out to our HR team at hr@hartzell.com or (954) 957-9761.

We're excited to have you join the Hartzell team!

Best regards,
Hartzell HR Team
```

**Checklist**:
- [ ] Create getOfferLetterEmail() function
- [ ] Add position, salary, start date variables
- [ ] Include secure onboarding link
- [ ] Add "what you'll need" checklist
- [ ] Professional HTML formatting
- [ ] Match Hartzell branding

---

### 2. Document Signing Email

**File**: `/cloudflare-app/workers/lib/email.ts`

**Function**: `getDocumentSigningEmail()`

**Content**:
```
Subject: Action Required: Sign Your Employment Documents

Dear [Name],

Thank you for completing your onboarding information!

The next step is to review and sign your employment documents. You have [X] documents waiting for your signature:

• I-9 Employment Eligibility Verification
• W-4 Federal Withholding
• Employee Handbook Acknowledgment
• Background Check Authorization
• Drug Test Consent
• Direct Deposit Authorization

[Sign Documents Now]
https://app.hartzell.work/employee/documents

This should take approximately 10 minutes to complete. All signatures are electronic and legally binding.

If you have any questions about the documents, please contact HR at hr@hartzell.com.

Best regards,
Hartzell HR Team
```

**Checklist**:
- [ ] Create getDocumentSigningEmail() function
- [ ] List assigned documents
- [ ] Include document portal link
- [ ] Professional HTML formatting

---

## Security Considerations

### ✅ Status: NOT STARTED

### 1. Magic Link Security

**Implemented**:
- [ ] Cryptographically secure random token (32 bytes)
- [ ] 7-day expiration
- [ ] One-time use (marked as used after redemption)
- [ ] HTTPS-only (enforced by Cloudflare)
- [ ] No token in logs

**Additional Protections**:
- [ ] Rate limiting on token validation endpoint (max 5 attempts per IP per minute)
- [ ] Token invalidation on employee deletion
- [ ] Audit trail of token usage

---

### 2. Sensitive Data Handling

**SSN & Bank Account Numbers**:
- [ ] HTTPS encryption in transit
- [ ] No client-side storage (no localStorage, sessionStorage)
- [ ] Server-side validation
- [ ] Stored in Bitrix24 (their encryption at rest)
- [ ] Masked display in admin UI (show last 4 digits only)

**Session Management**:
- [ ] Temporary session created from magic link
- [ ] Session expires after form submission
- [ ] No persistent authentication (one-time access)

---

### 3. Input Validation

**Backend Validation**:
- [ ] SSN format: XXX-XX-XXXX
- [ ] Routing number: 9 digits
- [ ] Account number: alphanumeric, max 17 chars
- [ ] Email: valid format
- [ ] Phone: 10 digits
- [ ] Required field checks

**Frontend Validation**:
- [ ] Real-time feedback
- [ ] Format masking (SSN, phone, routing number)
- [ ] Match backend validation rules

---

## Testing Checklist

### ✅ Status: NOT STARTED

### End-to-End Flow

- [ ] Create test candidate in Bitrix24
- [ ] Move candidate to "Offer" stage
- [ ] Verify offer email sent with magic link
- [ ] Click magic link
- [ ] Verify token validation works
- [ ] Complete onboarding form
- [ ] Verify data saved to Bitrix24
- [ ] Verify moved to "Onboarding → In Progress"
- [ ] Verify documents auto-assigned
- [ ] Verify document signing email sent
- [ ] Sign all documents
- [ ] Verify PDFs uploaded to Bitrix24

### Edge Cases

- [ ] Expired token - shows error
- [ ] Already used token - shows error
- [ ] Invalid token - shows error
- [ ] Direct deposit: 2 percentages = 100% ✓
- [ ] Direct deposit: 1 amount + 1 remainder ✓
- [ ] Direct deposit: Invalid routing number ✗
- [ ] SSN already exists in system (duplicate check)
- [ ] Form submission with missing required fields ✗
- [ ] Network error during submission - retry logic

---

## Implementation Checklist

### Phase 1: Database & Backend Foundation
- [ ] Create `onboarding_tokens` table migration
- [ ] Deploy migration to production D1
- [ ] Add offer email automation to stage change handler
- [ ] Create `GET /api/onboard/validate-token` endpoint
- [ ] Create `POST /api/onboard/submit` endpoint
- [ ] Create `autoAssignOnboardingDocuments()` function
- [ ] Test backend endpoints with Postman/curl

### Phase 2: Email Templates
- [ ] Create `getOfferLetterEmail()` template
- [ ] Create `getDocumentSigningEmail()` template
- [ ] Test email rendering
- [ ] Verify email delivery

### Phase 3: Frontend - Onboarding Portal
- [ ] Create `/onboard` page route
- [ ] Add token validation on page load
- [ ] Build multi-step form UI
- [ ] Add progress stepper component
- [ ] Create Direct Deposit Manager component
- [ ] Add SSN masked input component
- [ ] Add W-4 tax form section
- [ ] Add benefits selection section
- [ ] Implement form validation
- [ ] Connect to backend API
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add success confirmation page

### Phase 4: Testing & Deployment
- [ ] Test complete flow end-to-end
- [ ] Test all edge cases
- [ ] Security audit
- [ ] Deploy backend to production
- [ ] Deploy frontend to production
- [ ] Update documentation
- [ ] Train HR staff

---

## Current Status

**Last Updated**: [DATE]

**Completed**: 0 / 50 tasks (0%)

**In Progress**:
- Analyzing existing signature system
- Creating comprehensive plan

**Blocked**: None

**Next Steps**:
1. Get user approval on implementation plan
2. Begin Phase 1: Database & Backend Foundation
3. Create onboarding_tokens table

---

## Notes & Decisions

### Direct Deposit Split Logic

**Decision**: Support 3 split types for maximum flexibility:
1. **Percentage** - Specify percentage (e.g., 60% to checking)
2. **Fixed Amount** - Specify dollar amount (e.g., $500 to savings)
3. **Remainder** - Gets all remaining funds after other allocations

**Validation Rules**:
- If using percentages only: Must sum to 100%
- If using fixed amounts: Must have exactly one "Remainder" account
- Can mix percentages and amounts, but must have one "Remainder"
- Maximum 3 accounts

### Document Auto-Assignment

**Decision**: Auto-assign standard onboarding documents after form submission:
- I-9 Employment Eligibility Verification
- W-4 Federal Withholding
- Employee Handbook Acknowledgment
- Background Check Authorization
- Drug Test Consent
- Direct Deposit Authorization
- NDA

HR can manually assign additional documents if needed.

### Magic Link Expiration

**Decision**: 7-day expiration provides reasonable time without security risk.
- If expired, HR can manually re-send offer via admin panel (future feature)

---

**End of Implementation Plan**
