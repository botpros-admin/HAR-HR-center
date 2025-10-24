/**
 * Test Application Submission & Verification
 *
 * This script:
 * 1. Submits a mock application with complete data
 * 2. Retrieves the created Bitrix24 item
 * 3. Verifies all fields are populated correctly
 */

const API_URL = 'https://hartzell.work/api';
const BITRIX_WEBHOOK = 'https://hartzell.app/rest/1/jp689g5yfvre9pvd';

// Mock application data
const mockApplicationData = {
  // Personal Information
  firstName: 'Claude',
  middleName: 'Test',
  lastName: 'Applicant',
  email: 'claude.test@example.com',
  phone: '954-555-1234',
  addressLine1: '123 Test Street',
  addressLine2: 'Apt 456',
  city: 'Fort Lauderdale',
  state: 'FL',
  zipCode: '33301',

  // Position Information
  position: 'Maintenance Technician',
  desiredSalary: '65,000',
  availableStartDate: '2025-11-01',
  employmentType: 'Full-time',
  shift: 'Day',
  willingToRelocate: 'no',

  // Work Experience
  hasWorkExperience: 'yes',
  yearsExperience: '5 years',
  workExperiences: [
    {
      employer: 'Previous Company Inc',
      position: 'Technician',
      startDate: '2020-01',
      endDate: '2025-10',
      current: false,
      description: 'Maintained industrial equipment'
    }
  ],

  // Education
  educationLevel: "Bachelor's Degree",
  schoolName: 'Florida State University',
  graduationYear: '2019',
  fieldOfStudy: 'Mechanical Engineering',

  // Skills & Certifications
  skills: 'Welding, Electrical Systems, HVAC',
  certifications: 'EPA 608 Universal, OSHA 30',
  softwareExperience: 'AutoCAD, SolidWorks, MS Office',

  // References
  references: [
    {
      name: 'John Manager',
      phone: '954-555-5678',
      relationship: 'Previous Supervisor'
    },
    {
      name: 'Jane Colleague',
      phone: '954-555-9012',
      relationship: 'Co-worker'
    }
  ],

  // Legal
  authorizedToWork: 'yes',
  requiresSponsorship: 'no',
  over18: 'yes',
  backgroundCheckConsent: 'yes',
  felonyConviction: 'no',
  felonyExplanation: '',

  // Additional
  howDidYouHear: 'LinkedIn',
  additionalInfo: 'This is a test application submitted via automation script.',
  emailConsentGiven: true,

  // CAPTCHA token (bypass for testing)
  turnstileToken: 'AUTOMATED_TEST_BYPASS_TOKEN_DO_NOT_USE_IN_PRODUCTION'
};

