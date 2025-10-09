# Bitrix24 HR Center - Complete Field List

**Entity Type ID:** 1054
**Total Fields:** 142

---

## System Fields (CRM Standard)

| Field Name | Title | Type | Required | Read-Only | Multiple |
|-----------|-------|------|----------|-----------|----------|
| `id` | ID | integer | ❌ | ✅ | ❌ |
| `title` | Name | string | ❌ | ❌ | ❌ |
| `xmlId` | External ID | string | ❌ | ❌ | ❌ |
| `createdTime` | Created on | datetime | ❌ | ✅ | ❌ |
| `updatedTime` | Updated on | datetime | ❌ | ✅ | ❌ |
| `createdBy` | Created by | user | ❌ | ✅ | ❌ |
| `updatedBy` | Updated by | user | ❌ | ✅ | ❌ |
| `assignedById` | Responsible person | user | ❌ | ❌ | ❌ |
| `opened` | Available to everyone | boolean | ✅ | ❌ | ❌ |
| `webformId` | Created by CRM form | integer | ❌ | ❌ | ❌ |
| `categoryId` | Pipeline | crm_category | ❌ | ❌ | ❌ |
| `stageId` | Stage | crm_status | ❌ | ❌ | ❌ |
| `previousStageId` | Previous stage | crm_status | ❌ | ✅ | ❌ |
| `movedTime` | Stage change date | datetime | ❌ | ✅ | ❌ |
| `movedBy` | Stage changed by | user | ❌ | ✅ | ❌ |

## Communication Tracking (Read-Only)

| Field Name | Title | Type | Required | Read-Only | Multiple |
|-----------|-------|------|----------|-----------|----------|
| `lastCommunicationTime` | Last contact | string | ❌ | ✅ | ❌ |
| `lastActivityBy` | Last timeline activity by | user | ❌ | ✅ | ❌ |
| `lastActivityTime` | Last updated on | datetime | ❌ | ✅ | ❌ |
| `lastCommunicationCallTime` | Last call | datetime | ❌ | ✅ | ❌ |
| `lastCommunicationEmailTime` | Last email | datetime | ❌ | ✅ | ❌ |
| `lastCommunicationImolTime` | Last Open Channel conversation | datetime | ❌ | ✅ | ❌ |
| `lastCommunicationWebformTime` | Last CRM form submitted | datetime | ❌ | ✅ | ❌ |

---

## 1. Personal Information

| Field Name | Title | Type | Required | Read-Only | Multiple | Settings |
|-----------|-------|------|----------|-----------|----------|----------|
| `ufCrm6Name` | First Name | string | ✅ | ❌ | ❌ | SIZE: 20 |
| `ufCrm6SecondName` | Middle Name | string | ❌ | ❌ | ❌ | SIZE: 20 |
| `ufCrm6LastName` | Last Name | string | ✅ | ❌ | ❌ | SIZE: 20 |
| `ufCrm6PersonalBirthday` | Date of Birth | date | ✅ | ❌ | ❌ | - |
| `ufCrm6PersonalGender` | Sex | enumeration | ✅ | ❌ | ❌ | Female, Male |
| `ufCrm6Ssn` | Social Security Number | string | ✅ | ❌ | ❌ | SIZE: 11, MIN/MAX: 11 |
| `ufCrm6MaritalStatus` | Marital Status | enumeration | ❌ | ❌ | ❌ | Single, Married, Divorced, Widowed, Separated |
| `ufCrm6Citizenship` | Citizenship Status | enumeration | ✅ | ❌ | ❌ | US Citizen, Permanent Resident, Work Visa, Other |
| `ufCrm6ProfilePhoto` | Profile Photo | file | ❌ | ❌ | ❌ | - |

## 2. Contact Information

| Field Name | Title | Type | Required | Read-Only | Multiple | Settings |
|-----------|-------|------|----------|-----------|----------|----------|
| `ufCrm6Email` | Personal Email | string | ✅ | ❌ | ✅ | SIZE: 50, MIN: 5 |
| `ufCrm6PersonalMobile` | Personal Cellphone | string | ✅ | ❌ | ✅ | SIZE: 12, MIN: 12 |
| `ufCrm6WorkPhone` | Work Cellphone | string | ❌ | ❌ | ❌ | SIZE: 12, MIN: 12 |
| `ufCrm6PersonalPhone` | Direct Office Phone | string | ❌ | ❌ | ❌ | SIZE: 12, MIN: 12 |
| `ufCrm6_1748054470` | Office Phone Extension | string | ❌ | ❌ | ❌ | SIZE: 20 |
| `ufCrm6UfLegalAddress` | Address | address | ✅ | ❌ | ❌ | SHOW_MAP: Y |

