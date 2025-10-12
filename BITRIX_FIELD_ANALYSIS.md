# Bitrix24 HR Center Field Analysis Report

**Entity Type ID:** 1054
**Total Fields Available:** 136 fields
**Fields Currently in UI:** 26 fields (19%)
**Missing Fields:** 110 fields (81%)

---

## Executive Summary

The Bitrix24 HR Center SPA contains **136 total fields** for managing employee data. Our current UI implementation only displays **26 fields (19%)**, leaving **110 fields (81%)** unmapped and unavailable to users. This analysis categorizes all available fields and identifies which ones should be prioritized for UI implementation.

---

## Fields Currently Implemented in UI

### Personal Information (8 fields)
- ✅ `ufCrm6Name` - First Name (string, required)
- ✅ `ufCrm6SecondName` - Middle Name (string)
- ✅ `ufCrm6LastName` - Last Name (string, required)
- ✅ `ufCrm6PreferredName` - Preferred Name (string)
- ✅ `ufCrm6PersonalBirthday` - Date of Birth (date, required)
- ✅ `ufCrm6Email` - Personal Email (string[], required, multiple)
- ✅ `ufCrm6PersonalMobile` - Personal Cellphone (string[], required, multiple)
- ✅ `ufCrm6Address` - Address (string) *Note: Uses old field, should map to `ufCrm6UfLegalAddress`*

### Employment Details (6 fields)
- ✅ `ufCrm6BadgeNumber` - Employee ID (string, required)
- ✅ `ufCrm6WorkPosition` - Position (string, required)
- ✅ `ufCrm6Subsidiary` - Subsidiary (enumeration, required)
- ✅ `ufCrm6EmploymentStatus` - Employment Status (boolean)
- ✅ `ufCrm6EmploymentStartDate` - Start Date (date, required)
- ✅ `ufCrm6EmploymentType` - Employment Type (enumeration, required)
- ✅ `ufCrm6Shift` - Shift (string)

### Compensation & Benefits (3 fields)
- ✅ `ufCrm6Ssn` - Social Security Number (string, required, 11 chars)
- ✅ `ufCrm6PtoDays` - PTO Days Allocated (string)
- ✅ `ufCrm6HealthInsurance` - Health Insurance Enrollment (file) *Note: UI treats as integer, but Bitrix is file type*
- ✅ `ufCrm_6_401K_ENROLLMENT` - 401k Enrollment (file) *Note: UI treats as integer, but Bitrix is file type*

### Education & Skills (5 fields)
- ✅ `ufCrm6EducationLevel` - Education Level (string)
- ✅ `ufCrm6SchoolName` - School (string)
- ✅ `ufCrm6GraduationYear` - Graduation Year (string)
- ✅ `ufCrm6FieldOfStudy` - Field of Study (string)
- ✅ `ufCrm6Skills` - Skills (string)
- ✅ `ufCrm6Certifications` - Certifications (string) *Note: UI treats as string, but Bitrix is file type (multiple)*

### IT & Equipment (2 fields)
- ✅ `ufCrm6SoftwareExperience` - Software Experience (string)
- ✅ `ufCrm6EquipmentAssigned` - Equipment Assigned (enumeration[], multiple)

### Additional Information (1 field)
- ✅ `ufCrm6AdditionalInfo` - Notes (string)

---

## Missing Fields by Category

### 1. Personal Information - MISSING (14 fields)

#### High Priority - Critical for HR Operations
- ❌ `ufCrm6PersonalGender` - Sex (enumeration: Female/Male, required) **[REQUIRED FIELD]**
- ❌ `ufCrm6EmergencyContactName` - Emergency Contact Name (string, required) **[REQUIRED FIELD]**
- ❌ `ufCrm6EmergencyContactPhone` - Emergency Contact Phone (string, required) **[REQUIRED FIELD]**
- ❌ `ufCrm6Relationship` - Emergency Contact Relationship (string, required) **[REQUIRED FIELD]**
- ❌ `ufCrm6UfLegalAddress` - Address (address type with map, required) **[REQUIRED FIELD - should replace current address field]**

