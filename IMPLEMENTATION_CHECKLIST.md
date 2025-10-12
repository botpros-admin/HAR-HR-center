# Bitrix24 HR Center - Implementation Checklist

## Quick Reference for Adding Missing Fields

This checklist provides a step-by-step guide for implementing the 110 missing fields identified in the field analysis.

---

## Phase 1: Critical Required Fields (17 fields)
**Priority:** URGENT - Blocks employee onboarding
**Estimated Time:** 2-3 weeks

### Emergency Contact Section (NEW SECTION) - 3 fields
- [ ] `ufCrm6EmergencyContactName` - Emergency Contact Name (string, required)
- [ ] `ufCrm6EmergencyContactPhone` - Emergency Contact Phone (string, required)
- [ ] `ufCrm6Relationship` - Emergency Contact Relationship (string, required)

**Implementation Notes:**
- Create new collapsible section "Emergency Contact"
- All three fields are required
- Add validation for phone number format

---

### Personal Information Updates - 3 fields
- [ ] `ufCrm6PersonalGender` - Sex (enumeration, required)
  - Values: 2002=Female, 2003=Male
- [ ] `ufCrm6Citizenship` - Citizenship Status (enumeration, required)
  - Values: 2026=US Citizen, 2027=Permanent Resident, 2028=Work Visa, 2029=Other
- [ ] `ufCrm6UfLegalAddress` - Address (address type, required)
  - **REPLACE** current `ufCrm6Address` string field
  - This is a structured address object with city, state, zip, etc.
  - Includes map integration

**Implementation Notes:**
- Use dropdown components for enumerations
- Address field needs special handling - it's an object, not a string
- Update validation schema in both frontend and backend

---

### Tax & Payroll Section (NEW SECTION) - 4 fields
- [ ] `ufCrm_6_UF_USR_1737120507262` - Payment Method (enumeration, required)
  - Values: 2010=Direct Deposit, 2011=Check
- [ ] `ufCrm6TaxFilingStatus` - Tax Filing Status (enumeration, required)
  - Values: 2039=Single, 2040=Married Filing Jointly, 2041=Married Filing Separately, 2042=Head of Household
- [ ] `ufCrm_6_UF_W4_FILE` - W-4 Form (file[], required, multiple)
- [ ] `ufCrm_6_UF_I9_FILE` - I-9 Form (file[], required, multiple)

**Implementation Notes:**
- Create new collapsible section "Tax & Payroll Information"
- File upload fields need array handling
- Add SSN field to this section (already in UI, just move it here)

---

### Onboarding Documents Section (NEW SECTION) - 2 fields
- [ ] `ufCrm6HiringPaperwork` - Hiring Paperwork (file[], required, multiple)
- [ ] `ufCrm6HandbookAck` - Employee Handbook Acknowledgment (file, required)

**Implementation Notes:**
- Create new collapsible section "Onboarding Documents"
- Multiple file upload support needed
- Display list of uploaded files with download links

---

### Training Compliance Section (NEW SECTION) - 3 fields
- [ ] `ufCrm6RequiredTraining` - Required Training Status (enumeration, required)
  - Values: 2073=Not Started, 2074=In Progress, 2075=Completed, 2076=Expired
- [ ] `ufCrm6SafetyTraining` - Safety Training Status (enumeration, required)
  - Values: 2077=Not Started, 2078=In Progress, 2079=Completed, 2080=Expired
- [ ] `ufCrm6ComplianceTraining` - Compliance Training Status (enumeration, required)
  - Values: 2081=Not Started, 2082=In Progress, 2083=Completed, 2084=Expired

**Implementation Notes:**
- Create new collapsible section "Training Compliance"
- Use status badges with colors (Not Started=gray, In Progress=blue, Completed=green, Expired=red)
- Consider adding visual indicators for expired training

---

## Phase 2: High Priority Operational Fields (22 fields)
**Priority:** HIGH - Improves operational efficiency
**Estimated Time:** 2-3 weeks

