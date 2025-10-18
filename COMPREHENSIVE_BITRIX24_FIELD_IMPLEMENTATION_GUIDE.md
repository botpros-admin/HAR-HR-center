# Comprehensive Bitrix24 Field Implementation Guide

**Document Version:** 1.0
**Date Created:** 2025-10-14
**Status:** Ready for Implementation
**Estimated Completion Time:** 4-6 hours

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Implementation Status](#current-implementation-status)
3. [Architecture Overview](#architecture-overview)
4. [Prerequisites](#prerequisites)
5. [Implementation Roadmap](#implementation-roadmap)
6. [Detailed Field-by-Field Implementation](#detailed-field-by-field-implementation)
7. [Code Examples](#code-examples)
8. [Testing Procedures](#testing-procedures)
9. [Troubleshooting Guide](#troubleshooting-guide)
10. [Maintenance Guidelines](#maintenance-guidelines)

---

## Executive Summary

### What Was Completed

The Hartzell HR Center now has **comprehensive backend support** for all 100+ Bitrix24 employee fields. The following infrastructure is complete and production-ready:

✅ **Backend (Cloudflare Workers):**
- `BitrixEmployee` TypeScript interface with all 100+ fields properly typed
- Complete field mapping in admin routes (camelCase frontend ↔ ufCrm6* Bitrix)
- Full validation schema with Zod for all fields
- Audit logging for all employee updates
- Eventual consistency handling for Bitrix24 API

✅ **Frontend (Next.js 14):**
- Comprehensive field options constants (`bitrixFieldOptions.ts`) with all select/multiselect mappings
- `FileField` component for displaying file attachment status
- `MultiSelectField` component for equipment, software access, etc.
- Existing field components (Field, PhoneField, SSNField, TagField)

✅ **Data Flow:**
- Bitrix24 API → Workers Cache → D1 Database → Frontend
- All 100+ fields are fetched and cached
- Updates flow back to Bitrix24 with proper field mapping

### What Remains

The **frontend employee detail page** (`/admin/employees/detail/page.tsx`) needs to display the missing fields. The backend already returns ALL the data - we just need to add the UI fields.

**Critical Missing Fields Count by Section:**
- Personal Information: 3 fields (Gender as select, Profile Photo, proper Marital Status)
- Employment Details: 3 fields (Pay Rate, Sales Territory select, Project Category select)
- Tax & Payroll: 5 fields (W-4 Exemptions, file fields)
- Banking: 1 field (Direct Deposit Authorization file)
- Training & Compliance: 9 fields (all status selects + file fields)
- IT & Equipment: 8 fields (multiselects, status fields, VPN/Remote checkboxes)
- Vehicle & Licensing: 4 fields (Driver's License file + expiry, Auto Insurance file + expiry)

**Total: ~33 missing field displays** (frontend only - backend is complete)

---

## Current Implementation Status

### ✅ Fully Implemented Sections

**Personal Information:**
- ✅ First Name, Middle Name, Last Name, Preferred Name
- ✅ Date of Birth
- ⚠️ Gender (exists but using wrong options)
- ⚠️ Marital Status (exists but using wrong options)
- ⚠️ Citizenship Status (exists but using wrong options)
- ✅ Personal Email (multi), Personal Phone (multi)
- ✅ Work Cell Phone, Office Phone, Office Extension
- ✅ Address Line 1, Address Line 2, City, State, ZIP Code
- ❌ Profile Photo (file field - missing)

**Emergency Contact:**
- ✅ Contact Name, Contact Phone, Relationship (all 3 fields complete)

**Employment Details:**
- ✅ Badge Number, Position, Subsidiary
- ✅ Status, Hire Date, Employment Type, Shift
- ❌ Pay Rate/Salary (missing)
- ✅ Benefits Eligible (checkbox)
- ❌ Sales Territory (missing - should be select)
- ❌ Project Category (missing - should be select)
- ✅ WC Code

**Citizenship & Work Authorization:**
- ✅ Citizenship Status (but wrong options)
- ❌ Work Visa/Permit file (missing)
- ✅ Visa Expiry date

**Compensation & Benefits:**
- ✅ SSN (with masking)
- ✅ PTO Days
- ✅ Health Insurance (stored as file ID but displayed as text)
- ✅ 401(k) Enrollment
- ✅ Life Insurance Beneficiaries

**Tax & Payroll:**
- ✅ Payment Method (needs proper select options)
- ✅ Tax Filing Status (needs proper select options)
- ❌ W-4 Exemptions (missing)
- ✅ Additional Federal Withholding
- ✅ Additional State Withholding
- ❌ W-4 Form files (missing)
- ❌ I-9 Form files (missing)
- ❌ Multiple Jobs Worksheet file (missing)
- ❌ Deductions Worksheet file (missing)

**Banking & Direct Deposit:**
- ✅ Bank Name, Account Holder Name, Account Type, Routing Number, Account Number
- ❌ Direct Deposit Authorization file (missing)

**Dependents & Beneficiaries:**
- ✅ Dependent Names, Dependent SSNs, Dependent Relationships (all as TagField)

**Education & Skills:**
- ✅ Education Level, School, Graduation Year, Fields of Study
- ✅ Skills (TagField), Certifications (should be files)
- ✅ Skills Level

**Training & Compliance:**
- ❌ Required Training Status (missing select with 4 options)
- ❌ Safety Training Status (missing select with 4 options)
- ❌ Compliance Training Status (missing select with 4 options)
- ❌ Training Completion Date (missing)
- ❌ Next Training Due Date (missing)
- ❌ Training Notes (missing)
- ❌ Required Training Completion files (missing)
- ❌ Professional Certifications files (missing)
- ❌ Training Records files (missing)
- ❌ Skills Assessment file (missing)
- ❌ Training Documents files (missing)

**IT & Equipment:**
- ✅ Software Experience (text field)
- ✅ Equipment Assigned (TagField, should be multiselect with 7 options)
- ❌ Equipment Status (missing select with 4 options)
- ❌ Equipment Return Tracking (missing text field)
- ❌ Software Access (missing multiselect with 6 options)
- ✅ Access Permissions (TagField)
- ❌ Access Level (missing select with 4 options)
- ❌ Security Clearance (missing select with 4 options)
- ❌ Network Status (missing select with 4 options)
- ❌ VPN Access (missing checkbox)
- ❌ Remote Access Approved (missing checkbox)

**Vehicle & Licensing:**
- ❌ Driver's License file (missing)
- ❌ Driver's License Expiry (missing date field)
- ❌ Auto Insurance file (missing)
- ❌ Auto Insurance Expiry (missing date field)

**Performance & Reviews:**
- ✅ Performance Review Dates (TagField)
- ✅ Termination Date
- ✅ Rehire Eligible (checkbox)

**Additional Information:**
- ✅ Notes (textarea in separate section)

---

## Architecture Overview

### Data Flow Diagram

```
┌─────────────┐
│  Bitrix24   │
│  CRM API    │
└──────┬──────┘
       │
       │ (crm.item.get / crm.item.list)
       ↓
┌─────────────────────────────────────────────┐
│  Cloudflare Workers                         │
│  (/api/admin/employee/:bitrixId)            │
│                                             │
│  1. BitrixClient.getEmployee(bitrixId)     │
│  2. Map ufCrm6* fields to camelCase        │
│  3. Cache in KV (24 hours)                 │
│  4. Store in D1 (employee_cache table)     │
└─────────────┬───────────────────────────────┘
              │
              │ (JSON Response with ALL fields)
              ↓
┌─────────────────────────────────────────────┐
│  Next.js Frontend                           │
│  (/admin/employees/detail?id=123)           │
│                                             │
│  1. TanStack Query fetches data             │
│  2. Maps to currentData state               │
│  3. Renders field components                │
│  4. User edits → PATCH request              │
└─────────────┬───────────────────────────────┘
              │
              │ (PATCH /api/admin/employee/:bitrixId)
              ↓
┌─────────────────────────────────────────────┐
│  Cloudflare Workers                         │
│  (PATCH handler with validation)            │
│                                             │
│  1. Validate with Zod schema               │
│  2. Map camelCase → ufCrm6* fields         │
│  3. BitrixClient.updateEmployee()          │
│  4. Wait for eventual consistency          │
│  5. Refetch and update all caches          │
│  6. Log in audit_logs table                │
└─────────────┬───────────────────────────────┘
              │
              │ (crm.item.update)
              ↓
┌─────────────┐
│  Bitrix24   │
│  Updated    │
└─────────────┘
```

### File Structure

```
HR Center/
├── cloudflare-app/
│   └── workers/
│       ├── types.ts                    ✅ BitrixEmployee interface (ALL fields)
│       ├── lib/
│       │   └── bitrix.ts              ✅ Bitrix API client
│       └── routes/
│           └── admin.ts               ✅ FIELD_MAP, validation schema, PATCH endpoint
│
├── frontend/
│   └── src/
│       ├── lib/
│       │   └── bitrixFieldOptions.ts  ✅ All select/multiselect option mappings
│       ├── components/
│       │   ├── FileField.tsx          ✅ File display component
│       │   ├── MultiSelectField.tsx   ✅ Multiselect component
│       │   └── TagInput.tsx           ✅ Existing multi-text component
│       └── app/
│           └── admin/
│               └── employees/
│                   └── detail/
│                       └── page.tsx   ⚠️ NEEDS UPDATES (33 fields to add)
```

### Field Type Mapping

| Bitrix24 Type | Frontend Component | Example Field |
|---------------|-------------------|---------------|
| `text` | `Field` | First Name, Badge Number |
| `date` | `Field type="date"` | Hire Date, DOB |
| `select` (enum) | `Field type="select"` + `options` | Gender, Marital Status, Employment Type |
| `multiselect` | `MultiSelectField` + `options` | Equipment Assigned, Software Access |
| `checkbox` | `Field type="checkbox"` | Benefits Eligible, VPN Access |
| `file` | `FileField` | Driver's License, W-4 Form |
| `file[]` (multi) | `FileField` | Drug Test Results, Training Records |
| `text[]` (multi) | `TagField` | Personal Email, Dependent Names |
| `number` | `Field` | WC Code |
| `textarea` | `Field type="textarea"` | Training Notes, Additional Info |

---

## Prerequisites

Before starting implementation, ensure you have:

1. ✅ Backend is deployed and running on Cloudflare Workers
2. ✅ Frontend development server is running (`npm run dev`)
3. ✅ Access to Bitrix24 to verify field IDs and option values
4. ✅ Admin session with `hr_admin` role to test employee updates
5. ✅ Basic understanding of React, TypeScript, and Next.js 14

**Development Tools:**
- VS Code or your preferred IDE
- Chrome/Edge DevTools for debugging
- Postman or similar for API testing (optional)

**Key Files You'll Edit:**
1. `/mnt/c/Users/Agent/Desktop/HR Center/frontend/src/app/admin/employees/detail/page.tsx` (PRIMARY)
2. `/mnt/c/Users/Agent/Desktop/HR Center/frontend/src/lib/bitrixFieldOptions.ts` (reference only)
3. `/mnt/c/Users/Agent/Desktop/HR Center/cloudflare-app/workers/routes/admin.ts` (reference only)

---

## Implementation Roadmap

### Phase 1: Import New Components and Options (15 minutes)

**Goal:** Add necessary imports to the detail page

**File:** `frontend/src/app/admin/employees/detail/page.tsx`

**Actions:**
1. Add FileField and MultiSelectField imports at the top
2. Import all option constants from bitrixFieldOptions
3. Import Lucide icons if needed

### Phase 2: Fix Existing Fields with Wrong Options (30 minutes)

**Goal:** Update Gender, Marital Status, Citizenship, etc. to use correct Bitrix option mappings

**Fields to Fix:**
- Gender (line ~1373)
- Marital Status (line ~1390)
- Citizenship Status (line ~1560)
- Payment Method (line ~1599)
- Tax Filing Status (line ~1610)
- Subsidiary (line ~1443)
- Bank Account Type (line ~1645)

### Phase 3: Add Missing Employment Fields (20 minutes)

**Goal:** Add Pay Rate, Sales Territory, Project Category to Employment Details section

**Fields to Add:**
- Pay Rate (text field after Benefits Eligible)
- Sales Territory (select with 2 options: Northern, Southern)
- Project Category (select with 4 options: Commercial, Community, Residential, Public Sector)

### Phase 4: Add Training & Compliance Fields (45 minutes)

**Goal:** Complete the Training & Compliance section with all status selects and file fields

**Fields to Add:**
- Required Training Status (select with 4 options)
- Safety Training Status (select with 4 options)
- Compliance Training Status (select with 4 options)
- Training Completion Date (date field)
- Next Training Due (date field)
- Training Notes (textarea)
- Required Training Completion (FileField multi)
- Professional Certifications (FileField multi)
- Training Records (FileField multi)
- Skills Assessment (FileField single)
- Training Documents (FileField multi)

### Phase 5: Add IT & Equipment Fields (40 minutes)

**Goal:** Complete the IT & Equipment section with multiselects and status fields

**Fields to Add:**
- Equipment Assigned (change from TagField to MultiSelectField with 7 options)
- Equipment Status (select with 4 options)
- Equipment Return Tracking (text field)
- Software Access (MultiSelectField with 6 options)
- Access Level (select with 4 options)
- Security Clearance (select with 4 options)
- Network Status (select with 4 options)
- VPN Access (checkbox)
- Remote Access Approved (checkbox)

### Phase 6: Add Vehicle & Licensing Fields (20 minutes)

**Goal:** Complete the Vehicle & Licensing section

**Fields to Add:**
- Driver's License (FileField)
- Driver's License Expiry (date field)
- Auto Insurance (FileField)
- Auto Insurance Expiry (date field)

### Phase 7: Add Tax & Payroll File Fields (20 minutes)

**Goal:** Add file fields to Tax & Payroll section

**Fields to Add:**
- W-4 Exemptions (text field)
- W-4 Form (FileField multi)
- I-9 Form (FileField multi)
- Multiple Jobs Worksheet (FileField)
- Deductions Worksheet (FileField)

### Phase 8: Add Banking File Field (10 minutes)

**Goal:** Add Direct Deposit Authorization to Banking section

**Fields to Add:**
- Direct Deposit Authorization (FileField)

### Phase 9: Add Personal Info File Field (10 minutes)

**Goal:** Add Profile Photo to Personal Information section

**Fields to Add:**
- Profile Photo (FileField)

### Phase 10: Update Validation Schema (20 minutes)

**Goal:** Add validation rules for all new fields in the employee detail page

**File:** `frontend/src/app/admin/employees/detail/page.tsx`

**Actions:**
Update the `employeeSchema` Zod object to include validation for all new fields

### Phase 11: Testing & Verification (60 minutes)

**Goal:** Thoroughly test all new fields

**Test Cases:**
1. View mode displays all fields correctly
2. Edit mode allows editing all fields
3. Select fields show correct options
4. MultiSelect fields allow multiple selections
5. File fields display attachment status
6. Validation prevents invalid data
7. Updates persist to Bitrix24
8. Audit logs track all changes

### Phase 12: Build & Deploy (15 minutes)

**Goal:** Deploy to production

**Actions:**
1. Build frontend: `npm run build`
2. Deploy to Cloudflare Pages
3. Verify on live site
4. Test with real Bitrix24 data

**Total Estimated Time:** 4-6 hours (depending on familiarity with codebase)

---

## Detailed Field-by-Field Implementation

### Section: Personal Information

#### Fix Gender Field (Currently Wrong Options)

**Current Location:** Line ~1373 in `page.tsx`

**Current Code:**
```typescript
<Field
  label="Gender"
  value={currentData.gender}
  name="gender"
  type="select"
  options={GENDER_OPTIONS}  // Using wrong constant
  validationErrors={validationErrors}
  isEditing={isEditing}
  // ... props
/>
```

**Problem:** The `GENDER_OPTIONS` constant doesn't match Bitrix24's option values.

**Solution:** Import and use correct options from `bitrixFieldOptions.ts`

**Updated Code:**
```typescript
import {
  GENDER_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  CITIZENSHIP_OPTIONS,
  // ... other imports
} from '@/lib/bitrixFieldOptions';

// In the Gender field:
<Field
  label="Gender"
  value={currentData.gender}
  name="gender"
  type="select"
  options={GENDER_OPTIONS}  // Now correct: '' = Select Gender, 2002 = Female, 2003 = Male
  validationErrors={validationErrors}
  isEditing={isEditing}
  showSSN={showSSN}
  showBankAccount={showBankAccount}
  showBankRouting={showBankRouting}
  setShowSSN={setShowSSN}
  setShowBankAccount={setShowBankAccount}
  setShowBankRouting={setShowBankRouting}
  handleFieldChange={handleFieldChange}
/>
```

**Bitrix Field Mapping:**
- Frontend field: `gender`
- Bitrix field: `ufCrm6PersonalGender`
- Options: `''` = Select Gender, `'2002'` = Female, `'2003'` = Male

**Validation Rule:**
```typescript
gender: z.string().optional(),
```

---

#### Add Profile Photo Field

**Location:** After ZIP Code field (line ~1425)

**Bitrix Field:** `ufCrm6ProfilePhoto` (file ID)

**Code to Add:**
```typescript
import FileField from '@/components/FileField';

// After ZIP Code field:
<FileField
  label="Profile Photo"
  value={currentData.profilePhoto}
  name="profilePhoto"
  isEditing={isEditing}
/>
```

**Data Mapping in getEmployee query:**
```typescript
profilePhoto: employee.ufCrm6ProfilePhoto || null,
```

**Validation Rule:**
```typescript
profilePhoto: z.union([z.string(), z.number()]).optional(),
```

**Notes:**
- This is display-only for now (shows "1 file attached" or "No file")
- Future enhancement: Add upload/download functionality
- File management will require additional R2 bucket integration

---

### Section: Employment Details

#### Add Pay Rate Field

**Location:** After Benefits Eligible checkbox (line ~1502)

**Bitrix Field:** `ufCrm6PayRate` (text/number stored as string)

**Code to Add:**
```typescript
<Field
  label="Pay Rate/Salary"
  value={currentData.payRate}
  name="payRate"
  validationErrors={validationErrors}
  isEditing={isEditing}
  showSSN={showSSN}
  showBankAccount={showBankAccount}
  showBankRouting={showBankRouting}
  setShowSSN={setShowSSN}
  setShowBankAccount={setShowBankAccount}
  setShowBankRouting={setShowBankRouting}
  handleFieldChange={handleFieldChange}
/>
```

**Data Mapping:**
```typescript
payRate: employee.ufCrm6PayRate || null,
```

**Validation Rule:**
```typescript
payRate: z.string().max(50).optional(),
```

**Security Note:** Pay rate is NOT masked like SSN/Bank info. Consider if this should be restricted to certain admin roles.

---

#### Add Sales Territory Field

**Location:** After Pay Rate (new field above)

**Bitrix Field:** `ufCrm6Sales` (select)

**Code to Add:**
```typescript
import { SALES_TERRITORY_OPTIONS } from '@/lib/bitrixFieldOptions';

<Field
  label="Sales Territory"
  value={currentData.salesTerritory}
  name="salesTerritory"
  type="select"
  options={SALES_TERRITORY_OPTIONS}  // '' = Not Selected, 2019 = Northern, 2020 = Southern
  validationErrors={validationErrors}
  isEditing={isEditing}
  showSSN={showSSN}
  showBankAccount={showBankAccount}
  showBankRouting={showBankRouting}
  setShowSSN={setShowSSN}
  setShowBankAccount={setShowBankAccount}
  setShowBankRouting={setShowBankRouting}
  handleFieldChange={handleFieldChange}
/>
```

**Data Mapping:**
```typescript
salesTerritory: employee.ufCrm6Sales || null,
```

**Validation Rule:**
```typescript
salesTerritory: z.string().optional(),
```

---

#### Add Project Category Field

**Location:** After Sales Territory

**Bitrix Field:** `ufCrm6SalesUfUserLegal1740423289664` (select)

**Code to Add:**
```typescript
import { PROJECT_CATEGORY_OPTIONS } from '@/lib/bitrixFieldOptions';

<Field
  label="Project Category"
  value={currentData.projectCategory}
  name="projectCategory"
  type="select"
  options={PROJECT_CATEGORY_OPTIONS}  // 2015 = Commercial, 2016 = Community, 2017 = Residential, 2018 = Public Sector
  validationErrors={validationErrors}
  isEditing={isEditing}
  showSSN={showSSN}
  showBankAccount={showBankAccount}
  showBankRouting={showBankRouting}
  setShowSSN={setShowSSN}
  setShowBankAccount={setShowBankAccount}
  setShowBankRouting={setShowBankRouting}
  handleFieldChange={handleFieldChange}
/>
```

**Data Mapping:**
```typescript
projectCategory: employee.ufCrm6SalesUfUserLegal1740423289664 || null,
```

**Validation Rule:**
```typescript
projectCategory: z.string().optional(),
```

**IMPORTANT:** The Bitrix field name has an unusual format. Verify this exact field name in Bitrix24 admin panel under field definitions.

---

### Section: Training & Compliance

**Current Status:** Section exists but has very few fields

**Goal:** Add 11 new fields (3 status selects, 3 dates, 5 file fields)

#### Add Required Training Status

**Location:** Beginning of Training section (line ~1726)

**Bitrix Field:** `ufCrm6RequiredTraining` (select)

**Code to Add:**
```typescript
import { TRAINING_STATUS_OPTIONS } from '@/lib/bitrixFieldOptions';

<Field
  label="Required Training Status"
  value={currentData.requiredTrainingStatus}
  name="requiredTrainingStatus"
  type="select"
  options={TRAINING_STATUS_OPTIONS}  // 2073 = Not Started, 2074 = In Progress, 2075 = Completed, 2076 = Expired
  validationErrors={validationErrors}
  isEditing={isEditing}
  showSSN={showSSN}
  showBankAccount={showBankAccount}
  showBankRouting={showBankRouting}
  setShowSSN={setShowSSN}
  setShowBankAccount={setShowBankAccount}
  setShowBankRouting={setShowBankRouting}
  handleFieldChange={handleFieldChange}
/>
```

**Data Mapping:**
```typescript
requiredTrainingStatus: employee.ufCrm6RequiredTraining || null,
```

**Validation Rule:**
```typescript
requiredTrainingStatus: z.string().optional(),
```

---

#### Add Safety Training Status

**Location:** After Required Training Status

**Bitrix Field:** `ufCrm6SafetyTraining` (select, same options as Required Training)

**Code to Add:**
```typescript
<Field
  label="Safety Training Status"
  value={currentData.safetyTrainingStatus}
  name="safetyTrainingStatus"
  type="select"
  options={TRAINING_STATUS_OPTIONS}  // Same options as Required Training
  validationErrors={validationErrors}
  isEditing={isEditing}
  showSSN={showSSN}
  showBankAccount={showBankAccount}
  showBankRouting={showBankRouting}
  setShowSSN={setShowSSN}
  setShowBankAccount={setShowBankAccount}
  setShowBankRouting={setShowBankRouting}
  handleFieldChange={handleFieldChange}
/>
```

**Data Mapping:**
```typescript
safetyTrainingStatus: employee.ufCrm6SafetyTraining || null,
```

**Validation Rule:**
```typescript
safetyTrainingStatus: z.string().optional(),
```

---

#### Add Compliance Training Status

**Location:** After Safety Training Status

**Bitrix Field:** `ufCrm6ComplianceTraining` (select, same options)

**Code to Add:**
```typescript
<Field
  label="Compliance Training Status"
  value={currentData.complianceTrainingStatus}
  name="complianceTrainingStatus"
  type="select"
  options={TRAINING_STATUS_OPTIONS}
  validationErrors={validationErrors}
  isEditing={isEditing}
  showSSN={showSSN}
  showBankAccount={showBankAccount}
  showBankRouting={showBankRouting}
  setShowSSN={setShowSSN}
  setShowBankAccount={setShowBankAccount}
  setShowBankRouting={setShowBankRouting}
  handleFieldChange={handleFieldChange}
/>
```

**Data Mapping:**
```typescript
complianceTrainingStatus: employee.ufCrm6ComplianceTraining || null,
```

---

#### Add Training Completion Date

**Location:** After Compliance Training Status

**Bitrix Field:** `ufCrm6TrainingDate` (date)

**Code to Add:**
```typescript
<Field
  label="Training Completion Date"
  value={currentData.trainingDate}
  name="trainingDate"
  type="date"
  validationErrors={validationErrors}
  isEditing={isEditing}
  showSSN={showSSN}
  showBankAccount={showBankAccount}
  showBankRouting={showBankRouting}
  setShowSSN={setShowSSN}
  setShowBankAccount={setShowBankAccount}
  setShowBankRouting={setShowBankRouting}
  handleFieldChange={handleFieldChange}
/>
```

**Data Mapping:**
```typescript
trainingDate: employee.ufCrm6TrainingDate || null,
```

**Validation Rule:**
```typescript
trainingDate: z.string().regex(/^(\d{4}-\d{2}-\d{2}|)$/).optional(),
```

---

#### Add Next Training Due Date

**Location:** After Training Completion Date

**Bitrix Field:** `ufCrm6NextTrainingDue` (date)

**Code to Add:**
```typescript
<Field
  label="Next Training Due Date"
  value={currentData.nextTrainingDue}
  name="nextTrainingDue"
  type="date"
  validationErrors={validationErrors}
  isEditing={isEditing}
  showSSN={showSSN}
  showBankAccount={showBankAccount}
  showBankRouting={showBankRouting}
  setShowSSN={setShowSSN}
  setShowBankAccount={setShowBankAccount}
  setShowBankRouting={setShowBankRouting}
  handleFieldChange={handleFieldChange}
/>
```

**Data Mapping:**
```typescript
nextTrainingDue: employee.ufCrm6NextTrainingDue || null,
```

---

#### Add Training Notes

**Location:** After Next Training Due Date

**Bitrix Field:** `ufCrm6TrainingNotes` (textarea)

**Code to Add:**
```typescript
<Field
  label="Training Notes"
  value={currentData.trainingNotes}
  name="trainingNotes"
  type="textarea"
  validationErrors={validationErrors}
  isEditing={isEditing}
  showSSN={showSSN}
  showBankAccount={showBankAccount}
  showBankRouting={showBankRouting}
  setShowSSN={setShowSSN}
  setShowBankAccount={setShowBankAccount}
  setShowBankRouting={setShowBankRouting}
  handleFieldChange={handleFieldChange}
/>
```

**Data Mapping:**
```typescript
trainingNotes: employee.ufCrm6TrainingNotes || null,
```

**Validation Rule:**
```typescript
trainingNotes: z.string().max(2000).optional(),
```

---

#### Add Training File Fields

**Location:** After Training Notes

**Code to Add:**
```typescript
import FileField from '@/components/FileField';

{/* Training Files Section */}
<div className="col-span-2">
  <h4 className="text-sm font-semibold text-slate-700 mb-2 mt-4">Training Documentation</h4>
</div>

<FileField
  label="Required Training Completion"
  value={currentData.trainingComplete}
  name="trainingComplete"
  isEditing={isEditing}
/>

<FileField
  label="Professional Certifications"
  value={currentData.professionalCertifications}
  name="professionalCertifications"
  isEditing={isEditing}
/>

<FileField
  label="Training Records"
  value={currentData.trainingRecords}
  name="trainingRecords"
  isEditing={isEditing}
/>

<FileField
  label="Skills Assessment"
  value={currentData.skillsAssessment}
  name="skillsAssessment"
  isEditing={isEditing}
/>

<FileField
  label="Training Documents"
  value={currentData.trainingDocs}
  name="trainingDocs"
  isEditing={isEditing}
/>
```

**Data Mapping:**
```typescript
trainingComplete: employee.ufCrm6TrainingComplete || null,  // number[] (file IDs)
professionalCertifications: employee.ufCrm6ProfessionalCertifications || null,
trainingRecords: employee.ufCrm6TrainingRecords || null,
skillsAssessment: employee.ufCrm6SkillsAssessment || null,  // number (single file)
trainingDocs: employee.ufCrm6TrainingDocs || null,
```

**Validation Rules:**
```typescript
trainingComplete: z.array(z.number()).optional(),
professionalCertifications: z.array(z.number()).optional(),
trainingRecords: z.array(z.number()).optional(),
skillsAssessment: z.number().optional(),
trainingDocs: z.array(z.number()).optional(),
```

**Note:** These are file IDs from Bitrix24. FileField component will display "X files attached" or "No file". Full file download/upload requires additional R2 integration.

---

### Section: IT & Equipment

**Current Status:** Section exists with some basic fields

**Goal:** Add 9 new fields (3 selects, 2 multiselects, 2 checkboxes, 2 text)

#### Replace Equipment Assigned with MultiSelectField

**Current Location:** Line ~1790 (currently using TagField)

**Problem:** Should be a multiselect with specific equipment options (Phone, Laptop, Tablet, etc.)

**Current Code:**
```typescript
<TagField
  label="Equipment Assigned"
  value={currentData.equipmentAssigned}
  name="equipmentAssigned"
  colSpan={3}
  validationErrors={validationErrors}
  isEditing={isEditing}
  updateField={updateField}
/>
```

**Updated Code:**
```typescript
import MultiSelectField from '@/components/MultiSelectField';
import { EQUIPMENT_OPTIONS } from '@/lib/bitrixFieldOptions';

<MultiSelectField
  label="Equipment Assigned"
  value={currentData.equipmentAssigned}
  name="equipmentAssigned"
  options={EQUIPMENT_OPTIONS}  // 2043 = Phone, 2044 = Laptop, 2045 = Tablet, 2046 = Desktop, 2047 = Monitor, 2048 = Headset, 2049 = Other
  colSpan={2}
  isEditing={isEditing}
  handleFieldChange={handleFieldChange}
  validationErrors={validationErrors}
/>
```

**Bitrix Field:** `ufCrm6EquipmentAssigned` (multiselect with option IDs)

**Data Mapping:**
```typescript
equipmentAssigned: employee.ufCrm6EquipmentAssigned || [],  // string[] of option IDs
```

**Validation Rule:**
```typescript
equipmentAssigned: z.array(z.string()).optional(),
```

---

#### Add Equipment Status

**Location:** After Equipment Assigned

**Bitrix Field:** `ufCrm6EquipmentStatus` (select)

**Code to Add:**
```typescript
import { EQUIPMENT_STATUS_OPTIONS } from '@/lib/bitrixFieldOptions';

<Field
  label="Equipment Status"
  value={currentData.equipmentStatus}
  name="equipmentStatus"
  type="select"
  options={EQUIPMENT_STATUS_OPTIONS}  // 2065 = Issued, 2066 = Returned, 2067 = Lost, 2068 = Damaged
  validationErrors={validationErrors}
  isEditing={isEditing}
  showSSN={showSSN}
  showBankAccount={showBankAccount}
  showBankRouting={showBankRouting}
  setShowSSN={setShowSSN}
  setShowBankAccount={setShowBankAccount}
  setShowBankRouting={setShowBankRouting}
  handleFieldChange={handleFieldChange}
/>
```

**Data Mapping:**
```typescript
equipmentStatus: employee.ufCrm6EquipmentStatus || null,
```

---

#### Add Equipment Return Tracking

**Location:** After Equipment Status

**Bitrix Field:** `ufCrm6EquipmentReturn` (text)

**Code to Add:**
```typescript
<Field
  label="Equipment Return Tracking"
  value={currentData.equipmentReturn}
  name="equipmentReturn"
  validationErrors={validationErrors}
  isEditing={isEditing}
  showSSN={showSSN}
  showBankAccount={showBankAccount}
  showBankRouting={showBankRouting}
  setShowSSN={setShowSSN}
  setShowBankAccount={setShowBankAccount}
  setShowBankRouting={setShowBankRouting}
  handleFieldChange={handleFieldChange}
/>
```

**Data Mapping:**
```typescript
equipmentReturn: employee.ufCrm6EquipmentReturn || null,
```

**Validation Rule:**
```typescript
equipmentReturn: z.string().max(500).optional(),
```

**Use Case:** Track equipment return dates, shipping info, notes when employee leaves

---

#### Add Software Access (MultiSelect)

**Location:** After Equipment Return Tracking

**Bitrix Field:** `ufCrm6SoftwareAccess` (multiselect)

**Code to Add:**
```typescript
import { SOFTWARE_ACCESS_OPTIONS } from '@/lib/bitrixFieldOptions';

<MultiSelectField
  label="Software Access"
  value={currentData.softwareAccess}
  name="softwareAccess"
  options={SOFTWARE_ACCESS_OPTIONS}  // 2050 = Office 365, 2051 = CRM, 2052 = Accounting, 2053 = Design Software, 2054 = Development Tools, 2055 = Other
  colSpan={2}
  isEditing={isEditing}
  handleFieldChange={handleFieldChange}
  validationErrors={validationErrors}
/>
```

**Data Mapping:**
```typescript
softwareAccess: employee.ufCrm6SoftwareAccess || [],  // string[] of option IDs
```

**Validation Rule:**
```typescript
softwareAccess: z.array(z.string()).optional(),
```

---

#### Add Access Level

**Location:** After Software Access

**Bitrix Field:** `ufCrm6AccessLevel` (select)

**Code to Add:**
```typescript
import { ACCESS_LEVEL_OPTIONS } from '@/lib/bitrixFieldOptions';

<Field
  label="System Access Level"
  value={currentData.accessLevel}
  name="accessLevel"
  type="select"
  options={ACCESS_LEVEL_OPTIONS}  // 2057 = Basic User, 2058 = Power User, 2059 = Administrator, 2060 = Super Admin
  validationErrors={validationErrors}
  isEditing={isEditing}
  showSSN={showSSN}
  showBankAccount={showBankAccount}
  showBankRouting={showBankRouting}
  setShowSSN={setShowSSN}
  setShowBankAccount={setShowBankAccount}
  setShowBankRouting={setShowBankRouting}
  handleFieldChange={handleFieldChange}
/>
```

**Data Mapping:**
```typescript
accessLevel: employee.ufCrm6AccessLevel || null,
```

---

#### Add Security Clearance

**Location:** After Access Level

**Bitrix Field:** `ufCrm6SecurityClearance` (select)

**Code to Add:**
```typescript
import { SECURITY_CLEARANCE_OPTIONS } from '@/lib/bitrixFieldOptions';

<Field
  label="Security Clearance Level"
  value={currentData.securityClearance}
  name="securityClearance"
  type="select"
  options={SECURITY_CLEARANCE_OPTIONS}  // 2061 = None, 2062 = Confidential, 2063 = Secret, 2064 = Top Secret
  validationErrors={validationErrors}
  isEditing={isEditing}
  showSSN={showSSN}
  showBankAccount={showBankAccount}
  showBankRouting={showBankRouting}
  setShowSSN={setShowSSN}
  setShowBankAccount={setShowBankAccount}
  setShowBankRouting={setShowBankRouting}
  handleFieldChange={handleFieldChange}
/>
```

**Data Mapping:**
```typescript
securityClearance: employee.ufCrm6SecurityClearance || null,
```

---

#### Add Network Status

**Location:** After Security Clearance

**Bitrix Field:** `ufCrm6NetworkStatus` (select)

**Code to Add:**
```typescript
import { NETWORK_STATUS_OPTIONS } from '@/lib/bitrixFieldOptions';

<Field
  label="Network Account Status"
  value={currentData.networkStatus}
  name="networkStatus"
  type="select"
  options={NETWORK_STATUS_OPTIONS}  // 2069 = Active, 2070 = Inactive, 2071 = Suspended, 2072 = Disabled
  validationErrors={validationErrors}
  isEditing={isEditing}
  showSSN={showSSN}
  showBankAccount={showBankAccount}
  showBankRouting={showBankRouting}
  setShowSSN={setShowSSN}
  setShowBankAccount={setShowBankAccount}
  setShowBankRouting={setShowBankRouting}
  handleFieldChange={handleFieldChange}
/>
```

**Data Mapping:**
```typescript
networkStatus: employee.ufCrm6NetworkStatus || null,
```

---

#### Add VPN Access Checkbox

**Location:** After Network Status

**Bitrix Field:** `ufCrm6VpnAccess` (checkbox)

**Code to Add:**
```typescript
<Field
  label="VPN Access"
  value={currentData.vpnAccess}
  name="vpnAccess"
  type="checkbox"
  validationErrors={validationErrors}
  isEditing={isEditing}
  showSSN={showSSN}
  showBankAccount={showBankAccount}
  showBankRouting={showBankRouting}
  setShowSSN={setShowSSN}
  setShowBankAccount={setShowBankAccount}
  setShowBankRouting={setShowBankRouting}
  handleFieldChange={handleFieldChange}
/>
```

**Data Mapping:**
```typescript
vpnAccess: employee.ufCrm6VpnAccess || false,  // boolean
```

**Validation Rule:**
```typescript
vpnAccess: z.boolean().optional(),
```

---

#### Add Remote Access Approved Checkbox

**Location:** After VPN Access

**Bitrix Field:** `ufCrm6RemoteAccess` (checkbox)

**Code to Add:**
```typescript
<Field
  label="Remote Access Approved"
  value={currentData.remoteAccess}
  name="remoteAccess"
  type="checkbox"
  validationErrors={validationErrors}
  isEditing={isEditing}
  showSSN={showSSN}
  showBankAccount={showBankAccount}
  showBankRouting={showBankRouting}
  setShowSSN={setShowSSN}
  setShowBankAccount={setShowBankAccount}
  setShowBankRouting={setShowBankRouting}
  handleFieldChange={handleFieldChange}
/>
```

**Data Mapping:**
```typescript
remoteAccess: employee.ufCrm6RemoteAccess || false,  // boolean
```

---

### Section: Vehicle & Licensing

**Current Status:** Section exists but is empty

**Goal:** Add 4 fields (2 file fields + 2 date fields)

**Location:** Line ~1873

#### Add Driver's License File

**Bitrix Field:** `ufCrm6UfUsr1747966315398` (file ID)

**Code to Add:**
```typescript
import FileField from '@/components/FileField';

<FileField
  label="Driver's License"
  value={currentData.driversLicense}
  name="driversLicense"
  isEditing={isEditing}
/>
```

**Data Mapping:**
```typescript
driversLicense: employee.ufCrm6UfUsr1747966315398 || null,  // number (file ID)
```

**Validation Rule:**
```typescript
driversLicense: z.number().optional(),
```

---

#### Add Driver's License Expiry

**Bitrix Field:** `ufCrm6UfUsr1747966315398Expiry` (date string)

**Code to Add:**
```typescript
<Field
  label="Driver's License Expiry"
  value={currentData.driversLicenseExpiry}
  name="driversLicenseExpiry"
  type="date"
  validationErrors={validationErrors}
  isEditing={isEditing}
  showSSN={showSSN}
  showBankAccount={showBankAccount}
  showBankRouting={showBankRouting}
  setShowSSN={setShowSSN}
  setShowBankAccount={setShowBankAccount}
  setShowBankRouting={setShowBankRouting}
  handleFieldChange={handleFieldChange}
/>
```

**Data Mapping:**
```typescript
driversLicenseExpiry: employee.ufCrm6UfUsr1747966315398Expiry || null,
```

**Note:** This field exists in current implementation (line ~1875)

---

#### Add Auto Insurance File

**Bitrix Field:** `ufCrm6UfUsr1737120327618` (file ID)

**Code to Add:**
```typescript
<FileField
  label="Automobile Insurance"
  value={currentData.autoInsurance}
  name="autoInsurance"
  isEditing={isEditing}
/>
```

**Data Mapping:**
```typescript
autoInsurance: employee.ufCrm6UfUsr1737120327618 || null,  // number (file ID)
```

**Validation Rule:**
```typescript
autoInsurance: z.number().optional(),
```

---

#### Add Auto Insurance Expiry

**Bitrix Field:** `ufCrm6UfUsr1737120327618Expiry` (date string)

**Code to Add:**
```typescript
<Field
  label="Auto Insurance Expiry"
  value={currentData.autoInsuranceExpiry}
  name="autoInsuranceExpiry"
  type="date"
  validationErrors={validationErrors}
  isEditing={isEditing}
  showSSN={showSSN}
  showBankAccount={showBankAccount}
  showBankRouting={showBankRouting}
  setShowSSN={setShowSSN}
  setShowBankAccount={setShowBankAccount}
  setShowBankRouting={setShowBankRouting}
  handleFieldChange={handleFieldChange}
/>
```

**Data Mapping:**
```typescript
autoInsuranceExpiry: employee.ufCrm6UfUsr1737120327618Expiry || null,
```

**Note:** This field exists in current implementation (line ~1876)

---

### Section: Tax & Payroll Information

**Current Status:** Section has basic fields but missing file fields

**Goal:** Add 5 file fields + 1 text field

**Location:** Line ~1596

#### Add W-4 Exemptions Field

**Location:** After Tax Filing Status dropdown (line ~1610)

**Bitrix Field:** `ufCrm6W4Exemptions` (text/number)

**Code to Add:**
```typescript
<Field
  label="W-4 Exemptions Claimed"
  value={currentData.w4Exemptions}
  name="w4Exemptions"
  validationErrors={validationErrors}
  isEditing={isEditing}
  showSSN={showSSN}
  showBankAccount={showBankAccount}
  showBankRouting={showBankRouting}
  setShowSSN={setShowSSN}
  setShowBankAccount={setShowBankAccount}
  setShowBankRouting={setShowBankRouting}
  handleFieldChange={handleFieldChange}
/>
```

**Data Mapping:**
```typescript
w4Exemptions: employee.ufCrm6W4Exemptions || null,
```

**Validation Rule:**
```typescript
w4Exemptions: z.string().max(10).optional(),
```

---

#### Add Tax & Payroll File Fields

**Location:** After Additional State Withholding field

**Code to Add:**
```typescript
import FileField from '@/components/FileField';

{/* Tax Documentation Section */}
<div className="col-span-2">
  <h4 className="text-sm font-semibold text-slate-700 mb-2 mt-4">Tax Documentation</h4>
</div>

<FileField
  label="W-4 Form"
  value={currentData.w4File}
  name="w4File"
  isEditing={isEditing}
/>

<FileField
  label="I-9 Form"
  value={currentData.i9File}
  name="i9File"
  isEditing={isEditing}
/>

<FileField
  label="Multiple Jobs Worksheet"
  value={currentData.multipleJobsWorksheet}
  name="multipleJobsWorksheet"
  isEditing={isEditing}
/>

<FileField
  label="Deductions Worksheet"
  value={currentData.deductionsWorksheet}
  name="deductionsWorksheet"
  isEditing={isEditing}
/>
```

**Bitrix Fields:**
- `ufCrm6UfW4File` - number[] (multiple files)
- `ufCrm6UfI9File` - number[] (multiple files)
- `ufCrm6MultipleJobsWorksheet` - number (single file)
- `ufCrm6DeductionsWorksheet` - number (single file)

**Data Mapping:**
```typescript
w4File: employee.ufCrm6UfW4File || null,
i9File: employee.ufCrm6UfI9File || null,
multipleJobsWorksheet: employee.ufCrm6MultipleJobsWorksheet || null,
deductionsWorksheet: employee.ufCrm6DeductionsWorksheet || null,
```

**Validation Rules:**
```typescript
w4File: z.array(z.number()).optional(),
i9File: z.array(z.number()).optional(),
multipleJobsWorksheet: z.number().optional(),
deductionsWorksheet: z.number().optional(),
```

---

### Section: Banking & Direct Deposit

**Current Status:** Section has all text fields but missing file field

**Goal:** Add 1 file field

**Location:** Line ~1639, after Account Number field

#### Add Direct Deposit Authorization File

**Bitrix Field:** `ufCrm6DirectDeposit` (file ID)

**Code to Add:**
```typescript
import FileField from '@/components/FileField';

<FileField
  label="Direct Deposit Authorization"
  value={currentData.directDeposit}
  name="directDeposit"
  colSpan={2}
  isEditing={isEditing}
/>
```

**Data Mapping:**
```typescript
directDeposit: employee.ufCrm6DirectDeposit || null,  // number (file ID)
```

**Validation Rule:**
```typescript
directDeposit: z.number().optional(),
```

---

## Code Examples

### Complete Import Section for page.tsx

Add these imports at the top of the file (around line 1-10):

```typescript
'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState, useCallback, useMemo, memo, useEffect } from 'react';
import { z } from 'zod';
import TagInput from '@/components/TagInput';
import { useGooglePlaces } from '@/hooks/useGooglePlaces';

// NEW IMPORTS FOR COMPREHENSIVE FIELDS
import FileField from '@/components/FileField';
import MultiSelectField from '@/components/MultiSelectField';
import {
  GENDER_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  CITIZENSHIP_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  TAX_FILING_STATUS_OPTIONS,
  BANK_ACCOUNT_TYPE_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  TRAINING_STATUS_OPTIONS,
  EQUIPMENT_OPTIONS,
  SOFTWARE_ACCESS_OPTIONS,
  ACCESS_LEVEL_OPTIONS,
  SECURITY_CLEARANCE_OPTIONS,
  EQUIPMENT_STATUS_OPTIONS,
  NETWORK_STATUS_OPTIONS,
  SKILLS_LEVEL_OPTIONS,
  SUBSIDIARY_OPTIONS,
  SALES_TERRITORY_OPTIONS,
  PROJECT_CATEGORY_OPTIONS,
} from '@/lib/bitrixFieldOptions';
```

---

### Complete Validation Schema Addition

Find the `employeeSchema` constant (around line 12) and add these new fields:

```typescript
const employeeSchema = z.object({
  // ... existing Personal Information fields ...

  // ADD THESE TO PERSONAL INFORMATION:
  profilePhoto: z.union([z.string(), z.number()]).optional(),

  // ... existing Emergency Contact fields ...

  // ADD THESE TO EMPLOYMENT DETAILS:
  payRate: z.string().max(50).optional(),
  salesTerritory: z.string().optional(),
  projectCategory: z.string().optional(),

  // ... existing other fields ...

  // ADD THESE TO TRAINING & COMPLIANCE:
  trainingDate: z.string().regex(/^(\d{4}-\d{2}-\d{2}|)$/).optional(),
  nextTrainingDue: z.string().regex(/^(\d{4}-\d{2}-\d{2}|)$/).optional(),
  trainingNotes: z.string().max(2000).optional(),
  trainingComplete: z.array(z.number()).optional(),
  professionalCertifications: z.array(z.number()).optional(),
  trainingRecords: z.array(z.number()).optional(),
  skillsAssessment: z.number().optional(),
  trainingDocs: z.array(z.number()).optional(),

  // ADD THESE TO IT & EQUIPMENT:
  equipmentReturn: z.string().max(500).optional(),

  // ADD THESE TO TAX & PAYROLL:
  w4Exemptions: z.string().max(10).optional(),
  w4File: z.array(z.number()).optional(),
  i9File: z.array(z.number()).optional(),
  multipleJobsWorksheet: z.number().optional(),
  deductionsWorksheet: z.number().optional(),

  // ADD THESE TO BANKING:
  directDeposit: z.number().optional(),

  // ADD THESE TO VEHICLE:
  driversLicense: z.number().optional(),
  autoInsurance: z.number().optional(),

  // ... rest of schema
}).passthrough();
```

---

### Example: Complete Training & Compliance Section

Replace the existing Training & Compliance section (around line 1725) with this complete version:

```typescript
{/* Training & Compliance */}
<Section title="Training & Compliance" isOpen={openSections.training} onToggle={() => toggleSection('training')}>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
    {/* Status Fields */}
    <Field
      label="Required Training Status"
      value={currentData.requiredTrainingStatus}
      name="requiredTrainingStatus"
      type="select"
      options={TRAINING_STATUS_OPTIONS}
      validationErrors={validationErrors}
      isEditing={isEditing}
      showSSN={showSSN}
      showBankAccount={showBankAccount}
      showBankRouting={showBankRouting}
      setShowSSN={setShowSSN}
      setShowBankAccount={setShowBankAccount}
      setShowBankRouting={setShowBankRouting}
      handleFieldChange={handleFieldChange}
    />

    <Field
      label="Safety Training Status"
      value={currentData.safetyTrainingStatus}
      name="safetyTrainingStatus"
      type="select"
      options={TRAINING_STATUS_OPTIONS}
      validationErrors={validationErrors}
      isEditing={isEditing}
      showSSN={showSSN}
      showBankAccount={showBankAccount}
      showBankRouting={showBankRouting}
      setShowSSN={setShowSSN}
      setShowBankAccount={setShowBankAccount}
      setShowBankRouting={setShowBankRouting}
      handleFieldChange={handleFieldChange}
    />

    <Field
      label="Compliance Training Status"
      value={currentData.complianceTrainingStatus}
      name="complianceTrainingStatus"
      type="select"
      options={TRAINING_STATUS_OPTIONS}
      validationErrors={validationErrors}
      isEditing={isEditing}
      showSSN={showSSN}
      showBankAccount={showBankAccount}
      showBankRouting={showBankRouting}
      setShowSSN={setShowSSN}
      setShowBankAccount={setShowBankAccount}
      setShowBankRouting={setShowBankRouting}
      handleFieldChange={handleFieldChange}
    />

    <Field
      label="Skills Level"
      value={currentData.skillsLevel}
      name="skillsLevel"
      type="select"
      options={SKILLS_LEVEL_OPTIONS}
      validationErrors={validationErrors}
      isEditing={isEditing}
      showSSN={showSSN}
      showBankAccount={showBankAccount}
      showBankRouting={showBankRouting}
      setShowSSN={setShowSSN}
      setShowBankAccount={setShowBankAccount}
      setShowBankRouting={setShowBankRouting}
      handleFieldChange={handleFieldChange}
    />

    {/* Date Fields */}
    <Field
      label="Training Completion Date"
      value={currentData.trainingDate}
      name="trainingDate"
      type="date"
      validationErrors={validationErrors}
      isEditing={isEditing}
      showSSN={showSSN}
      showBankAccount={showBankAccount}
      showBankRouting={showBankRouting}
      setShowSSN={setShowSSN}
      setShowBankAccount={setShowBankAccount}
      setShowBankRouting={setShowBankRouting}
      handleFieldChange={handleFieldChange}
    />

    <Field
      label="Next Training Due"
      value={currentData.nextTrainingDue}
      name="nextTrainingDue"
      type="date"
      validationErrors={validationErrors}
      isEditing={isEditing}
      showSSN={showSSN}
      showBankAccount={showBankAccount}
      showBankRouting={showBankRouting}
      setShowSSN={setShowSSN}
      setShowBankAccount={setShowBankAccount}
      setShowBankRouting={setShowBankRouting}
      handleFieldChange={handleFieldChange}
    />

    {/* Training Notes */}
    <Field
      label="Training Notes"
      value={currentData.trainingNotes}
      name="trainingNotes"
      type="textarea"
      colSpan={2}
      validationErrors={validationErrors}
      isEditing={isEditing}
      showSSN={showSSN}
      showBankAccount={showBankAccount}
      showBankRouting={showBankRouting}
      setShowSSN={setShowSSN}
      setShowBankAccount={setShowBankAccount}
      setShowBankRouting={setShowBankRouting}
      handleFieldChange={handleFieldChange}
    />

    {/* Documentation Section Header */}
    <div className="col-span-2">
      <h4 className="text-sm font-semibold text-slate-700 mb-2 mt-4 border-t pt-4 border-slate-200">
        Training Documentation
      </h4>
    </div>

    {/* File Fields */}
    <FileField
      label="Required Training Completion"
      value={currentData.trainingComplete}
      name="trainingComplete"
      isEditing={isEditing}
    />

    <FileField
      label="Professional Certifications"
      value={currentData.professionalCertifications}
      name="professionalCertifications"
      isEditing={isEditing}
    />

    <FileField
      label="Training Records"
      value={currentData.trainingRecords}
      name="trainingRecords"
      isEditing={isEditing}
    />

    <FileField
      label="Skills Assessment"
      value={currentData.skillsAssessment}
      name="skillsAssessment"
      isEditing={isEditing}
    />

    <FileField
      label="Training Documents"
      value={currentData.trainingDocs}
      name="trainingDocs"
      isEditing={isEditing}
    />
  </div>
</Section>
```

---

### Data Mapping Example (getEmployee API Response Transformation)

This happens in the backend admin route (`/api/admin/employee/:bitrixId`). The backend ALREADY returns all fields, but here's what the mapping looks like for reference:

```typescript
// Backend (admin.ts) - Already implemented:
adminRoutes.get('/employee/:bitrixId', async (c) => {
  const bitrix = new BitrixClient(env);
  const employee = await bitrix.getEmployee(bitrixId);

  // Returns full raw Bitrix employee object with ALL fields
  // Frontend receives this with ALL ufCrm6* fields intact
  return c.json({ employee });
});
```

**Frontend receives:**
```typescript
{
  employee: {
    id: 64,
    ufCrm6Name: "Adam",
    ufCrm6LastName: "Homan",
    ufCrm6BadgeNumber: "EMP1011",
    ufCrm6PersonalGender: "2003",  // Male
    ufCrm6EquipmentAssigned: ["2044", "2047"],  // Laptop, Monitor
    ufCrm6RequiredTraining: "2075",  // Completed
    ufCrm6VpnAccess: true,
    ufCrm6ProfilePhoto: 12345,  // File ID
    // ... all other 100+ fields
  }
}
```

**Frontend maps to `currentData` state:**
```typescript
const { data: employeeData } = useQuery({
  queryKey: ['employee', bitrixId],
  queryFn: () => api.getEmployeeDetail(bitrixId),
});

// Map backend fields to frontend state:
const [currentData, setCurrentData] = useState({
  // Backend returns ufCrm6Name, we access it as-is:
  firstName: employeeData.employee.ufCrm6Name,
  gender: employeeData.employee.ufCrm6PersonalGender,  // "2003"
  equipmentAssigned: employeeData.employee.ufCrm6EquipmentAssigned,  // ["2044", "2047"]
  requiredTrainingStatus: employeeData.employee.ufCrm6RequiredTraining,  // "2075"
  vpnAccess: employeeData.employee.ufCrm6VpnAccess,  // true
  profilePhoto: employeeData.employee.ufCrm6ProfilePhoto,  // 12345
  // ... all other fields
});
```

**IMPORTANT:** The backend returns raw Bitrix field names (`ufCrm6*`). The frontend employee detail page should map these to friendlier names in its state, OR access them directly using the Bitrix field names. Check the current implementation to see which pattern is used.

---

## Testing Procedures

### Pre-Deployment Testing Checklist

Before deploying to production, complete ALL of the following tests:

#### Test 1: View Mode Display

**Goal:** Verify all new fields display correctly in read-only mode

**Steps:**
1. Navigate to an employee detail page: `https://app.hartzell.work/admin/employees/detail?id=64`
2. Ensure page loads without errors (check browser console)
3. Verify each section expands/collapses correctly
4. Check that new fields display data properly:
   - Select fields show human-readable labels (e.g., "Female" not "2002")
   - MultiSelect fields show multiple badges (e.g., "Laptop, Monitor")
   - File fields show "X files attached" or "No file"
   - Checkboxes show checked/unchecked state
   - Date fields show formatted dates
   - Empty fields show "—" (em dash)

**Expected Result:** All fields render without errors, data displays in human-readable format

---

#### Test 2: Edit Mode Toggle

**Goal:** Verify edit mode enables all field types correctly

**Steps:**
1. Click the "Edit" button in the top-right
2. Verify all fields switch to edit mode:
   - Text fields become input boxes
   - Select fields become dropdowns
   - MultiSelect fields become clickable button groups
   - Checkboxes become toggleable
   - File fields show "File management coming soon" message
3. Try toggling edit mode on/off multiple times

**Expected Result:** All fields transition smoothly between view and edit modes

---

#### Test 3: Select Field Options

**Goal:** Verify all select dropdowns show correct options

**Steps:**
1. Enter edit mode
2. Click each select field dropdown and verify options:
   - **Gender:** Should show "Select Gender", "Female", "Male"
   - **Marital Status:** Should show "Not Selected", "Single", "Married", "Divorced", "Widowed", "Separated"
   - **Required Training Status:** Should show "Not Selected", "Not Started", "In Progress", "Completed", "Expired"
   - **Equipment Status:** Should show "Not Selected", "Issued", "Returned", "Lost", "Damaged"
   - **Access Level:** Should show "Not Selected", "Basic User", "Power User", "Administrator", "Super Admin"
   - **Network Status:** Should show "Not Selected", "Active", "Inactive", "Suspended", "Disabled"
3. Select different options and verify they update in the UI

**Expected Result:** All select fields show correct option labels from `bitrixFieldOptions.ts`

---

#### Test 4: MultiSelect Functionality

**Goal:** Verify MultiSelectField allows multiple selections

**Steps:**
1. Enter edit mode
2. Navigate to "Equipment Assigned" field
3. Click multiple options (e.g., Laptop, Phone, Monitor)
4. Verify selected options show blue background with X icon
5. Click a selected option to deselect it
6. Repeat test for "Software Access" field

**Expected Result:** Can select/deselect multiple options, UI updates immediately

---

#### Test 5: Field Validation

**Goal:** Verify validation prevents invalid data

**Steps:**
1. Enter edit mode
2. Try invalid inputs:
   - Clear a required field (First Name, Last Name, Badge Number, Position, Status)
   - Enter invalid date format in Date of Birth: "13/45/2025"
   - Enter invalid SSN format: "12345"
   - Enter invalid email: "notanemail"
3. Click "Save Changes"
4. Verify error messages appear under invalid fields
5. Verify save is blocked until errors are fixed

**Expected Result:** Validation catches all errors, displays clear error messages, prevents save

---

#### Test 6: Data Persistence to Bitrix24

**Goal:** Verify changes save to Bitrix24 and persist after refresh

**Steps:**
1. Enter edit mode
2. Make changes to several fields:
   - Change Gender from "Male" to "Female"
   - Select Training Status to "Completed"
   - Add equipment items
   - Check VPN Access checkbox
3. Click "Save Changes"
4. Wait for success message
5. Refresh the page (hard refresh: Ctrl+Shift+R)
6. Verify all changes persisted

**Expected Result:** All changes save to Bitrix24 and persist after page refresh

---

#### Test 7: File Field Display

**Goal:** Verify FileField component displays correctly

**Steps:**
1. Navigate to an employee with file attachments (if available)
2. Check file fields in these sections:
   - Personal Information: Profile Photo
   - Tax & Payroll: W-4 Form, I-9 Form
   - Training & Compliance: Training Records, Certifications
   - Vehicle & Licensing: Driver's License, Auto Insurance
3. Verify fields show:
   - "1 file attached" (green icon) if file exists
   - "No file" (gray icon) if no file

**Expected Result:** File fields accurately reflect attachment status

---

#### Test 8: Multi-Employee Test

**Goal:** Verify system works across different employees

**Steps:**
1. Test with at least 3 different employee IDs
2. Verify data loads correctly for each
3. Verify field values are unique per employee
4. Test saving changes for multiple employees

**Expected Result:** System handles multiple employees without data mixing

---

#### Test 9: Section Expand/Collapse

**Goal:** Verify all sections expand/collapse smoothly

**Steps:**
1. Collapse all sections
2. Expand each section one by one:
   - Personal Information
   - Emergency Contact
   - Employment Details
   - Citizenship & Work Authorization
   - Compensation & Benefits
   - Tax & Payroll Information
   - Banking & Direct Deposit
   - Dependents & Beneficiaries
   - Education & Skills
   - Training & Compliance
   - IT & Equipment
   - Vehicle & Licensing
   - Performance & Reviews
   - Additional Information
3. Verify no layout issues or overlapping content

**Expected Result:** All sections expand/collapse smoothly without visual glitches

---

#### Test 10: Browser Console Errors

**Goal:** Ensure no JavaScript errors

**Steps:**
1. Open browser DevTools (F12)
2. Navigate to Console tab
3. Load employee detail page
4. Toggle edit mode
5. Interact with various fields
6. Save changes
7. Monitor console for errors/warnings

**Expected Result:** No errors in console (warnings about development mode are OK)

---

#### Test 11: Network Requests

**Goal:** Verify API calls are efficient and correct

**Steps:**
1. Open DevTools → Network tab
2. Load employee detail page
3. Verify API calls:
   - `GET /api/admin/employee/:bitrixId` returns 200 with full employee data
   - `PATCH /api/admin/employee/:bitrixId` sends correct payload on save
4. Check response times (should be <2 seconds)

**Expected Result:** API calls are efficient, return correct data, no 500 errors

---

#### Test 12: Mobile Responsiveness

**Goal:** Verify page works on mobile devices

**Steps:**
1. Open DevTools → Toggle device toolbar (Ctrl+Shift+M)
2. Test on different screen sizes:
   - iPhone SE (375px)
   - iPad (768px)
   - Desktop (1920px)
3. Verify layout adjusts properly:
   - Two-column grid collapses to single column on mobile
   - Fields remain readable and usable
   - Edit buttons are accessible

**Expected Result:** Page is fully functional on all screen sizes

---

### Post-Deployment Verification

After deploying to production (`app.hartzell.work`):

1. **Smoke Test:** Load 3-5 employee pages, verify no errors
2. **Data Integrity Test:** Verify existing employee data displays correctly (no fields corrupted)
3. **Update Test:** Make a small change to an employee, verify it saves to Bitrix24
4. **Audit Log Check:** Verify changes are logged in D1 `audit_logs` table
5. **Cache Verification:** Check that D1 `employee_cache` table updates after changes
6. **Performance Check:** Verify page load times remain acceptable (<3 seconds)

---

## Troubleshooting Guide

### Problem: Fields Show Bitrix IDs Instead of Labels

**Symptom:** Field displays "2003" instead of "Male"

**Cause:** Field component is not using the options map to display labels

**Solution:**

1. Verify the field is using `type="select"` and passing `options` prop:
   ```typescript
   <Field
     type="select"
     options={GENDER_OPTIONS}  // ← Must pass options
     value={currentData.gender}
     // ...
   />
   ```

2. Check that `Field` component properly renders labels:
   ```typescript
   // In Field component (around line 365):
   if (!isEditing) {
     let displayValue = value;
     if (type === 'select' && options) {
       const option = options.find(opt => opt.value === value);
       displayValue = option?.label || value;  // ← Should show label
     }
     return <div>{displayValue}</div>;
   }
   ```

3. If still showing IDs, use `getOptionLabel` helper:
   ```typescript
   import { getOptionLabel, GENDER_OPTIONS } from '@/lib/bitrixFieldOptions';

   const displayValue = getOptionLabel(GENDER_OPTIONS, currentData.gender);
   ```

---

### Problem: MultiSelect Not Updating

**Symptom:** Clicking options in MultiSelectField doesn't change selection

**Cause:** `handleFieldChange` not connected or not updating state

**Solution:**

1. Verify `handleFieldChange` is passed to MultiSelectField:
   ```typescript
   <MultiSelectField
     handleFieldChange={handleFieldChange}  // ← Must pass this
     // ...
   />
   ```

2. Verify `handleFieldChange` updates state correctly:
   ```typescript
   const handleFieldChange = (name: string, value: any) => {
     setCurrentData(prev => ({ ...prev, [name]: value }));
   };
   ```

3. Check that value is an array:
   ```typescript
   // Should be array of strings:
   equipmentAssigned: ["2044", "2047"]  // ✅ Correct
   equipmentAssigned: "2044"  // ❌ Wrong (should be array)
   ```

---

### Problem: Save Fails with Validation Error

**Symptom:** Save button doesn't work, shows validation errors

**Cause:** Zod schema doesn't match field types

**Solution:**

1. Check exact error in browser console:
   ```typescript
   // Console will show: "Expected string, received number" etc.
   ```

2. Verify field types match schema:
   ```typescript
   // If field is checkbox (boolean):
   vpnAccess: z.boolean().optional()  // ✅ Correct
   vpnAccess: z.string().optional()  // ❌ Wrong

   // If field is file ID (number):
   profilePhoto: z.number().optional()  // ✅ Correct
   profilePhoto: z.string().optional()  // ❌ Wrong
   ```

3. Check that optional fields use `.optional()`:
   ```typescript
   gender: z.string().optional()  // ✅ Can be undefined
   gender: z.string()  // ❌ Always required
   ```

---

### Problem: Changes Don't Persist After Save

**Symptom:** Save succeeds but changes disappear after refresh

**Cause:** Not persisting to Bitrix24 or cache not updating

**Solution:**

1. Check PATCH request payload in Network tab:
   ```json
   {
     "gender": "2003",
     "equipmentAssigned": ["2044", "2047"]
   }
   ```

2. Verify backend FIELD_MAP includes your field:
   ```typescript
   // In admin.ts:
   const FIELD_MAP = {
     gender: 'ufCrm6PersonalGender',  // ← Must map frontend → Bitrix
     // ...
   };
   ```

3. Check Bitrix24 API response for errors:
   ```typescript
   // Should return updated employee object:
   { success: true, employee: { ... } }
   ```

4. Verify cache invalidation happens:
   ```typescript
   // After save, should refetch:
   queryClient.invalidateQueries({ queryKey: ['employee', bitrixId] });
   ```

---

### Problem: File Fields Show Incorrect Count

**Symptom:** FileField shows "3 files attached" but should be "1 file"

**Cause:** Field value is wrong type (array vs single number)

**Solution:**

1. Check Bitrix24 field type:
   - Single file: `ufCrm6ProfilePhoto` → number
   - Multiple files: `ufCrm6DrugTest` → number[]

2. Update data mapping:
   ```typescript
   // Single file:
   profilePhoto: employee.ufCrm6ProfilePhoto || null  // number or null

   // Multiple files:
   drugTest: employee.ufCrm6DrugTest || []  // number[] or empty array
   ```

3. FileField component automatically handles both:
   ```typescript
   const fileCount = Array.isArray(value) ? value.length : (hasFiles ? 1 : 0);
   ```

---

### Problem: TypeScript Errors After Adding Fields

**Symptom:** Red squiggly lines in VS Code, build fails

**Cause:** Type definitions don't include new fields

**Solution:**

1. Add fields to type definition file if it exists:
   ```typescript
   // frontend/src/types/employee.ts (if exists):
   interface Employee {
     // ... existing fields
     gender?: string;
     profilePhoto?: number;
     equipmentAssigned?: string[];
     // ... new fields
   }
   ```

2. Or use `any` type temporarily (not recommended for production):
   ```typescript
   const currentData: any = { ... };
   ```

3. Rebuild TypeScript:
   ```bash
   npm run build
   ```

---

### Problem: Dropdown Shows Empty Options

**Symptom:** Select dropdown opens but shows no options

**Cause:** Options array is empty or not imported

**Solution:**

1. Verify import at top of file:
   ```typescript
   import { GENDER_OPTIONS } from '@/lib/bitrixFieldOptions';
   ```

2. Check options constant exists:
   ```typescript
   // In bitrixFieldOptions.ts:
   export const GENDER_OPTIONS = [
     { value: '', label: 'Select Gender' },
     { value: '2002', label: 'Female' },
     { value: '2003', label: 'Male' },
   ];
   ```

3. Verify options are passed to Field:
   ```typescript
   <Field
     type="select"
     options={GENDER_OPTIONS}  // ← Check this
   />
   ```

---

### Problem: Section Doesn't Expand

**Symptom:** Clicking section header doesn't expand/collapse

**Cause:** Section state not updating

**Solution:**

1. Verify section is in `openSections` state:
   ```typescript
   const [openSections, setOpenSections] = useState({
     personal: true,
     training: false,  // ← Add your section here
     // ...
   });
   ```

2. Verify `toggleSection` function exists:
   ```typescript
   const toggleSection = (section: string) => {
     setOpenSections(prev => ({
       ...prev,
       [section]: !prev[section]
     }));
   };
   ```

3. Check Section component usage:
   ```typescript
   <Section
     title="Training & Compliance"
     isOpen={openSections.training}  // ← Check state key
     onToggle={() => toggleSection('training')}  // ← Check key matches
   >
   ```

---

### Problem: 403 Forbidden Error on Save

**Symptom:** Save fails with "Forbidden - Admin access required"

**Cause:** Session doesn't have `hr_admin` role

**Solution:**

1. Verify your session role:
   ```sql
   SELECT role FROM sessions WHERE id = 'your-session-id';
   ```

2. Update role in database if needed:
   ```sql
   UPDATE sessions SET role = 'hr_admin' WHERE employee_id = YOUR_ID;
   ```

3. Log out and log back in to refresh session

---

### Problem: Changes Affect Wrong Employee

**Symptom:** Saving changes updates a different employee

**Cause:** `bitrixId` parameter is wrong

**Solution:**

1. Verify URL parameter:
   ```typescript
   const searchParams = useSearchParams();
   const bitrixId = searchParams.get('id');  // ← Check this value
   ```

2. Check API call uses correct ID:
   ```typescript
   api.updateEmployeeDetail(bitrixId, updates);  // ← bitrixId, not employee.id
   ```

3. Verify backend receives correct ID:
   ```typescript
   // admin.ts:
   adminRoutes.patch('/employee/:bitrixId', async (c) => {
     const bitrixId = parseInt(c.req.param('bitrixId'));  // ← Check logs
   });
   ```

---

## Maintenance Guidelines

### Future Field Additions

When Bitrix24 adds new custom fields:

1. **Add to Backend Type Definition:**
   ```typescript
   // cloudflare-app/workers/types.ts:
   export interface BitrixEmployee {
     // ...
     ufCrm6NewField?: string;  // Add here
   }
   ```

2. **Add to Frontend Options (if select/multiselect):**
   ```typescript
   // frontend/src/lib/bitrixFieldOptions.ts:
   export const NEW_FIELD_OPTIONS = [
     { value: '', label: 'Not Selected' },
     { value: '2100', label: 'Option 1' },
     // ...
   ];
   ```

3. **Add to Field Mapping:**
   ```typescript
   // cloudflare-app/workers/routes/admin.ts:
   const FIELD_MAP = {
     // ...
     newField: 'ufCrm6NewField',
   };
   ```

4. **Add to Validation Schema:**
   ```typescript
   // frontend/src/app/admin/employees/detail/page.tsx:
   const employeeSchema = z.object({
     // ...
     newField: z.string().optional(),
   });
   ```

5. **Add to UI:**
   ```typescript
   // In appropriate section:
   <Field
     label="New Field"
     value={currentData.newField}
     name="newField"
     // ...
   />
   ```

---

### Option Value Changes

If Bitrix24 changes option IDs (e.g., "Male" changes from 2003 to 3001):

1. **Update in bitrixFieldOptions.ts:**
   ```typescript
   export const GENDER_OPTIONS = [
     { value: '', label: 'Select Gender' },
     { value: '2002', label: 'Female' },
     { value: '3001', label: 'Male' },  // ← Updated ID
   ];
   ```

2. **Verify in Bitrix24 Admin:**
   - Go to CRM → Settings → Custom Fields
   - Find HR Center SPA entity type
   - Check "Gender" field options
   - Copy exact option IDs

3. **Test Existing Data:**
   - Old records may have old option IDs
   - Add backwards compatibility if needed:
   ```typescript
   const normalizeGender = (value: string) => {
     if (value === '2003') return '3001';  // Map old ID to new
     return value;
   };
   ```

---

### Performance Optimization

As employee count grows, consider these optimizations:

1. **Employee List Pagination:**
   ```typescript
   // Add limit/offset to employee list endpoint
   adminRoutes.get('/employees?limit=50&offset=0')
   ```

2. **Field-Level Caching:**
   ```typescript
   // Cache individual employee fields in KV:
   await env.CACHE.put(`emp:${id}:gender`, gender, { expirationTtl: 3600 });
   ```

3. **Lazy Load Sections:**
   ```typescript
   // Only fetch section data when expanded:
   const { data: trainingData } = useQuery({
     queryKey: ['employee', id, 'training'],
     queryFn: () => api.getEmployeeTraining(id),
     enabled: openSections.training,  // Only fetch when open
   });
   ```

4. **Debounce Search:**
   ```typescript
   // Add debounce to employee search:
   const debouncedSearch = useDebouncedValue(searchQuery, 300);
   ```

---

### Security Best Practices

**Sensitive Field Access Control:**

Some fields should only be visible to specific roles:

```typescript
// Add role check for sensitive fields:
const canViewPayRate = session.role === 'hr_admin' || session.role === 'finance';

{canViewPayRate && (
  <Field
    label="Pay Rate/Salary"
    value={currentData.payRate}
    // ...
  />
)}
```

**Audit Log Monitoring:**

Regularly check audit logs for suspicious activity:

```sql
SELECT * FROM audit_logs
WHERE action = 'employee_update'
AND metadata LIKE '%ssn%'
ORDER BY timestamp DESC
LIMIT 100;
```

**Field Masking:**

Ensure sensitive fields remain masked:

```typescript
// SSN: Always mask in display mode
displayValue = currentData.ssn ? `***-**-${currentData.ssn.slice(-4)}` : '—';

// Bank Account: Always mask
displayValue = currentData.bankAccountNumber ? `****${value.slice(-4)}` : '—';
```

---

### Backup and Recovery

**Before Major Updates:**

1. **Export All Employee Data:**
   ```bash
   # Create full backup of employee_cache table:
   wrangler d1 execute hartzell-hr-db --command "SELECT * FROM employee_cache" > backup.sql
   ```

2. **Test on Staging First:**
   - Deploy to staging environment
   - Test all fields with real data
   - Verify no data corruption
   - Then deploy to production

3. **Have Rollback Plan:**
   - Keep previous deployment in Cloudflare Pages history
   - Know how to revert: `wrangler pages deployment list`
   - Can rollback frontend instantly without data loss

---

### Documentation Updates

When adding new fields, update these documents:

1. **This Guide:** Add new field to "Detailed Field-by-Field Implementation" section
2. **README.md:** Update field count (currently "100+ fields")
3. **API Documentation:** Document new endpoints/parameters
4. **Bitrix24 Field Inventory:** Update BITRIX_FIELD_INVENTORY.csv

---

## Appendix

### Complete Field Checklist

Use this checklist to track implementation progress:

**Personal Information:**
- [ ] Profile Photo (file)

**Employment Details:**
- [ ] Pay Rate (text)
- [ ] Sales Territory (select)
- [ ] Project Category (select)

**Training & Compliance:**
- [ ] Required Training Status (select)
- [ ] Safety Training Status (select)
- [ ] Compliance Training Status (select)
- [ ] Training Completion Date (date)
- [ ] Next Training Due (date)
- [ ] Training Notes (textarea)
- [ ] Required Training Completion (file)
- [ ] Professional Certifications (file)
- [ ] Training Records (file)
- [ ] Skills Assessment (file)
- [ ] Training Documents (file)

**IT & Equipment:**
- [ ] Equipment Assigned (multiselect - replace TagField)
- [ ] Equipment Status (select)
- [ ] Equipment Return Tracking (text)
- [ ] Software Access (multiselect)
- [ ] Access Level (select)
- [ ] Security Clearance (select)
- [ ] Network Status (select)
- [ ] VPN Access (checkbox)
- [ ] Remote Access Approved (checkbox)

**Vehicle & Licensing:**
- [ ] Driver's License (file)
- [ ] Auto Insurance (file)

**Tax & Payroll:**
- [ ] W-4 Exemptions (text)
- [ ] W-4 Form (file)
- [ ] I-9 Form (file)
- [ ] Multiple Jobs Worksheet (file)
- [ ] Deductions Worksheet (file)

**Banking:**
- [ ] Direct Deposit Authorization (file)

**Existing Fields to Fix:**
- [ ] Gender (use correct options)
- [ ] Marital Status (use correct options)
- [ ] Citizenship Status (use correct options)
- [ ] Payment Method (use correct options)
- [ ] Tax Filing Status (use correct options)
- [ ] Subsidiary (use correct options)
- [ ] Bank Account Type (use correct options)

**Total: 33 items to implement**

---

### Quick Reference: Bitrix Field Name Pattern

All Bitrix24 custom fields follow this pattern:

```
ufCrm6FieldName
├─ uf = User Field (custom field)
├─ Crm = CRM module
├─ 6 = Entity Type ID (HR Center SPA)
└─ FieldName = CamelCase field name
```

**Examples:**
- `ufCrm6Name` → First Name
- `ufCrm6PersonalGender` → Gender
- `ufCrm6EquipmentAssigned` → Equipment Assigned (multiselect)
- `ufCrm6VpnAccess` → VPN Access (checkbox)

**Special Cases:**
- `ufCrm6_1748054470` → Auto-generated ID for "Office Extension"
- `ufCrm_6_UF_USR_1737120507262` → Underscores for system-generated fields

---

### Contact and Support

**Implementation Questions:**
- Review this guide thoroughly first
- Check Troubleshooting section for common issues
- Consult existing code patterns in `page.tsx`

**Bitrix24 Field Questions:**
- Log into Bitrix24 admin panel
- Navigate to: CRM → Settings → Custom Fields → HR Center SPA
- Verify field names, types, and option values

**Cloudflare Workers Questions:**
- Check logs: `wrangler tail --env production`
- Review API responses in browser DevTools Network tab

---

## Final Notes

### Implementation Order Recommendation

Based on business priority, implement in this order:

1. **Phase 2:** Fix existing fields with wrong options (30 min) - **HIGH PRIORITY**
2. **Phase 3:** Add Employment Details (Pay Rate, Territory, Category) - **HIGH PRIORITY**
3. **Phase 4:** Add Training & Compliance fields - **HIGH PRIORITY**
4. **Phase 5:** Add IT & Equipment fields - **MEDIUM PRIORITY**
5. **Phase 7:** Add Tax & Payroll file fields - **MEDIUM PRIORITY**
6. **Phase 6:** Add Vehicle & Licensing fields - **LOW PRIORITY**
7. **Phase 8-9:** Add Banking and Personal file fields - **LOW PRIORITY**

**Reason:** Employment and Training fields are most frequently used. File fields are "nice to have" for now since file management requires additional R2 integration.

---

### Success Metrics

You'll know implementation is complete when:

✅ All 33 missing fields display in employee detail page
✅ All select fields show human-readable labels (not IDs)
✅ MultiSelect fields allow multiple selections
✅ File fields accurately show attachment status
✅ All validation rules prevent invalid data
✅ Changes persist to Bitrix24 after save
✅ No TypeScript or console errors
✅ Page loads in <3 seconds
✅ All tests pass

---

**End of Implementation Guide**

This document provides everything needed to complete the Bitrix24 field implementation. Follow the phases systematically, test thoroughly, and refer back to this guide as needed.

Good luck with the implementation! 🚀