#### Medium Priority
- ❌ `ufCrm6MaritalStatus` - Marital Status (enumeration: Single/Married/Divorced/Widowed/Separated)
- ❌ `ufCrm6Citizenship` - Citizenship Status (enumeration: US Citizen/Permanent Resident/Work Visa/Other, required) **[REQUIRED FIELD]**
- ❌ `ufCrm6ProfilePhoto` - Profile Photo (file)

#### Contact Information
- ❌ `ufCrm6WorkPhone` - Work Cellphone (string, 12 chars)
- ❌ `ufCrm6PersonalPhone` - Direct Office Phone (string, 12 chars)
- ❌ `ufCrm6_1748054470` - Office Phone Extension (string)

#### Work Authorization
- ❌ `ufCrm6WorkVisa` - Work Visa/Permit (file)
- ❌ `ufCrm6VisaExpiry` - Work Authorization Expiry (date)

#### Driver Information
- ❌ `ufCrm_6_UF_USR_1747966315398` - Driver's License (file)
- ❌ `ufCrm_6_UF_USR_1747966315398_EXPIRY` - Driver's License Expiry (string)

---

### 2. Company Information - MISSING (2 fields)

#### Sales/Territory Information
- ❌ `ufCrm6Sales` - Sales Territory (enumeration: Northern/Southern)
- ❌ `ufCrm_6_SALES_UF_USER_LEGAL_1740423289664` - Project Category (enumeration: Commercial/Community/Residential/Public Sector)

---

### 3. Employment Details - MISSING (5 fields)

#### Employment History & Status
- ❌ `ufCrm6ReviewDate` - Performance Review Date (date[], multiple)
- ❌ `ufCrm6TerminationDate` - Termination Date (date)
- ❌ `ufCrm6RehireEligible` - Rehire Eligible (boolean)

#### Compensation
- ❌ `ufCrm6PayRate` - Pay Rate/Salary (string)
- ❌ `ufCrm6BenefitsEligible` - Benefits Eligible (boolean)
- ❌ `ufCrm6WcCode` - WC Code (integer) - Workers' Compensation Code

---

### 4. Compensation & Benefits - MISSING (18 fields)

#### Banking & Direct Deposit - High Priority
- ❌ `ufCrm_6_UF_USR_1737120507262` - Payment Method (enumeration: Direct Deposit/Check, required) **[REQUIRED FIELD]**
- ❌ `ufCrm6BankName` - Bank Name (string)
- ❌ `ufCrm6BankAccountName` - Bank Account Holder Name (string)
- ❌ `ufCrm6BankAccountType` - Bank Account Type (enumeration: Checking/Savings/Money Market)
- ❌ `ufCrm6BankRouting` - Bank Routing Number (string)
- ❌ `ufCrm6BankAccountNumber` - Bank Account Number (string)
- ❌ `ufCrm6DirectDeposit` - Direct Deposit Authorization (file)

#### Life Insurance
- ❌ `ufCrm6LifeBeneficiaries` - Life Insurance Beneficiaries (string)

#### Tax Information - Critical for Payroll
- ❌ `ufCrm6TaxFilingStatus` - Tax Filing Status (enumeration: Single/Married Filing Jointly/Married Filing Separately/Head of Household, required) **[REQUIRED FIELD]**
- ❌ `ufCrm6DependentsInfo` - Dependents Information (string[], multiple)
- ❌ `ufCrm6DependentNames` - Dependent Names (string[], multiple)
- ❌ `ufCrm6DependentSsns` - Dependent SSNs (string[], multiple)
- ❌ `ufCrm6DependentRelationships` - Dependent Relationships (string[], multiple)
- ❌ `ufCrm6AdditionalFedWithhold` - Additional Federal Withholding (string)
- ❌ `ufCrm6AdditionalStateWithhold` - Additional State Withholding (string)
- ❌ `ufCrm6MultipleJobsWorksheet` - Multiple Jobs Worksheet (file)
- ❌ `ufCrm6DeductionsWorksheet` - Deductions Worksheet (file)
- ❌ `ufCrm_6_W4_EXEMPTIONS` - W-4 Exemptions Claimed (string)

---

### 5. Documents & Attachments - MISSING (16 fields)