### Banking & Direct Deposit Section (NEW SECTION) - 7 fields
- [ ] `ufCrm6BankName` - Bank Name (string)
- [ ] `ufCrm6BankAccountName` - Bank Account Holder Name (string)
- [ ] `ufCrm6BankAccountType` - Bank Account Type (enumeration)
  - Values: 2036=Checking, 2037=Savings, 2038=Money Market
- [ ] `ufCrm6BankRouting` - Bank Routing Number (string) **SENSITIVE**
- [ ] `ufCrm6BankAccountNumber` - Bank Account Number (string) **SENSITIVE**
- [ ] `ufCrm6DirectDeposit` - Direct Deposit Authorization (file)
- [ ] Move `ufCrm_6_UF_USR_1737120507262` (Payment Method) here from Phase 1

**Implementation Notes:**
- Create new collapsible section "Banking & Direct Deposit"
- Mask/redact routing and account numbers (show only last 4 digits)
- Add "Show/Hide" toggle for sensitive fields
- Require additional authentication for editing sensitive fields
- Add to SENSITIVE_FIELDS array in backend

---

### Contact Information Expansion - 3 fields
- [ ] `ufCrm6WorkPhone` - Work Cellphone (string, 12 chars)
- [ ] `ufCrm6PersonalPhone` - Direct Office Phone (string, 12 chars)
- [ ] `ufCrm6_1748054470` - Office Phone Extension (string)

**Implementation Notes:**
- Add to existing "Personal Information" section
- Distinguish between personal phone (already in UI) and work phone (new)
- Add phone number format validation

---

### Compensation Details - 3 fields
- [ ] `ufCrm6PayRate` - Pay Rate/Salary (string) **SENSITIVE**
- [ ] `ufCrm6BenefitsEligible` - Benefits Eligible (boolean)
- [ ] `ufCrm6WcCode` - WC Code (integer) - Workers' Compensation Code

**Implementation Notes:**
- Add to existing "Compensation & Benefits" section
- Mask/redact salary field
- Add role-based access control (HR Admin only for salary)
- WC Code is an integer input field

---

### IT & Equipment Expansion - 9 fields
- [ ] `ufCrm6SoftwareAccess` - Software Access (enumeration[], multiple)
  - Values: 2050=Office 365, 2051=CRM, 2052=Accounting, 2053=Design Software, 2054=Development Tools, 2055=Other
- [ ] `ufCrm6AccessPermissions` - Access Permissions (string[], multiple)
- [ ] `ufCrm6AccessLevel` - System Access Level (enumeration)
  - Values: 2057=Basic User, 2058=Power User, 2059=Administrator, 2060=Super Admin
- [ ] `ufCrm6SecurityClearance` - Security Clearance Level (enumeration)
  - Values: 2061=None, 2062=Confidential, 2063=Secret, 2064=Top Secret
- [ ] `ufCrm6NetworkStatus` - Network Account Status (enumeration)
  - Values: 2069=Active, 2070=Inactive, 2071=Suspended, 2072=Disabled
- [ ] `ufCrm6VpnAccess` - VPN Access (boolean)
- [ ] `ufCrm6RemoteAccess` - Remote Access Approved (boolean)
- [ ] `ufCrm6EquipmentReturn` - IT Equipment Return Tracking (string)
- [ ] `ufCrm6EquipmentStatus` - Equipment Status (enumeration)
  - Values: 2065=Issued, 2066=Returned, 2067=Lost, 2068=Damaged

**Implementation Notes:**
- Enhance existing "IT & Equipment" section
- Multi-select component for Software Access
- Status badges for Network Status and Equipment Status
- Checkboxes for VPN and Remote Access

---

## Phase 3: Enhanced Features (36 fields)
**Priority:** MEDIUM - Comprehensive data management
**Estimated Time:** 3-4 weeks

