# Bitrix24 HR Center Field Reference

Complete mapping of all application fields in the Hartzell HR Center Bitrix24 CRM.

## Field Naming Convention

- **Database Column**: `UF_CRM_6_FIELD_NAME` (uppercase with underscores)
- **API Parameter**: `ufCrm6FieldName` (camelCase)
- **Entity ID for Creation**: `CRM_6` (NOT `CRM_1054`)

## Personal Information Fields

| Field Name | Type | Label | Required | Notes |
|------------|------|-------|----------|-------|
| `ufCrm6Name` | string | First Name | Yes | |
| `ufCrm6SecondName` | string | Middle Name | No | |
| `ufCrm6LastName` | string | Last Name | Yes | |
| `ufCrm6Email` | array | Email Address | Yes | Array of emails |
| `ufCrm6PersonalMobile` | array | Phone Number | Yes | Array of phone numbers, digits only |

## Address Fields

| Field Name | Type | Label | Field ID |
|------------|------|-------|----------|
| `ufCrm6AddressStreet` | string | Street Address | 1855 |
| `ufCrm6AddressCity` | string | City | 1856 |
| `ufCrm6AddressState` | string | State | 1857 |
| `ufCrm6AddressZip` | string | ZIP Code | 1858 |
| `ufCrm6AddressCountry` | string | Country | 1859 |
| `ufCrm6AddressFull` | string | Full Address | 1860 |

## Position & Employment Fields

| Field Name | Type | Label | Field ID | Notes |
|------------|------|-------|----------|-------|
| `ufCrm6Position` | string | Position Applied For | 1861 | |
| `ufCrm6DesiredSalary` | string | Desired Salary | 1862 | Formatted with commas |
| `ufCrm6AvailableStart` | date | Available Start Date | 1863 | ISO 8601 format |
| `ufCrm6EmploymentType` | int | Employment Type | 1864 | Enum: 2030-2033 |
| `ufCrm6ShiftPref` | int | Shift Preference | 1878 | Enum: 2221-2224 |

### Employment Type Enum Values (Field ID: 1864)

| Enum ID | Value | XML_ID |
|---------|-------|--------|
| 2030 | Full-time | FULL_TIME |
| 2031 | Part-time | PART_TIME |
| 2032 | Contract | CONTRACT |
| 2033 | Temporary | TEMPORARY |

### Shift Preference Enum Values (Field ID: 1878)

| Enum ID | Value | XML_ID |
|---------|-------|--------|
| 2221 | Day Shift | DAY_SHIFT |
| 2222 | Night Shift | NIGHT_SHIFT |
| 2223 | Swing Shift | SWING_SHIFT |
| 2224 | Any Shift | ANY_SHIFT |

## Education Fields

| Field Name | Type | Label | Field ID | Notes |
|------------|------|-------|----------|-------|
| `ufCrm6EducationLevel` | int | Highest Education Level | 1865 | Enum: 2206-2212 |
| `ufCrm6SchoolName` | string | School/Institution Name | 1866 | |
| `ufCrm6Degree` | string | Field of Study | 1867 | |
| `ufCrm6GraduationYear` | string | Graduation Year | 1868 | |

### Education Level Enum Values (Field ID: 1865)

| Enum ID | Value | Mapping Keys |
|---------|-------|--------------|
| 2206 | High School Diploma | "High School Diploma", "High School Diploma/GED", "High School" |
| 2207 | Some College | "Some College" |
| 2208 | Associate Degree | "Associate Degree", "Associate", "Associate's Degree" |
| 2209 | Bachelor's Degree | "Bachelor's Degree", "Bachelor Degree", "Bachelor", "Bachelors Degree" |
| 2210 | Master's Degree | "Master's Degree", "Master Degree", "Master", "Masters Degree" |
| 2211 | Doctorate | "Doctorate", "PhD" |
| 2212 | Trade/Vocational Certificate | "Trade Certificate", "Trade Certification", "Trade/Vocational Certificate", "Vocational" |

**Important**: HTML entities like `&#x27;` (encoded apostrophe) must be decoded before mapping.

## Skills & Certifications Fields

| Field Name | Type | Label | Field ID | Notes |
|------------|------|-------|----------|-------|
| `ufCrm6Skills` | string | Skills | 1869 | Comma-separated |
| `ufCrm6CertText` | string | Certifications | 1886 | Comma-separated, text field |
| `ufCrm6Software` | string | Software Experience | 1870 | Comma-separated |

**Note**: `ufCrm6Certifications` (ID 1647) is a FILE field, not text. Use `ufCrm6CertText` instead.

## Work Experience Fields

| Field Name | Type | Label | Field ID |
|------------|------|-------|----------|
| `ufCrm6YearsExperience` | string | Years of Experience | 1871 |
| `ufCrm6PrevEmployer` | string | Previous Employer | 1872 |
| `ufCrm6PrevPosition` | string | Previous Position | 1873 |

## References Field

| Field Name | Type | Label | Field ID | Notes |
|------------|------|-------|----------|-------|
| `ufCrm6References` | string | Professional References | 1874 | JSON-formatted array |

**Format**:
```json
[
  {
    "name": "John Manager",
    "phone": "954-555-5678",
    "relationship": "Previous Supervisor"
  }
]
```

