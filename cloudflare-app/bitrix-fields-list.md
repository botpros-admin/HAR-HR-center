# Bitrix24 HR Center SPA Fields

Based on the codebase analysis, here are all the fields currently used from Bitrix24:

## Core Identity Fields
- `id` - Employee ID (numeric)
- `ufCrm6BadgeNumber` - Badge/Employee Number (string)

## Name Fields
- `ufCrm6Name` - First Name (string)
- `ufCrm6SecondName` - Middle Name (string)
- `ufCrm6LastName` - Last Name (string)
- `ufCrm6PreferredName` - Preferred Name (string)

## Contact Information
- `ufCrm6Email` - Email Address (array/multiple)
- `ufCrm6PersonalMobile` - Personal Mobile Phone (array/multiple)
- `ufCrm6WorkPhone` - Work Phone (string)

## Personal Information
- `ufCrm6PersonalBirthday` - Date of Birth (date)

## Address Fields
- `ufCrm6Address` - Primary Address (string with delimiter |;|)
- `ufCrm6UfLegalAddress` - Legal Address (string)

## Employment Information
- `ufCrm6EmploymentStartDate` - Hire Date (date)
- `ufCrm6Subsidiary` - Department/Subsidiary (string)
- `ufCrm6WorkPosition` - Position/Job Title (string)
- `ufCrm6EmploymentStatus` - Employment Status (Y/N)
- `ufCrm6EmploymentType` - Employment Type (Full-time, Part-time, etc.)
- `ufCrm6Shift` - Shift (string)

## Education Fields
- `ufCrm6EducationLevel` - Education Level (string)
- `ufCrm6SchoolName` - School Name (string)
- `ufCrm6GraduationYear` - Graduation Year (string/number)
- `ufCrm6FieldOfStudy` - Field of Study (string)

## Skills & Certifications
- `ufCrm6Skills` - Skills (string/text)
- `ufCrm6Certifications` - Certifications (string/text)
- `ufCrm6SoftwareExperience` - Software Experience (string/text)

## Documents
- `ufCrm6Documents` - Documents field (file/multiple)

## Additional Info (JSON field)
- `ufCrm6AdditionalInfo` - JSON string containing:
  - employmentType
  - shiftPreference
  - address
  - educationLevel
  - schoolName
  - graduationYear
  - fieldOfStudy
  - skills
  - certifications
  - softwareExperience
  - workExperiences (array)
  - yearsExperience
  - reference1 (object with name, relationship, phone, email)
  - reference2 (object)
  - resumeUrl
  - coverLetterUrl
  - applicationId
  - submittedAt
  - desiredSalary
  - availableStartDate
  - willingToRelocate
  - authorizedToWork
  - requiresSponsorship
  - howDidYouHear
  - felonyConviction (sensitive - not exposed)
  - felonyExplanation (sensitive - not exposed)
  - backgroundCheckConsent