### Dependents & Beneficiaries Section (NEW SECTION) - 5 fields
- [ ] `ufCrm6DependentsInfo` - Dependents Information (string[], multiple)
- [ ] `ufCrm6DependentNames` - Dependent Names (string[], multiple)
- [ ] `ufCrm6DependentSsns` - Dependent SSNs (string[], multiple) **SENSITIVE**
- [ ] `ufCrm6DependentRelationships` - Dependent Relationships (string[], multiple)
- [ ] `ufCrm6LifeBeneficiaries` - Life Insurance Beneficiaries (string)

**Implementation Notes:**
- Create new collapsible section "Dependents & Beneficiaries"
- Array input fields with add/remove buttons
- Mask Dependent SSNs
- Consider creating a dynamic dependent entry form (Name + SSN + Relationship together)

---

### Tax Withholding Details - 5 fields
- [ ] `ufCrm6AdditionalFedWithhold` - Additional Federal Withholding (string)
- [ ] `ufCrm6AdditionalStateWithhold` - Additional State Withholding (string)
- [ ] `ufCrm_6_W4_EXEMPTIONS` - W-4 Exemptions Claimed (string)
- [ ] `ufCrm6MultipleJobsWorksheet` - Multiple Jobs Worksheet (file)
- [ ] `ufCrm6DeductionsWorksheet` - Deductions Worksheet (file)

**Implementation Notes:**
- Add to "Tax & Payroll Information" section
- Dollar amount inputs for withholding fields
- File upload for worksheets

---

### Training & Development Section (Enhanced) - 9 fields
- [ ] `ufCrm6TrainingComplete` - Required Training Completion (file[], multiple)
- [ ] `ufCrm6TrainingRecords` - Training Records (file[], multiple)
- [ ] `ufCrm6TrainingDocs` - Training Documents (file[], multiple)
- [ ] `ufCrm6SkillsAssessment` - Skills Assessment (file)
- [ ] `ufCrm6TrainingDate` - Training Completion Date (date)
- [ ] `ufCrm6NextTrainingDue` - Next Training Due Date (date)
- [ ] `ufCrm6TrainingNotes` - Training Notes (string)
- [ ] `ufCrm6SkillsLevel` - Skills Level (enumeration)
  - Values: 2085=Beginner, 2086=Intermediate, 2087=Advanced, 2088=Expert
- [ ] Move existing `ufCrm6Certifications` here (will fix type in Phase 4)

**Implementation Notes:**
- Enhance existing "Education & Skills" section or create new "Training & Development" section
- Add calendar/date pickers for training dates
- Show warnings for upcoming or past due training dates

---

### Document Management Section (NEW SECTION) - 8 fields
- [ ] `ufCrm6BackgroundCheck` - Background Check (file)
- [ ] `ufCrm6DrugTest` - Drug Test Results (file[], multiple)
- [ ] `ufCrm6Nda` - NDA Agreement (file)
- [ ] `ufCrm6Noncompete` - Non-Compete Agreement (file)
- [ ] `ufCrm6WorkVisa` - Work Visa/Permit (file)
- [ ] `ufCrm6VisaExpiry` - Work Authorization Expiry (date)
- [ ] Move `ufCrm6HiringPaperwork` here from Phase 1
- [ ] Move `ufCrm6HandbookAck` here from Phase 1

**Implementation Notes:**
- Create new collapsible section "Document Management"
- Organize by document type (Onboarding, Legal, Compliance, Work Authorization)
- Add document status tracking (Uploaded, Pending, Approved, Expired)
- Show expiry date warnings for visa

---

### Vehicle & Licensing Section (NEW SECTION) - 4 fields
- [ ] `ufCrm_6_UF_USR_1747966315398` - Driver's License (file)
- [ ] `ufCrm_6_UF_USR_1747966315398_EXPIRY` - Driver's License Expiry (string)
- [ ] `ufCrm_6_UF_USR_1737120327618` - Automobile Insurance (file)
- [ ] `ufCrm_6_UF_USR_1737120327618_EXPIRY` - Automobile Insurance Expiry (date)