#### Onboarding Documents - Critical
- ❌ `ufCrm6HiringPaperwork` - Hiring Paperwork (file[], required, multiple) **[REQUIRED FIELD]**
- ❌ `ufCrm_6_UF_W4_FILE` - W-4 Form (file[], required, multiple) **[REQUIRED FIELD]**
- ❌ `ufCrm_6_UF_I9_FILE` - I-9 Form (file[], required, multiple) **[REQUIRED FIELD]**
- ❌ `ufCrm6HandbookAck` - Employee Handbook Acknowledgment (file, required) **[REQUIRED FIELD]**

#### Legal & Compliance Documents
- ❌ `ufCrm6BackgroundCheck` - Background Check (file)
- ❌ `ufCrm6DrugTest` - Drug Test Results (file[], multiple)
- ❌ `ufCrm6Nda` - NDA Agreement (file)
- ❌ `ufCrm6Noncompete` - Non-Compete Agreement (file)

#### Vehicle & Insurance
- ❌ `ufCrm_6_UF_USR_1737120327618` - Automobile Insurance (file)
- ❌ `ufCrm_6_UF_USR_1737120327618_EXPIRY` - Automobile Insurance Expiry (date)

---

### 6. Education & Training - MISSING (12 fields)

#### Training Status - Important for Compliance
- ❌ `ufCrm6RequiredTraining` - Required Training Status (enumeration: Not Started/In Progress/Completed/Expired, required) **[REQUIRED FIELD]**
- ❌ `ufCrm6SafetyTraining` - Safety Training Status (enumeration: Not Started/In Progress/Completed/Expired, required) **[REQUIRED FIELD]**
- ❌ `ufCrm6ComplianceTraining` - Compliance Training Status (enumeration: Not Started/In Progress/Completed/Expired, required) **[REQUIRED FIELD]**

#### Training Documents & Records
- ❌ `ufCrm6TrainingComplete` - Required Training Completion (file[], multiple)
- ❌ `ufCrm6TrainingRecords` - Training Records (file[], multiple)
- ❌ `ufCrm6TrainingDocs` - Training Documents (file[], multiple)
- ❌ `ufCrm6SkillsAssessment` - Skills Assessment (file)

#### Training Tracking
- ❌ `ufCrm6TrainingDate` - Training Completion Date (date)
- ❌ `ufCrm6NextTrainingDue` - Next Training Due Date (date)
- ❌ `ufCrm6TrainingNotes` - Training Notes (string)

#### Skills Assessment
- ❌ `ufCrm6SkillsLevel` - Skills Level (enumeration: Beginner/Intermediate/Advanced/Expert)

---

### 7. IT & Equipment - MISSING (9 fields)

#### Software & Access
- ❌ `ufCrm6SoftwareAccess` - Software Access (enumeration[], multiple: Office 365/CRM/Accounting/Design Software/Development Tools/Other)
- ❌ `ufCrm6AccessPermissions` - Access Permissions (string[], multiple)
- ❌ `ufCrm6AccessLevel` - System Access Level (enumeration: Basic User/Power User/Administrator/Super Admin)
- ❌ `ufCrm6SecurityClearance` - Security Clearance Level (enumeration: None/Confidential/Secret/Top Secret)

#### Network & Remote Access
- ❌ `ufCrm6NetworkStatus` - Network Account Status (enumeration: Active/Inactive/Suspended/Disabled)
- ❌ `ufCrm6VpnAccess` - VPN Access (boolean)
- ❌ `ufCrm6RemoteAccess` - Remote Access Approved (boolean)

#### Equipment Tracking
- ❌ `ufCrm6EquipmentReturn` - IT Equipment Return Tracking (string)
- ❌ `ufCrm6EquipmentStatus` - Equipment Status (enumeration: Issued/Returned/Lost/Damaged)

---

### 8. System/Meta Fields (34 fields - READ-ONLY)

These are Bitrix system fields that are automatically managed:

#### Record Management
- `id` - ID (integer, read-only)
- `title` - Name (string)
- `xmlId` - External ID (string)
- `createdTime` - Created on (datetime, read-only)
- `updatedTime` - Updated on (datetime, read-only)
- `createdBy` - Created by (user, read-only)
- `updatedBy` - Updated by (user, read-only)
- `assignedById` - Responsible person (user)
- `opened` - Available to everyone (boolean, required)
- `webformId` - Created by CRM form (integer)

