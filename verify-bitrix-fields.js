#!/usr/bin/env node

/**
 * Bitrix24 Field Verification Script
 *
 * This script checks which application fields exist vs which are missing
 * Use this to verify manual field creation progress
 */

const WEBHOOK_URL = process.argv[2] || 'https://hartzell.app/rest/1/jp689g5yfvre9pvd/';

// Expected application fields
const REQUIRED_FIELDS = [
  // Address
  'UF_CRM_6_ADDRESS_STREET',
  'UF_CRM_6_ADDRESS_CITY',
  'UF_CRM_6_ADDRESS_STATE',
  'UF_CRM_6_ADDRESS_ZIP',
  'UF_CRM_6_ADDRESS_COUNTRY',
  'UF_CRM_6_ADDRESS_FULL',

  // Position & Employment
  'UF_CRM_6_POSITION',
  'UF_CRM_6_DESIRED_SALARY',
  'UF_CRM_6_AVAILABLE_START',
  'UF_CRM_6_EMPLOYMENT_TYPE',
  'UF_CRM_6_SHIFT_PREF',

  // Education
  'UF_CRM_6_EDUCATION_LEVEL',
  'UF_CRM_6_SCHOOL_NAME',
  'UF_CRM_6_DEGREE',
  'UF_CRM_6_GRADUATION_YEAR',

  // Skills & Certifications
  'UF_CRM_6_SKILLS',
  'UF_CRM_6_CERTIFICATIONS',
  'UF_CRM_6_SOFTWARE',

  // Work Experience
  'UF_CRM_6_YEARS_EXPERIENCE',
  'UF_CRM_6_PREV_EMPLOYER',
  'UF_CRM_6_PREV_POSITION',

  // References
  'UF_CRM_6_REFERENCES',

  // Legal & Background
  'UF_CRM_6_WORK_AUTH',
  'UF_CRM_6_FELONY',
  'UF_CRM_6_FELONY_DETAILS',
  'UF_CRM_6_DRUG_TEST',
  'UF_CRM_6_BG_CHECK',
  'UF_CRM_6_VETERAN',

  // CRITICAL: Resume
  'UF_CRM_6_RESUME',

  // Metadata
  'UF_CRM_6_SOURCE',
  'UF_CRM_6_REFERRAL',
  'UF_CRM_6_APPLIED_DATE',
  'UF_CRM_6_IP_ADDRESS'
];

async function getExistingFields() {
  const response = await fetch(`${WEBHOOK_URL}crm.item.fields?entityTypeId=1054`);
  const data = await response.json();

  if (data.error) {
    throw new Error(`API Error: ${data.error_description}`);
  }

  return Object.keys(data.result.fields).map(k => k.toUpperCase());
}

async function main() {
  console.log('🔍 Bitrix24 Field Verification Script\n');
  console.log(`📡 Webhook: ${WEBHOOK_URL}\n`);
  console.log(`📋 Checking ${REQUIRED_FIELDS.length} required application fields...\n`);

  try {
    const existingFields = await getExistingFields();

    const missing = [];
    const existing = [];

    for (const field of REQUIRED_FIELDS) {
      if (existingFields.includes(field)) {
        existing.push(field);
      } else {
        missing.push(field);
      }
    }

    // Summary
    console.log('═'.repeat(70));
    console.log('📊 SUMMARY');
    console.log('═'.repeat(70));
    console.log(`✅ Existing: ${existing.length} fields`);
    console.log(`❌ Missing:  ${missing.length} fields`);
    console.log('═'.repeat(70));

    if (existing.length > 0) {
      console.log('\n✅ Existing Fields:\n');
      existing.forEach(field => {
        console.log(`  • ${field}`);
      });
    }

    if (missing.length > 0) {
      console.log('\n❌ Missing Fields:\n');
      missing.forEach(field => {
        console.log(`  • ${field}`);
      });

      console.log('\n📋 Next Steps:');
      console.log('1. Create these fields manually in Bitrix24, OR');
      console.log('2. Run create-bitrix-fields.js with an admin webhook');
      console.log('\nSee BITRIX24_FIELD_CREATION_GUIDE.md for instructions.');
    } else {
      console.log('\n🎉 All required fields exist!');
      console.log('\n📋 Next Steps:');
      console.log('1. Update backend code to map these fields');
      console.log('2. Test application submission');
      console.log('3. Verify data appears correctly in Bitrix24');
    }

  } catch (error) {
    console.error('\n💥 Error:', error.message);
    process.exit(1);
  }
}

main();