**Implementation Notes:**
- Create new collapsible section "Vehicle & Licensing"
- Add expiry date warnings (30 days before expiration)
- Consider adding vehicle information fields if needed by business

---

### Employment History - 3 fields
- [ ] `ufCrm6ReviewDate` - Performance Review Date (date[], multiple)
- [ ] `ufCrm6TerminationDate` - Termination Date (date)
- [ ] `ufCrm6RehireEligible` - Rehire Eligible (boolean)

**Implementation Notes:**
- Add to existing "Employment Details" section
- Multiple date input for review dates
- Only show termination fields if employment status is inactive

---

### Company Information - 2 fields
- [ ] `ufCrm6Sales` - Sales Territory (enumeration)
  - Values: 2019=Northern, 2020=Southern
- [ ] `ufCrm_6_SALES_UF_USER_LEGAL_1740423289664` - Project Category (enumeration)
  - Values: 2015=Commercial, 2016=Community, 2017=Residential, 2018=Public Sector

**Implementation Notes:**
- Add to existing "Employment Details" section or create new "Company Information" section
- Only show if relevant to employee's role

---

## Phase 4: Fix Type Mismatches (4 fields)
**Priority:** HIGH - Fixes data integrity issues
**Estimated Time:** 1 week

### Type Corrections
- [ ] Fix `ufCrm6HealthInsurance` - Change from integer to file upload
  - Current: Checkbox (0/1)
  - Correct: File upload for enrollment documents
  - Migration: Need data migration plan for existing integer values

- [ ] Fix `ufCrm_6_401K_ENROLLMENT` - Change from integer to file upload
  - Current: Checkbox (0/1)
  - Correct: File upload for enrollment documents
  - Migration: Need data migration plan for existing integer values

- [ ] Fix `ufCrm6Certifications` - Change from string to file array
  - Current: Text area
  - Correct: Multiple file upload for certification documents
  - Migration: Parse existing text and preserve as notes field

- [ ] Replace `ufCrm6Address` with `ufCrm6UfLegalAddress` (already in Phase 1)
  - Current: Simple string field
  - Correct: Structured address object
  - Migration: Need to parse existing addresses and populate structured fields

**Implementation Notes:**
- Create data migration scripts
- Add backward compatibility during transition period
- Update validation schemas
- Test thoroughly before deploying to production

---

## Technical Implementation Guidelines

### Frontend (Next.js / React)

#### 1. Update Type Definitions
**File:** `/frontend/src/app/admin/employees/detail/page.tsx`

```typescript
// Update employeeSchema with new fields
const employeeSchema = z.object({
  // ... existing fields ...

  // Phase 1: Emergency Contact
  emergencyContactName: z.string().min(1, 'Required').max(100),
  emergencyContactPhone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone'),
  emergencyContactRelationship: z.string().min(1, 'Required').max(100),

  // Phase 1: Personal Info
  gender: z.string().min(1, 'Required'), // Enum ID as string
  citizenship: z.string().min(1, 'Required'), // Enum ID as string
  legalAddress: z.object({
    address_1: z.string().min(1, 'Required'),
    address_2: z.string().optional(),
    city: z.string().min(1, 'Required'),
    province: z.string().min(1, 'Required'),
    postal_code: z.string().min(1, 'Required'),
    country: z.string().min(1, 'Required'),
    country_code: z.string().optional(),
  }),

  // Phase 1: Tax & Payroll
  paymentMethod: z.string().min(1, 'Required'), // Enum ID
  taxFilingStatus: z.string().min(1, 'Required'), // Enum ID
  w4File: z.array(z.string()).optional(), // File IDs
  i9File: z.array(z.string()).optional(), // File IDs

  // Phase 1: Onboarding Docs
  hiringPaperwork: z.array(z.string()).min(1, 'Required'), // File IDs
  handbookAck: z.string().min(1, 'Required'), // File ID

  // Phase 1: Training
  requiredTraining: z.string().min(1, 'Required'), // Enum ID
  safetyTraining: z.string().min(1, 'Required'), // Enum ID
  complianceTraining: z.string().min(1, 'Required'), // Enum ID

  // Add more fields as needed...
});
```