#### Communication Tracking
- `lastCommunicationTime` - Last contact (string, read-only)
- `lastCommunicationCallTime` - Last call (datetime, read-only)
- `lastCommunicationEmailTime` - Last email (datetime, read-only)
- `lastCommunicationImolTime` - Last Open Channel conversation (datetime, read-only)
- `lastCommunicationWebformTime` - Last CRM form submitted (datetime, read-only)

#### Pipeline & Stage Management
- `categoryId` - Pipeline (crm_category)
- `stageId` - Stage (crm_status)
- `previousStageId` - Previous stage (crm_status, read-only)
- `movedTime` - Stage change date (datetime, read-only)
- `movedBy` - Stage changed by (user, read-only)

#### Activity Tracking
- `lastActivityBy` - Last timeline activity by (user, read-only)
- `lastActivityTime` - Last updated on (datetime, read-only)

**Note:** These system fields are typically displayed in a separate "System Information" or "History" section and should not be editable by users.

---

## Field Type Analysis

### Data Type Distribution
- **String**: 51 fields (37.5%)
- **File**: 24 fields (17.6%)
- **Enumeration**: 23 fields (16.9%)
- **Date**: 12 fields (8.8%)
- **Boolean**: 8 fields (5.9%)
- **Integer**: 3 fields (2.2%)
- **Address**: 1 field (0.7%)
- **System types** (user, datetime, etc.): 14 fields (10.3%)

### Required Fields Status
- **Total Required Fields**: 27
- **Currently Implemented**: 10 (37%)
- **Missing from UI**: 17 (63%)

#### Critical Missing Required Fields:
1. `ufCrm6PersonalGender` - Sex
2. `ufCrm6EmergencyContactName` - Emergency Contact Name
3. `ufCrm6EmergencyContactPhone` - Emergency Contact Phone
4. `ufCrm6Relationship` - Emergency Contact Relationship
5. `ufCrm6Citizenship` - Citizenship Status
6. `ufCrm6UfLegalAddress` - Address (proper address type)
7. `ufCrm_6_UF_USR_1737120507262` - Payment Method
8. `ufCrm6TaxFilingStatus` - Tax Filing Status
9. `ufCrm6HiringPaperwork` - Hiring Paperwork
10. `ufCrm_6_UF_W4_FILE` - W-4 Form
11. `ufCrm_6_UF_I9_FILE` - I-9 Form
12. `ufCrm6HandbookAck` - Employee Handbook Acknowledgment
13. `ufCrm6RequiredTraining` - Required Training Status
14. `ufCrm6SafetyTraining` - Safety Training Status
15. `ufCrm6ComplianceTraining` - Compliance Training Status

### Multi-Value Fields
The following fields support multiple values (arrays):
- `ufCrm6Email` - Personal Email (✅ in UI)
- `ufCrm6PersonalMobile` - Personal Cellphone (✅ in UI)
- `ufCrm6EquipmentAssigned` - Equipment Assigned (✅ in UI)
- `ufCrm6ReviewDate` - Performance Review Date (❌ missing)
- `ufCrm6DependentsInfo` - Dependents Information (❌ missing)
- `ufCrm6DependentNames` - Dependent Names (❌ missing)
- `ufCrm6DependentSsns` - Dependent SSNs (❌ missing)
- `ufCrm6DependentRelationships` - Dependent Relationships (❌ missing)
- `ufCrm6AccessPermissions` - Access Permissions (❌ missing)
- `ufCrm6SoftwareAccess` - Software Access (❌ missing)
- Multiple file upload fields (various)

---

## Data Type Mismatches - CRITICAL ISSUES

The following fields have type mismatches between UI and Bitrix:

1. **ufCrm6HealthInsurance**
   - **Bitrix Type**: `file` (document upload)
   - **Current UI Type**: `integer` (0/1 checkbox)
   - **Impact**: Cannot upload enrollment documents

2. **ufCrm_6_401K_ENROLLMENT**
   - **Bitrix Type**: `file` (document upload)
   - **Current UI Type**: `integer` (0/1 checkbox)
   - **Impact**: Cannot upload enrollment documents

3. **ufCrm6Certifications**
   - **Bitrix Type**: `file[]` (multiple file uploads)
   - **Current UI Type**: `string` (text area)
   - **Impact**: Cannot upload certification documents

4. **ufCrm6Address**
   - **Current Field**: `ufCrm6Address` (simple string)
   - **Proper Field**: `ufCrm6UfLegalAddress` (address type with structured data and map)
   - **Impact**: Missing structured address data (street, city, state, zip, country)