## 3. Emergency Contact

| Field Name | Title | Type | Required | Read-Only | Multiple | Settings |
|-----------|-------|------|----------|-----------|----------|----------|
| `ufCrm6EmergencyContactName` | Emergency Contact Name | string | ✅ | ❌ | ❌ | SIZE: 20 |
| `ufCrm6EmergencyContactPhone` | Emergency Contact Phone | string | ✅ | ❌ | ❌ | SIZE: 20 |
| `ufCrm6Relationship` | Emergency Contact Relationship | string | ✅ | ❌ | ❌ | SIZE: 20 |

---

## 4. Employment Information

| Field Name | Title | Type | Required | Read-Only | Multiple | Settings |
|-----------|-------|------|----------|-----------|----------|----------|
| `ufCrm6BadgeNumber` | Employee ID | string | ✅ | ❌ | ❌ | SIZE: 20 |
| `ufCrm6WorkPosition` | Position | string | ✅ | ❌ | ❌ | SIZE: 20 |
| `ufCrm6EmploymentType` | Employment Type | enumeration | ✅ | ❌ | ❌ | Full-Time, Part-Time, Contract, Temporary, Intern, Seasonal |
| `ufCrm6EmploymentStatus` | Employment Status | boolean | ❌ | ❌ | ❌ | Active/Inactive (Checkbox) |
| `ufCrm6EmploymentStartDate` | Start Date | date | ✅ | ❌ | ❌ | DEFAULT: NOW |
| `ufCrm6TerminationDate` | Termination Date | date | ❌ | ❌ | ❌ | - |
| `ufCrm6RehireEligible` | Rehire Eligible | boolean | ❌ | ❌ | ❌ | Checkbox |
| `ufCrm6Subsidiary` | Subsidiary | enumeration | ✅ | ❌ | ❌ | Construction, Painting, Windows & Doors |
| `ufCrm6Sales` | Sales Territory | enumeration | ❌ | ❌ | ❌ | Northern, Southern |
| `ufCrm_6_SALES_UF_USER_LEGAL_1740423289664` | Project Category | enumeration | ❌ | ❌ | ❌ | Commercial, Community, Residential, Public Sector |

## 5. Compensation & Performance

| Field Name | Title | Type | Required | Read-Only | Multiple | Settings |
|-----------|-------|------|----------|-----------|----------|----------|
| `ufCrm6PayRate` | Pay Rate/Salary | string | ❌ | ❌ | ❌ | SIZE: 20 |
| `ufCrm6BenefitsEligible` | Benefits Eligible | boolean | ❌ | ❌ | ❌ | Checkbox |
| `ufCrm6PtoDays` | PTO Days Allocated | string | ❌ | ❌ | ❌ | SIZE: 20 |
| `ufCrm6ReviewDate` | Performance Review Date | date | ❌ | ❌ | ✅ | - |
| `ufCrm6WcCode` | WC Code | integer | ❌ | ❌ | ❌ | SIZE: 6 |

---

## 6. Tax & Payroll

| Field Name | Title | Type | Required | Read-Only | Multiple | Settings |
|-----------|-------|------|----------|-----------|----------|----------|
| `ufCrm6TaxFilingStatus` | Tax Filing Status | enumeration | ✅ | ❌ | ❌ | Single, Married Filing Jointly, Married Filing Separately, Head of Household |
| `ufCrm_6_W4_EXEMPTIONS` | W-4 Exemptions Claimed | string | ❌ | ❌ | ❌ | SIZE: 20 |
| `ufCrm6AdditionalFedWithhold` | Additional Federal Withholding | string | ❌ | ❌ | ❌ | SIZE: 20 |
| `ufCrm6AdditionalStateWithhold` | Additional State Withholding | string | ❌ | ❌ | ❌ | SIZE: 20 |

### Dependents Information

| Field Name | Title | Type | Required | Read-Only | Multiple | Settings |
|-----------|-------|------|----------|-----------|----------|----------|
| `ufCrm6DependentsInfo` | Dependents Information | string | ❌ | ❌ | ✅ | SIZE: 20 |
| `ufCrm6DependentNames` | Dependent Names | string | ❌ | ❌ | ✅ | SIZE: 20 |
| `ufCrm6DependentSsns` | Dependent SSNs | string | ❌ | ❌ | ✅ | SIZE: 20 |
| `ufCrm6DependentRelationships` | Dependent Relationships | string | ❌ | ❌ | ✅ | SIZE: 20 |