## Legal & Background Fields

| Field Name | Type | Label | Field ID | Values |
|------------|------|-------|----------|--------|
| `ufCrm6WorkAuth` | int | Work Authorization | 1875 | Enum: 2213, 2216 |
| `ufCrm6Felony` | string | Felony Conviction | 1876 | 'Y' or 'N' |
| `ufCrm6FelonyDetails` | string | Felony Details | 1877 | Text area |
| `ufCrm6DrugTest` | string | Drug Test Willing | 1879 | 'Y' or 'N' |
| `ufCrm6BgCheck` | string | Background Check Consent | 1880 | 'Y' or 'N' |
| `ufCrm6Veteran` | string | Veteran Status | 1881 | 'Y' or 'N' |

### Work Authorization Enum Values (Field ID: 1875)

| Enum ID | Value | Trigger |
|---------|-------|---------|
| 2213 | US Citizen | `authorizedToWork: 'yes'` AND `requiresSponsorship: 'no'` |
| 2216 | Require Sponsorship | `authorizedToWork: 'no'` OR `requiresSponsorship: 'yes'` |

**Important**: Boolean fields MUST use 'Y'/'N' strings, NOT 0/1 integers!

```typescript
// ✅ Correct
ufCrm6BgCheck: 'Y'
ufCrm6Felony: 'N'

// ❌ Wrong - will become 'N'
ufCrm6BgCheck: 1
ufCrm6Felony: 0
```

## Metadata Fields

| Field Name | Type | Label | Field ID | Notes |
|------------|------|-------|----------|-------|
| `ufCrm6Source` | string | Application Source | 1882 | Default: "Web Application Form" |
| `ufCrm6Referral` | string | How Did You Hear | 1883 | |
| `ufCrm6AppliedDate` | datetime | Application Date | 1884 | ISO 8601 timestamp |
| `ufCrm6IpAddress` | string | IP Address | 1885 | Submitted from IP |
| `ufCrm6AdditionalInfo` | string | Additional Information | (existing) | JSON-formatted metadata |

## CRM Item Properties

| Property | Type | Notes |
|----------|------|-------|
| `title` | string | Display title (e.g., "John Doe - Technician") |
| `categoryId` | int | Pipeline ID (18 = Recruitment) |
| `stageId` | string | Stage ID (e.g., "DT1054_18:PREPARATION") |

## Array Fields

Some fields accept arrays and must be formatted correctly:

### Email (ufCrm6Email)
```typescript
ufCrm6Email: ["user@example.com"]
```

### Phone (ufCrm6PersonalMobile)
```typescript
ufCrm6PersonalMobile: ["9545551234"]  // Digits only, no dashes
```

## Backend Mapping Example

```typescript
const bitrixData = {
  title: `${data.firstName} ${data.lastName} - ${data.position}`,
  categoryId: 18,
  stageId: 'DT1054_18:PREPARATION',

  // Personal Info
  ufCrm6Name: data.firstName,
  ufCrm6SecondName: data.middleName || '',
  ufCrm6LastName: data.lastName,
  ufCrm6Email: [data.email],
  ufCrm6PersonalMobile: [data.phone.replace(/\D/g, '')],

  // Position
  ufCrm6Position: data.position,
  ufCrm6DesiredSalary: data.desiredSalary,
  ufCrm6EmploymentType: employmentTypeEnumId,  // 2030-2033
  ufCrm6ShiftPref: shiftEnumId,  // 2221-2224

  // Education (decode HTML entities first!)
  ufCrm6EducationLevel: educationEnumId,  // 2206-2212
  ufCrm6SchoolName: data.schoolName || '',

  // Skills (convert arrays to comma-separated strings)
  ufCrm6Skills: Array.isArray(data.skills)
    ? data.skills.join(', ')
    : data.skills,
  ufCrm6CertText: Array.isArray(data.certifications)
    ? data.certifications.join(', ')
    : data.certifications,

  // Legal (use 'Y'/'N' strings!)
  ufCrm6WorkAuth: workAuthEnumId,  // 2213 or 2216
  ufCrm6Felony: data.felonyConviction === 'yes' ? 'Y' : 'N',
  ufCrm6BgCheck: data.backgroundCheckConsent === 'yes' ? 'Y' : 'N',

  // Metadata
  ufCrm6Source: 'Web Application Form',
  ufCrm6AppliedDate: new Date().toISOString(),
};
```

## Common Issues

### 1. Education Level Returns Null
**Cause**: HTML entity encoding (`&#x27;` instead of `'`)
**Fix**: Decode HTML entities before mapping

### 2. Boolean Fields Show 'N' When Should Be 'Y'
**Cause**: Sending integers (0/1) instead of strings ('Y'/'N')
**Fix**: Use 'Y' or 'N' strings

### 3. Enum Fields Not Populating
**Cause**: Sending text values instead of enum IDs
**Fix**: Map text to enum IDs before sending

### 4. Skills/Certifications Empty
**Cause**: Sending arrays instead of strings
**Fix**: Join arrays with ', ' before sending

## Testing Field Population

Run the automated test to verify all 29 fields:

```bash
node /mnt/c/Users/Agent/Desktop/HR\ Center/test-application-submission.js
```

Expected result: **29/29 fields passing (100%)**