#### 2. Update FIELD_MAP
**File:** `/cloudflare-app/workers/routes/admin.ts`

```typescript
const FIELD_MAP: Record<string, string> = {
  // ... existing mappings ...

  // Phase 1 mappings
  emergencyContactName: 'ufCrm6EmergencyContactName',
  emergencyContactPhone: 'ufCrm6EmergencyContactPhone',
  emergencyContactRelationship: 'ufCrm6Relationship',
  gender: 'ufCrm6PersonalGender',
  citizenship: 'ufCrm6Citizenship',
  legalAddress: 'ufCrm6UfLegalAddress',
  paymentMethod: 'ufCrm_6_UF_USR_1737120507262',
  taxFilingStatus: 'ufCrm6TaxFilingStatus',
  w4File: 'ufCrm_6_UF_W4_FILE',
  i9File: 'ufCrm_6_UF_I9_FILE',
  hiringPaperwork: 'ufCrm6HiringPaperwork',
  handbookAck: 'ufCrm6HandbookAck',
  requiredTraining: 'ufCrm6RequiredTraining',
  safetyTraining: 'ufCrm6SafetyTraining',
  complianceTraining: 'ufCrm6ComplianceTraining',

  // Add more mappings...
};
```

#### 3. Add Sensitive Fields
**File:** `/cloudflare-app/workers/routes/admin.ts`

```typescript
const SENSITIVE_FIELDS = [
  'ufCrm6Ssn',
  'ufCrm6Salary',
  'ufCrm6BankRoutingNumber',
  'ufCrm6BankAccountNumber',
  'ufCrm6DependentSsns',
  'ufCrm6PayRate',
];
```

#### 4. Create Reusable Components

**Enumeration Dropdown Component:**
```typescript
interface EnumOption {
  id: string;
  value: string;
}

const EnumField = ({
  label,
  value,
  name,
  options,
  required,
  onChange
}: {
  label: string;
  value: string;
  name: string;
  options: EnumOption[];
  required?: boolean;
  onChange: (value: string) => void;
}) => {
  return (
    <div>
      <label>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select...</option>
        {options.map(opt => (
          <option key={opt.id} value={opt.id}>{opt.value}</option>
        ))}
      </select>
    </div>
  );
};
```

**File Upload Component:**
```typescript
const FileUploadField = ({
  label,
  value,
  name,
  multiple,
  required,
  onChange
}: {
  label: string;
  value: string | string[];
  name: string;
  multiple?: boolean;
  required?: boolean;
  onChange: (fileIds: string | string[]) => void;
}) => {
  const handleUpload = async (file: File) => {
    // 1. Convert file to base64
    // 2. Call crm.file.upload API
    // 3. Get FILE_ID from response
    // 4. Call onChange with FILE_ID
  };

  return (
    <div>
      <label>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="file"
        multiple={multiple}
        onChange={(e) => {
          if (e.target.files) {
            // Handle file upload
          }
        }}
      />
      {/* Display existing files */}
    </div>
  );
};
```

**Address Field Component:**
```typescript
const AddressField = ({
  value,
  onChange
}: {
  value: {
    address_1: string;
    address_2?: string;
    city: string;
    province: string;
    postal_code: string;
    country: string;
  };
  onChange: (address: any) => void;
}) => {
  return (
    <div>
      <input
        placeholder="Street Address"
        value={value.address_1}
        onChange={(e) => onChange({...value, address_1: e.target.value})}
      />
      <input
        placeholder="Apt/Suite (optional)"
        value={value.address_2 || ''}
        onChange={(e) => onChange({...value, address_2: e.target.value})}
      />
      <input
        placeholder="City"
        value={value.city}
        onChange={(e) => onChange({...value, city: e.target.value})}
      />
      {/* Add state, zip, country */}
    </div>
  );
};
```