---

## 7. Banking & Direct Deposit

| Field Name | Title | Type | Required | Read-Only | Multiple | Settings |
|-----------|-------|------|----------|-----------|----------|----------|
| `ufCrm_6_UF_USR_1737120507262` | Payment Method | enumeration | ✅ | ❌ | ❌ | Direct Deposit, Check |
| `ufCrm6BankName` | Bank Name | string | ❌ | ❌ | ❌ | SIZE: 20 |
| `ufCrm6BankAccountName` | Bank Account Holder Name | string | ❌ | ❌ | ❌ | SIZE: 20 |
| `ufCrm6BankAccountType` | Bank Account Type | enumeration | ❌ | ❌ | ❌ | Checking, Savings, Money Market |
| `ufCrm6BankRouting` | Bank Routing Number | string | ❌ | ❌ | ❌ | SIZE: 20 |
| `ufCrm6BankAccountNumber` | Bank Account Number | string | ❌ | ❌ | ❌ | SIZE: 20 |

---

## 8. Benefits & Insurance

| Field Name | Title | Type | Required | Read-Only | Multiple | Settings |
|-----------|-------|------|----------|-----------|----------|----------|
| `ufCrm6LifeBeneficiaries` | Life Insurance Beneficiaries | string | ❌ | ❌ | ❌ | SIZE: 20 |

---

## 9. Documents & Compliance

### Required Hiring Documents

| Field Name | Title | Type | Required | Read-Only | Multiple |
|-----------|-------|------|----------|-----------|----------|
| `ufCrm6HiringPaperwork` | Hiring Paperwork | file | ✅ | ❌ | ✅ |
| `ufCrm_6_UF_W4_FILE` | W-4 Form | file | ✅ | ❌ | ✅ |
| `ufCrm_6_UF_I9_FILE` | I-9 Form | file | ✅ | ❌ | ✅ |
| `ufCrm6HandbookAck` | Employee Handbook Acknowledgment | file | ✅ | ❌ | ❌ |

### Optional Documents

| Field Name | Title | Type | Required | Read-Only | Multiple |
|-----------|-------|------|----------|-----------|----------|
| `ufCrm6BackgroundCheck` | Background Check | file | ❌ | ❌ | ❌ |
| `ufCrm6DrugTest` | Drug Test Results | file | ❌ | ❌ | ✅ |
| `ufCrm6Nda` | NDA Agreement | file | ❌ | ❌ | ❌ |
| `ufCrm6Noncompete` | Non-Compete Agreement | file | ❌ | ❌ | ❌ |
| `ufCrm6WorkVisa` | Work Visa/Permit | file | ❌ | ❌ | ❌ |
| `ufCrm6VisaExpiry` | Work Authorization Expiry | date | ❌ | ❌ | ❌ |
| `ufCrm6DirectDeposit` | Direct Deposit Authorization | file | ❌ | ❌ | ❌ |
| `ufCrm6HealthInsurance` | Health Insurance Enrollment | file | ❌ | ❌ | ❌ |
| `ufCrm_6_401K_ENROLLMENT` | 401k Enrollment | file | ❌ | ❌ | ❌ |
| `ufCrm6MultipleJobsWorksheet` | Multiple Jobs Worksheet | file | ❌ | ❌ | ❌ |
| `ufCrm6DeductionsWorksheet` | Deductions Worksheet | file | ❌ | ❌ | ❌ |
| `ufCrm_6_UF_USR_1737120327618` | Automobile Insurance | file | ❌ | ❌ | ❌ |
| `ufCrm_6_UF_USR_1737120327618_EXPIRY` | Automobile Insurance Expiry | date | ❌ | ❌ | ❌ |
| `ufCrm_6_UF_USR_1747966315398` | Driver's License | file | ❌ | ❌ | ❌ |
| `ufCrm_6_UF_USR_1747966315398_EXPIRY` | Driver's License Expiry | string | ❌ | ❌ | ❌ |

---

## 10. Training & Certifications

### Training Status