---

## Recommendations

### Phase 1: Critical Required Fields (Immediate Priority)
These are required fields that employees cannot complete their profiles without:

1. **Emergency Contact Section** (NEW)
   - Emergency Contact Name
   - Emergency Contact Phone
   - Emergency Contact Relationship

2. **Personal Information Updates**
   - Sex/Gender
   - Citizenship Status
   - Replace current address with proper Address field (ufCrm6UfLegalAddress)

3. **Tax & Payroll Section** (NEW)
   - Payment Method (Direct Deposit/Check)
   - Tax Filing Status
   - W-4 Form upload
   - I-9 Form upload

4. **Onboarding Documents Section** (NEW)
   - Hiring Paperwork
   - Employee Handbook Acknowledgment

5. **Training Compliance Section** (NEW)
   - Required Training Status
   - Safety Training Status
   - Compliance Training Status

### Phase 2: High Priority Operational Fields
These fields are important for day-to-day HR operations:

1. **Banking & Direct Deposit Section** (NEW)
   - Bank Name
   - Bank Account Type
   - Bank Routing Number
   - Bank Account Number
   - Direct Deposit Authorization upload

2. **Contact Information Expansion**
   - Work Cellphone
   - Direct Office Phone
   - Office Phone Extension

3. **Compensation Details**
   - Pay Rate/Salary
   - Benefits Eligible
   - Workers' Compensation Code

4. **IT & Equipment Expansion**
   - Software Access
   - Access Level
   - Network Status
   - VPN Access
   - Remote Access Approved
   - Equipment Status tracking

### Phase 3: Enhanced Features
These fields add value but are not critical:

1. **Dependent & Family Information Section** (NEW)
   - Dependents Information
   - Dependent Names
   - Dependent SSNs
   - Dependent Relationships
   - Life Insurance Beneficiaries

2. **Tax Withholding Details**
   - Additional Federal Withholding
   - Additional State Withholding
   - W-4 Exemptions
   - Multiple Jobs Worksheet
   - Deductions Worksheet

3. **Training & Development Section** (Enhanced)
   - Training Documents
   - Training Records
   - Skills Assessment
   - Training Completion Date
   - Next Training Due Date
   - Training Notes
   - Skills Level

4. **Document Management Section** (NEW)
   - Background Check
   - Drug Test Results
   - NDA Agreement
   - Non-Compete Agreement
   - Work Visa/Permit
   - Visa Expiry Date

5. **Vehicle & Licensing Section** (NEW)
   - Driver's License
   - Driver's License Expiry
   - Automobile Insurance
   - Automobile Insurance Expiry

6. **Employment History**
   - Performance Review Dates
   - Termination Date
   - Rehire Eligible

7. **Company Information**
   - Sales Territory
   - Project Category

### Phase 4: Fix Type Mismatches
Fix the data type issues in existing fields:

1. Update `ufCrm6HealthInsurance` to file upload (from integer)
2. Update `ufCrm_6_401K_ENROLLMENT` to file upload (from integer)
3. Update `ufCrm6Certifications` to file upload array (from text)
4. Replace `ufCrm6Address` with `ufCrm6UfLegalAddress` (structured address)

---

## Proposed UI Structure

### Recommended Section Organization