#### 5. Update UI Sections
Add new collapsible sections following the existing pattern in `page.tsx`.

---

### Backend (Cloudflare Workers)

#### 1. File Upload Handler
**File:** `/cloudflare-app/workers/lib/bitrix.ts`

The `uploadFileToEmployee` method already exists. Use it for file uploads:

```typescript
const fileId = await bitrix.uploadFileToEmployee(
  employeeId,
  fileName,
  fileContent,
  'ufCrm6HiringPaperwork' // field name
);
```

#### 2. Validation Updates
Update `EmployeeUpdateSchema` in `admin.ts` to include all new fields with proper validation.

#### 3. API Endpoint Updates
The existing PATCH endpoint at `/admin/employee/:bitrixId` already handles dynamic field updates via FIELD_MAP. Just add new fields to FIELD_MAP and they'll work automatically.

---

### Testing Checklist

For each new field, test:
- [ ] Field displays correctly in view mode
- [ ] Field is editable in edit mode
- [ ] Validation works (required fields, format validation)
- [ ] Data saves to Bitrix correctly
- [ ] Data retrieves from Bitrix correctly
- [ ] Enumeration values display properly
- [ ] File uploads work (single and multiple)
- [ ] File downloads work
- [ ] Multi-value fields handle arrays correctly
- [ ] Sensitive fields are masked/redacted
- [ ] Audit logs capture changes (with sensitive fields redacted)
- [ ] Role-based access control works (if applicable)

---

### Data Migration Plan

#### Before deploying Phase 4 type fixes:

1. **Export existing data**
   ```sql
   SELECT bitrix_id, data FROM employee_cache;
   ```

2. **For ufCrm6HealthInsurance and ufCrm_6_401K_ENROLLMENT:**
   - If value is 1 (Enrolled), create a placeholder file or note
   - If value is 0 (Not Enrolled), leave empty
   - Communicate to users that they need to upload actual documents

3. **For ufCrm6Certifications:**
   - Parse existing text into structured format
   - Create a migration script to preserve text as notes
   - Prompt users to upload actual certification documents

4. **For ufCrm6Address → ufCrm6UfLegalAddress:**
   - Parse existing address strings
   - Use geocoding API to structure addresses
   - Manual review of parsed data recommended

---

### Deployment Strategy

1. **Phase 1 (Critical):** Deploy to staging first, test thoroughly, then production
2. **Phase 2 (High Priority):** Deploy incrementally, section by section
3. **Phase 3 (Enhanced):** Deploy as complete features with full testing
4. **Phase 4 (Type Fixes):** Requires data migration - plan maintenance window

#### Rollout Plan:
- Week 1-2: Phase 1 development
- Week 3: Phase 1 testing & deployment
- Week 4-5: Phase 2 development
- Week 6: Phase 2 testing & deployment
- Week 7-9: Phase 3 development
- Week 10: Phase 3 testing & deployment
- Week 11: Phase 4 data migration & type fixes
- Week 12: Final testing & documentation

---

## Success Metrics

Track these metrics to measure implementation success:

1. **Field Coverage:** % of Bitrix fields available in UI (target: 95%+)
2. **Required Field Completion:** % of employees with all required fields filled (target: 100%)
3. **User Adoption:** % of HR users actively using new fields (target: 80%+)
4. **Data Quality:** % of fields with valid, complete data (target: 90%+)
5. **Error Rate:** Number of validation errors or failed saves (target: <5%)

---

## Support & Documentation

After implementation:
- [ ] Create user guide for HR admins
- [ ] Create training materials (videos/screenshots)
- [ ] Update API documentation
- [ ] Create field reference guide for users
- [ ] Set up help desk process for field-related questions

---

## Contact

For questions or issues during implementation:
- Technical issues: Check Bitrix24 API docs - https://dev.bitrix24.com/
- Business requirements: Consult with HR department
- Data migration: Plan carefully with database team

---

**Last Updated:** 2025-10-11
**Version:** 1.0
**Document Status:** Ready for Implementation