// Field verification mappings
const FIELD_VERIFICATION = {
  // Text fields
  'ufCrm6Name': { expected: 'Claude', label: 'First Name' },
  'ufCrm6SecondName': { expected: 'Test', label: 'Middle Name' },
  'ufCrm6LastName': { expected: 'Applicant', label: 'Last Name' },
  'ufCrm6WorkPosition': { expected: 'Maintenance Technician', label: 'Position' },

  // Address fields
  'ufCrm6AddressStreet': { expected: '123 Test Street Apt 456', label: 'Street Address' },
  'ufCrm6AddressCity': { expected: 'Fort Lauderdale', label: 'City' },
  'ufCrm6AddressState': { expected: 'FL', label: 'State' },
  'ufCrm6AddressZip': { expected: '33301', label: 'ZIP Code' },
  'ufCrm6AddressCountry': { expected: 'USA', label: 'Country' },

  // Position & Employment
  'ufCrm6Position': { expected: 'Maintenance Technician', label: 'Position Applied For' },
  'ufCrm6DesiredSalary': { expected: '65,000', label: 'Desired Salary' },
  'ufCrm6AvailableStart': { expected: '2025-11-01', label: 'Available Start Date' },
  'ufCrm6EmploymentType': { expected: 2030, label: 'Employment Type', type: 'enum' }, // Full-time
  'ufCrm6ShiftPref': { expected: 2221, label: 'Shift Preference', type: 'enum' }, // Day Shift

  // Education
  'ufCrm6EducationLevel': { expected: 2209, label: 'Education Level', type: 'enum' }, // Bachelor's
  'ufCrm6SchoolName': { expected: 'Florida State University', label: 'School Name' },
  'ufCrm6Degree': { expected: 'Mechanical Engineering', label: 'Field of Study' },
  'ufCrm6GraduationYear': { expected: '2019', label: 'Graduation Year' },

  // Skills & Certifications
  'ufCrm6Skills': { expected: 'Welding, Electrical Systems, HVAC', label: 'Skills' },
  'ufCrm6CertText': { expected: 'EPA 608 Universal, OSHA 30', label: 'Certifications' },
  'ufCrm6Software': { expected: 'AutoCAD, SolidWorks, MS Office', label: 'Software Experience' },

  // Work Experience
  'ufCrm6YearsExperience': { expected: '5 years', label: 'Years of Experience' },
  'ufCrm6PrevEmployer': { expected: 'Previous Company Inc', label: 'Previous Employer' },
  'ufCrm6PrevPosition': { expected: 'Technician', label: 'Previous Position' },

  // Legal & Background
  'ufCrm6WorkAuth': { expected: 2213, label: 'Work Authorization', type: 'enum' }, // US Citizen
  'ufCrm6Felony': { expected: 'N', label: 'Felony Conviction', type: 'bitrix_boolean' }, // Bitrix returns 'Y'/'N'
  'ufCrm6BgCheck': { expected: 'Y', label: 'Background Check Consent', type: 'bitrix_boolean' }, // Bitrix returns 'Y'/'N'

  // Metadata
  'ufCrm6Source': { expected: 'Web Application Form', label: 'Application Source' },
  'ufCrm6Referral': { expected: 'LinkedIn', label: 'How Did You Hear' },
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function submitApplication() {
  log('\n📝 Step 1: Submitting Mock Application...', 'blue');

  // Debug: show exactly what we're sending
  console.log('[DEBUG] educationLevel value:', mockApplicationData.educationLevel);
  console.log('[DEBUG] educationLevel char codes:', Array.from(mockApplicationData.educationLevel).map(c => c.charCodeAt(0)).join(','));
  console.log('[DEBUG] backgroundCheckConsent:', mockApplicationData.backgroundCheckConsent);

  const formData = new FormData();
  formData.append('data', JSON.stringify(mockApplicationData));

  try {
    const response = await fetch(`${API_URL}/applications/submit`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Submission failed: ${JSON.stringify(error, null, 2)}`);
    }

    const result = await response.json();
    log(`✅ Application submitted successfully!`, 'green');
    log(`   Application ID: ${result.applicationId}`, 'cyan');
    log(`   Bitrix24 Item ID: ${result.bitrixId}`, 'cyan');

    return result.bitrixId;
  } catch (error) {
    log(`❌ Submission Error: ${error.message}`, 'red');
    throw error;
  }
}

async function getBitrixItem(itemId) {
  log(`\n🔍 Step 2: Retrieving Bitrix24 Item ${itemId}...`, 'blue');

  try {
    const response = await fetch(`${BITRIX_WEBHOOK}/crm.item.get?entityTypeId=1054&id=${itemId}`);
    const data = await response.json();

    if (data.error) {
      throw new Error(`Bitrix API Error: ${data.error_description}`);
    }

    log(`✅ Item retrieved successfully!`, 'green');
    return data.result.item;
  } catch (error) {
    log(`❌ Retrieval Error: ${error.message}`, 'red');
    throw error;
  }
}

function verifyFields(item) {
  log('\n✅ Step 3: Verifying Field Population...', 'blue');
  log('─'.repeat(80), 'cyan');

  let passCount = 0;
  let failCount = 0;
  const failures = [];

  for (const [fieldName, config] of Object.entries(FIELD_VERIFICATION)) {
    const actualValue = item[fieldName];
    const expected = config.expected;
    let passed = false;

    if (config.type === 'enum') {
      // For enum fields, the value is stored as an integer
      passed = parseInt(actualValue) === expected;
    } else if (config.type === 'bitrix_boolean') {
      // Bitrix24 boolean fields return 'Y'/'N' via API (even though stored as 1/0 in DB)
      passed = actualValue === expected;
    } else if (config.type === 'boolean') {
      passed = parseInt(actualValue) === expected;
    } else if (Array.isArray(actualValue)) {
      // For array fields (email, phone)
      passed = actualValue.length > 0 && String(actualValue[0]).includes(expected);
    } else {
      // For string fields
      passed = actualValue && actualValue.toString().includes(expected);
    }

    if (passed) {
      log(`✅ ${config.label.padEnd(30)} ${actualValue}`, 'green');
      passCount++;
    } else {
      log(`❌ ${config.label.padEnd(30)} Expected: ${expected}, Got: ${actualValue}`, 'red');
      failCount++;
      failures.push({ field: fieldName, label: config.label, expected, actual: actualValue });
    }
  }

  log('─'.repeat(80), 'cyan');
  log(`\n📊 Results: ${passCount} passed, ${failCount} failed`, failCount === 0 ? 'green' : 'yellow');

  if (failures.length > 0) {
    log('\n❌ Failed Fields:', 'red');
    failures.forEach(f => {
      log(`   ${f.label} (${f.field})`, 'red');
      log(`      Expected: ${f.expected}`, 'yellow');
      log(`      Got: ${f.actual || '(empty)'}`, 'yellow');
    });
  }

  return { passCount, failCount, failures };
}

async function main() {
  log('═'.repeat(80), 'cyan');
  log('🧪 Application Submission & Verification Test', 'cyan');
  log('═'.repeat(80), 'cyan');

  try {
    // Step 1: Submit application
    const bitrixId = await submitApplication();

    // Wait 2 seconds for Bitrix24 to process
    log('\n⏳ Waiting 2 seconds for Bitrix24 processing...', 'yellow');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Retrieve the item
    const item = await getBitrixItem(bitrixId);

    // Step 3: Verify fields
    const results = verifyFields(item);

    // Final summary
    log('\n═'.repeat(80), 'cyan');
    if (results.failCount === 0) {
      log('🎉 ALL TESTS PASSED! All fields populated correctly.', 'green');
    } else {
      log(`⚠️  ${results.failCount} FIELDS FAILED VERIFICATION`, 'red');
      log('Please review the failed fields above.', 'yellow');
    }
    log('═'.repeat(80), 'cyan');

    process.exit(results.failCount === 0 ? 0 : 1);

  } catch (error) {
    log('\n❌ TEST FAILED', 'red');
    log(error.stack, 'red');
    process.exit(1);
  }
}

// Run the test
main();