```
1. Personal Information
   - Basic Info (Name, DOB, Gender, Preferred Name)
   - Contact Info (Personal Email, Personal Phone, Work Phone, Office Phone, Extension)
   - Address (Structured)
   - Profile Photo
   - Marital Status

2. Emergency Contact (NEW - CRITICAL)
   - Emergency Contact Name*
   - Emergency Contact Phone*
   - Relationship*

3. Employment Details
   - Badge Number, Position, Subsidiary
   - Employment Type, Status, Start Date, Shift
   - Pay Rate/Salary
   - Benefits Eligible
   - Sales Territory
   - Project Category
   - WC Code

4. Citizenship & Work Authorization (NEW)
   - Citizenship Status*
   - Work Visa/Permit (upload)
   - Work Authorization Expiry

5. Tax & Payroll Information (NEW - CRITICAL)
   - Social Security Number*
   - Payment Method* (Direct Deposit/Check)
   - Tax Filing Status*
   - W-4 Exemptions
   - Additional Federal Withholding
   - Additional State Withholding

6. Banking & Direct Deposit (NEW - HIGH PRIORITY)
   - Bank Name
   - Account Holder Name
   - Account Type
   - Routing Number
   - Account Number
   - Direct Deposit Authorization (upload)

7. Dependents & Beneficiaries (NEW)
   - Dependent Names (multiple)
   - Dependent SSNs (multiple)
   - Dependent Relationships (multiple)
   - Dependents Information (multiple)
   - Life Insurance Beneficiaries

8. Compensation & Benefits
   - PTO Days
   - Health Insurance Enrollment (upload) [FIX TYPE]
   - 401k Enrollment (upload) [FIX TYPE]

9. Onboarding Documents (NEW - CRITICAL)
   - Hiring Paperwork* (upload, multiple)
   - W-4 Form* (upload, multiple)
   - I-9 Form* (upload, multiple)
   - Employee Handbook Acknowledgment* (upload)

10. Legal & Compliance Documents (NEW)
    - Background Check (upload)
    - Drug Test Results (upload, multiple)
    - NDA Agreement (upload)
    - Non-Compete Agreement (upload)
    - Multiple Jobs Worksheet (upload)
    - Deductions Worksheet (upload)

11. Education & Skills
    - Education Level, School Name, Graduation Year, Field of Study
    - Skills (text or use Skills Level dropdown)
    - Skills Level (Beginner/Intermediate/Advanced/Expert)
    - Skills Assessment (upload)

12. Certifications & Training (ENHANCED)
    - Professional Certifications (upload, multiple) [FIX TYPE]
    - Required Training Status*
    - Safety Training Status*
    - Compliance Training Status*
    - Training Completion Documents (upload, multiple)
    - Training Records (upload, multiple)
    - Training Documents (upload, multiple)
    - Training Completion Date
    - Next Training Due Date
    - Training Notes

13. IT & Equipment (ENHANCED)
    - Equipment Assigned (multi-select)
    - Equipment Status
    - Equipment Return Tracking
    - Software Access (multi-select)
    - Software Experience (text)
    - Access Permissions (multi-select)
    - System Access Level
    - Security Clearance Level
    - Network Account Status
    - VPN Access (checkbox)
    - Remote Access Approved (checkbox)

14. Vehicle & Licensing (NEW)
    - Driver's License (upload)
    - Driver's License Expiry
    - Automobile Insurance (upload)
    - Automobile Insurance Expiry

15. Performance & Reviews (NEW)
    - Performance Review Dates (multiple)
    - Termination Date
    - Rehire Eligible

16. Additional Information
    - Notes/Comments

17. System Information (Read-Only)
    - ID, Created Date, Updated Date
    - Created By, Updated By
    - Stage, Category, Last Activity
```

### Notes on Implementation:
- Fields marked with * are required
- Use collapsible sections (accordion style) to maintain space efficiency
- Group related fields logically
- File upload fields should show existing files and allow multiple uploads where applicable
- Multi-value fields need array input handling
- Enumeration fields should use dropdowns with proper value mapping

---

## Security Considerations

### Sensitive Fields Requiring Extra Protection:
1. `ufCrm6Ssn` - Social Security Number (already masked in UI)
2. `ufCrm6BankAccountNumber` - Bank Account Number (should be masked)
3. `ufCrm6BankRouting` - Bank Routing Number (should be masked)
4. `ufCrm6DependentSsns` - Dependent SSNs (should be masked)
5. `ufCrm6PayRate` - Pay Rate/Salary (should be role-restricted)

These fields should:
- Be masked/redacted in audit logs
- Require additional authentication for viewing/editing
- Be encrypted at rest
- Have role-based access controls (HR Admin only)

---

## Enumeration Value Mappings

### For dropdown implementations, here are the enum value mappings:

**ufCrm6PersonalGender** (Sex):
- ID: 2002 = "Female"
- ID: 2003 = "Male"

**ufCrm6MaritalStatus**:
- ID: 2021 = "Single"
- ID: 2022 = "Married"
- ID: 2023 = "Divorced"
- ID: 2024 = "Widowed"
- ID: 2025 = "Separated"

**ufCrm6Citizenship**:
- ID: 2026 = "US Citizen"
- ID: 2027 = "Permanent Resident"
- ID: 2028 = "Work Visa"
- ID: 2029 = "Other"