| Field Name | Title | Type | Required | Read-Only | Multiple | Settings |
|-----------|-------|------|----------|-----------|----------|----------|
| `ufCrm6RequiredTraining` | Required Training Status | enumeration | ✅ | ❌ | ❌ | Not Started, In Progress, Completed, Expired |
| `ufCrm6SafetyTraining` | Safety Training Status | enumeration | ✅ | ❌ | ❌ | Not Started, In Progress, Completed, Expired |
| `ufCrm6ComplianceTraining` | Compliance Training Status | enumeration | ✅ | ❌ | ❌ | Not Started, In Progress, Completed, Expired |
| `ufCrm6SkillsLevel` | Skills Level | enumeration | ❌ | ❌ | ❌ | Beginner, Intermediate, Advanced, Expert |

### Training Documents & Dates

| Field Name | Title | Type | Required | Read-Only | Multiple |
|-----------|-------|------|----------|-----------|----------|
| `ufCrm6TrainingComplete` | Required Training Completion | file | ❌ | ❌ | ✅ |
| `ufCrm6Certifications` | Professional Certifications | file | ❌ | ❌ | ✅ |
| `ufCrm6TrainingRecords` | Training Records | file | ❌ | ❌ | ✅ |
| `ufCrm6SkillsAssessment` | Skills Assessment | file | ❌ | ❌ | ❌ |
| `ufCrm6TrainingDocs` | Training Documents | file | ❌ | ❌ | ✅ |
| `ufCrm6TrainingDate` | Training Completion Date | date | ❌ | ❌ | ❌ |
| `ufCrm6NextTrainingDue` | Next Training Due Date | date | ❌ | ❌ | ❌ |
| `ufCrm6TrainingNotes` | Training Notes | string | ❌ | ❌ | ❌ |

---

## 11. IT & Equipment

### Equipment Assigned

| Field Name | Title | Type | Required | Read-Only | Multiple | Settings |
|-----------|-------|------|----------|-----------|----------|----------|
| `ufCrm6EquipmentAssigned` | Equipment Assigned | enumeration | ❌ | ❌ | ✅ | Phone, Laptop, Tablet, Desktop, Monitor, Headset, Other |
| `ufCrm6EquipmentStatus` | Equipment Status | enumeration | ❌ | ❌ | ❌ | Issued, Returned, Lost, Damaged |
| `ufCrm6EquipmentReturn` | IT Equipment Return Tracking | string | ❌ | ❌ | ❌ | SIZE: 20 |

### Software & Access

| Field Name | Title | Type | Required | Read-Only | Multiple | Settings |
|-----------|-------|------|----------|-----------|----------|----------|
| `ufCrm6SoftwareAccess` | Software Access | enumeration | ❌ | ❌ | ✅ | Office 365, CRM, Accounting, Design Software, Development Tools, Other |
| `ufCrm6AccessPermissions` | Access Permissions | string | ❌ | ❌ | ✅ | SIZE: 20 |
| `ufCrm6AccessLevel` | System Access Level | enumeration | ❌ | ❌ | ❌ | Basic User, Power User, Administrator, Super Admin |
| `ufCrm6SecurityClearance` | Security Clearance Level | enumeration | ❌ | ❌ | ❌ | None, Confidential, Secret, Top Secret |

### Network & Remote Access

| Field Name | Title | Type | Required | Read-Only | Multiple | Settings |
|-----------|-------|------|----------|-----------|----------|----------|
| `ufCrm6NetworkStatus` | Network Account Status | enumeration | ❌ | ❌ | ❌ | Active, Inactive, Suspended, Disabled |
| `ufCrm6VpnAccess` | VPN Access | boolean | ❌ | ❌ | ❌ | Checkbox |
| `ufCrm6RemoteAccess` | Remote Access Approved | boolean | ❌ | ❌ | ❌ | Checkbox |

---

## Summary Statistics

- **Total Fields:** 142
- **Required Fields:** 21
- **Read-Only Fields:** 19
- **Multiple Value Fields:** 19
- **File Fields:** 24
- **Enumeration Fields:** 22
- **Boolean Fields:** 7
- **Date Fields:** 12
- **String Fields:** 44
- **Address Fields:** 1
- **Integer Fields:** 3
- **User Fields:** 6

### Fields by Category

| Category | Count |
|----------|-------|
| System & Meta | 24 |
| Personal Information | 9 |
| Contact Information | 6 |
| Emergency Contact | 3 |
| Employment | 10 |
| Tax & Payroll | 8 |
| Banking | 6 |
| Benefits | 1 |
| Documents | 22 |
| Training | 16 |
| IT & Equipment | 13 |
| Company Specific | 4 |

---

**Generated:** 2025-10-06
**Data Source:** Bitrix24 REST API (`crm.item.fields`)
**Entity Type ID:** 1054