**ufCrm6EmploymentType**:
- ID: 2030 = "Full-Time"
- ID: 2031 = "Part-Time"
- ID: 2032 = "Contract"
- ID: 2033 = "Temporary"
- ID: 2034 = "Intern"
- ID: 2035 = "Seasonal"

**ufCrm6BankAccountType**:
- ID: 2036 = "Checking"
- ID: 2037 = "Savings"
- ID: 2038 = "Money Market"

**ufCrm6TaxFilingStatus**:
- ID: 2039 = "Single"
- ID: 2040 = "Married Filing Jointly"
- ID: 2041 = "Married Filing Separately"
- ID: 2042 = "Head of Household"

**ufCrm6EquipmentAssigned** (multiple):
- ID: 2043 = "Phone"
- ID: 2044 = "Laptop"
- ID: 2045 = "Tablet"
- ID: 2046 = "Desktop"
- ID: 2047 = "Monitor"
- ID: 2048 = "Headset"
- ID: 2049 = "Other"

**ufCrm6SoftwareAccess** (multiple):
- ID: 2050 = "Office 365"
- ID: 2051 = "CRM"
- ID: 2052 = "Accounting"
- ID: 2053 = "Design Software"
- ID: 2054 = "Development Tools"
- ID: 2055 = "Other"

**ufCrm6AccessLevel**:
- ID: 2057 = "Basic User"
- ID: 2058 = "Power User"
- ID: 2059 = "Administrator"
- ID: 2060 = "Super Admin"

**ufCrm6SecurityClearance**:
- ID: 2061 = "None"
- ID: 2062 = "Confidential"
- ID: 2063 = "Secret"
- ID: 2064 = "Top Secret"

**ufCrm6EquipmentStatus**:
- ID: 2065 = "Issued"
- ID: 2066 = "Returned"
- ID: 2067 = "Lost"
- ID: 2068 = "Damaged"

**ufCrm6NetworkStatus**:
- ID: 2069 = "Active"
- ID: 2070 = "Inactive"
- ID: 2071 = "Suspended"
- ID: 2072 = "Disabled"

**ufCrm6RequiredTraining**:
- ID: 2073 = "Not Started"
- ID: 2074 = "In Progress"
- ID: 2075 = "Completed"
- ID: 2076 = "Expired"

**ufCrm6SafetyTraining**:
- ID: 2077 = "Not Started"
- ID: 2078 = "In Progress"
- ID: 2079 = "Completed"
- ID: 2080 = "Expired"

**ufCrm6ComplianceTraining**:
- ID: 2081 = "Not Started"
- ID: 2082 = "In Progress"
- ID: 2083 = "Completed"
- ID: 2084 = "Expired"

**ufCrm6SkillsLevel**:
- ID: 2085 = "Beginner"
- ID: 2086 = "Intermediate"
- ID: 2087 = "Advanced"
- ID: 2088 = "Expert"

**ufCrm_6_UF_USR_1737120507262** (Payment Method):
- ID: 2010 = "Direct Deposit"
- ID: 2011 = "Check"

**ufCrm6Subsidiary**:
- ID: 2012 = "Construction"
- ID: 2013 = "Painting"
- ID: 2014 = "Windows & Doors"

**ufCrm_6_SALES_UF_USER_LEGAL_1740423289664** (Project Category):
- ID: 2015 = "Commercial"
- ID: 2016 = "Community"
- ID: 2017 = "Residential"
- ID: 2018 = "Public Sector"

**ufCrm6Sales** (Sales Territory):
- ID: 2019 = "Northern"
- ID: 2020 = "Southern"

---

## Implementation Priority Matrix

### Critical (Must Have - Phase 1)
**17 Required Fields Missing:**
1. Sex/Gender
2-4. Emergency Contact (Name, Phone, Relationship)
5. Citizenship Status
6. Legal Address (proper type)
7. Payment Method
8. Tax Filing Status
9-11. Required Documents (W-4, I-9, Hiring Paperwork)
12. Handbook Acknowledgment
13-15. Training Status (Required, Safety, Compliance)

**Impact:** Cannot complete employee onboarding without these fields
**Estimated Fields to Add:** 17 fields
**Estimated Development Time:** 2-3 weeks

### High Priority (Should Have - Phase 2)
**Banking, Contact, Compensation, IT basics:**
- Banking & Direct Deposit (7 fields)
- Additional Contact Info (3 fields)
- Compensation Details (3 fields)
- IT Access & Equipment (9 fields)

**Impact:** Improves operational efficiency significantly
**Estimated Fields to Add:** 22 fields
**Estimated Development Time:** 2-3 weeks

### Medium Priority (Nice to Have - Phase 3)
**Dependent info, advanced training, documents, vehicle:**
- Dependents & Beneficiaries (5 fields)
- Tax Withholding Details (5 fields)
- Training & Development (9 fields)
- Document Management (8 fields)
- Vehicle & Licensing (4 fields)
- Employment History (3 fields)
- Company Info (2 fields)

**Impact:** Comprehensive employee data management
**Estimated Fields to Add:** 36 fields
**Estimated Development Time:** 3-4 weeks

### Fix Type Mismatches (Phase 4)
**4 fields with incorrect types:**
1. Health Insurance (integer → file)
2. 401k Enrollment (integer → file)
3. Certifications (string → file array)
4. Address (string → address object)

**Impact:** Fixes data integrity issues
**Estimated Development Time:** 1 week

---

## Technical Notes for Developers

### Field Name Patterns
- User fields follow pattern: `ufCrm6[FieldName]`
- Special fields with timestamps: `ufCrm_6_[NAME]`
- Expiry date fields: `[fieldName]_EXPIRY`
- All field names are case-sensitive (camelCase in JSON)

### API Endpoints
- Get field definitions: `crm.type.fields` with `entityTypeId=1054`
- Get employee: `crm.item.get` with `entityTypeId=1054&id=[bitrixId]`
- Update employee: `crm.item.update` with `entityTypeId=1054&id=[bitrixId]&fields={...}`
- List employees: `crm.item.list` with `entityTypeId=1054`

### File Upload Handling
1. Upload file: `crm.file.upload` with base64 content → returns `FILE_ID`
2. Attach to employee: `crm.item.update` with field = `[FILE_ID]` (single) or `[FILE_ID, FILE_ID, ...]` (multiple)

### Address Field Structure
The `ufCrm6UfLegalAddress` field is an address type with structure:
```json
{
  "address_1": "123 Main St",
  "address_2": "Apt 4B",
  "city": "New York",
  "province": "NY",
  "postal_code": "10001",
  "country": "United States",
  "country_code": "US",
  "lat": "40.7128",
  "lon": "-74.0060"
}
```

### Validation Rules
- SSN: exactly 11 characters (format: XXX-XX-XXXX)
- Phone: minimum 12 characters
- Email: standard email validation
- Date: format YYYY-MM-DD
- Required fields must be provided during creation/update

---

## Summary Statistics

| Category | Total Fields | In UI | Missing | % Complete |
|----------|-------------|-------|---------|------------|
| **User-Editable Fields** | 102 | 26 | 76 | 25.5% |
| **System Fields** | 34 | 0 | 34 | 0% |
| **TOTAL** | **136** | **26** | **110** | **19.1%** |

| Priority Level | Fields | % of Missing |
|----------------|--------|-------------|
| Critical (Required) | 17 | 15.5% |
| High Priority | 22 | 20.0% |
| Medium Priority | 36 | 32.7% |
| Type Fixes | 4 | 3.6% |
| System/Meta | 34 | 30.9% |

---

## Conclusion

The current HR Center UI implementation covers only 19% of available employee fields in Bitrix24. To provide a complete employee management system, we need to add 110 additional fields across multiple categories. The most critical gap is the **17 required fields** that are currently missing, which prevent proper employee onboarding and compliance.

### Recommended Action Plan:
1. **Immediate:** Implement Phase 1 (17 critical required fields) - 2-3 weeks
2. **Short-term:** Implement Phase 2 (22 high-priority operational fields) - 2-3 weeks
3. **Medium-term:** Implement Phase 3 (36 enhanced feature fields) - 3-4 weeks
4. **Cleanup:** Fix Phase 4 type mismatches - 1 week

**Total estimated development time for complete implementation:** 8-11 weeks

This will transform the system from covering 19% of fields to nearly 100% coverage, providing a comprehensive HR management solution.
