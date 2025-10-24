#!/usr/bin/env node

/**
 * Bitrix24 Field Creation Script
 *
 * This script creates all missing application fields in the HR Center SPA (entity 1054)
 *
 * REQUIREMENTS:
 * - Bitrix24 webhook with ADMINISTRATOR permissions
 * - Permission to create custom fields (userfieldconfig.add scope)
 *
 * USAGE:
 * 1. Go to Bitrix24 > Applications > Webhooks
 * 2. Create a new INBOUND webhook with these permissions:
 *    - CRM (all)
 *    - User field configuration (all)
 * 3. Copy the webhook URL (should look like: https://your-domain.bitrix24.com/rest/1/YOUR_CODE/)
 * 4. Run: node create-bitrix-fields.js YOUR_WEBHOOK_URL
 *
 * Example:
 * node create-bitrix-fields.js https://hartzell.app/rest/1/ADMIN_CODE/
 */

const WEBHOOK_URL = process.argv[2];

if (!WEBHOOK_URL) {
  console.error('❌ Error: Webhook URL required');
  console.error('Usage: node create-bitrix-fields.js <WEBHOOK_URL>');
  console.error('Example: node create-bitrix-fields.js https://hartzell.app/rest/1/ADMIN_CODE/');
  process.exit(1);
}

// Field definitions organized by category
const FIELDS = [
  // Address Fields (6)
  {
    fieldName: 'UF_CRM_6_ADDRESS_STREET',
    userTypeId: 'string',
    editFormLabel: 'Street Address',
    listColumnLabel: 'Street Address',
    mandatory: 'N',
    category: 'Address'
  },
  {
    fieldName: 'UF_CRM_6_ADDRESS_CITY',
    userTypeId: 'string',
    editFormLabel: 'City',
    listColumnLabel: 'City',
    mandatory: 'N',
    category: 'Address'
  },
  {
    fieldName: 'UF_CRM_6_ADDRESS_STATE',
    userTypeId: 'string',
    editFormLabel: 'State',
    listColumnLabel: 'State',
    mandatory: 'N',
    category: 'Address'
  },
  {
    fieldName: 'UF_CRM_6_ADDRESS_ZIP',
    userTypeId: 'string',
    editFormLabel: 'ZIP Code',
    listColumnLabel: 'ZIP Code',
    mandatory: 'N',
    category: 'Address'
  },
  {
    fieldName: 'UF_CRM_6_ADDRESS_COUNTRY',
    userTypeId: 'string',
    editFormLabel: 'Country',
    listColumnLabel: 'Country',
    mandatory: 'N',
    category: 'Address'
  },
  {
    fieldName: 'UF_CRM_6_ADDRESS_FULL',
    userTypeId: 'text',
    editFormLabel: 'Full Address (Formatted)',
    listColumnLabel: 'Full Address',
    mandatory: 'N',
    category: 'Address'
  },

  // Position & Employment Fields (5)
  {
    fieldName: 'UF_CRM_6_POSITION',
    userTypeId: 'string',
    editFormLabel: 'Position Applied For',
    listColumnLabel: 'Position',
    mandatory: 'N',
    category: 'Position'
  },
  {
    fieldName: 'UF_CRM_6_DESIRED_SALARY',
    userTypeId: 'string',
    editFormLabel: 'Desired Salary',
    listColumnLabel: 'Desired Salary',
    mandatory: 'N',
    category: 'Position'
  },
  {
    fieldName: 'UF_CRM_6_AVAILABLE_START',
    userTypeId: 'date',
    editFormLabel: 'Available Start Date',
    listColumnLabel: 'Available Start',
    mandatory: 'N',
    category: 'Position'
  },
  {
    fieldName: 'UF_CRM_6_EMPLOYMENT_TYPE',
    userTypeId: 'enumeration',
    editFormLabel: 'Desired Employment Type',
    listColumnLabel: 'Employment Type',
    mandatory: 'N',
    category: 'Position',
    list: [
      { VALUE: 'Full-Time', SORT: 10 },
      { VALUE: 'Part-Time', SORT: 20 },
      { VALUE: 'Contract', SORT: 30 },
      { VALUE: 'Temporary', SORT: 40 },
      { VALUE: 'Internship', SORT: 50 }
    ]
  },
  {
    fieldName: 'UF_CRM_6_SHIFT_PREF',
    userTypeId: 'enumeration',
    editFormLabel: 'Shift Preference',
    listColumnLabel: 'Shift Preference',
    mandatory: 'N',
    category: 'Position',
    list: [
      { VALUE: 'Day Shift', SORT: 10 },
      { VALUE: 'Night Shift', SORT: 20 },
      { VALUE: 'Swing Shift', SORT: 30 },
      { VALUE: 'Any Shift', SORT: 40 }
    ]
  },

  // Education Fields (4)
  {
    fieldName: 'UF_CRM_6_EDUCATION_LEVEL',
    userTypeId: 'enumeration',
    editFormLabel: 'Highest Education Level',
    listColumnLabel: 'Education Level',
    mandatory: 'N',
    category: 'Education',
    list: [
      { VALUE: 'High School Diploma/GED', SORT: 10 },
      { VALUE: 'Some College', SORT: 20 },
      { VALUE: 'Associate Degree', SORT: 30 },
      { VALUE: 'Bachelor\'s Degree', SORT: 40 },
      { VALUE: 'Master\'s Degree', SORT: 50 },
      { VALUE: 'Doctorate', SORT: 60 },
      { VALUE: 'Trade/Vocational Certificate', SORT: 70 }
    ]
  },
  {
    fieldName: 'UF_CRM_6_SCHOOL_NAME',
    userTypeId: 'string',
    editFormLabel: 'School/Institution Name',
    listColumnLabel: 'School Name',
    mandatory: 'N',
    category: 'Education'
  },
  {
    fieldName: 'UF_CRM_6_DEGREE',
    userTypeId: 'string',
    editFormLabel: 'Degree/Certificate',
    listColumnLabel: 'Degree',
    mandatory: 'N',
    category: 'Education'
  },
  {
    fieldName: 'UF_CRM_6_GRADUATION_YEAR',
    userTypeId: 'string',
    editFormLabel: 'Graduation Year',
    listColumnLabel: 'Graduation Year',
    mandatory: 'N',
    category: 'Education'
  },

  // Skills & Certifications (3)
  {
    fieldName: 'UF_CRM_6_SKILLS',
    userTypeId: 'text',
    editFormLabel: 'Relevant Skills',
    listColumnLabel: 'Skills',
    mandatory: 'N',
    category: 'Skills'
  },
  {
    fieldName: 'UF_CRM_6_CERTIFICATIONS',
    userTypeId: 'text',
    editFormLabel: 'Certifications/Licenses',
    listColumnLabel: 'Certifications',
    mandatory: 'N',
    category: 'Skills'
  },
  {
    fieldName: 'UF_CRM_6_SOFTWARE',
    userTypeId: 'text',
    editFormLabel: 'Software/Systems Experience',
    listColumnLabel: 'Software',
    mandatory: 'N',
    category: 'Skills'
  },

  // Work Experience (3)
  {
    fieldName: 'UF_CRM_6_YEARS_EXPERIENCE',
    userTypeId: 'string',
    editFormLabel: 'Years of Experience',
    listColumnLabel: 'Years Experience',
    mandatory: 'N',
    category: 'Experience'
  },
  {
    fieldName: 'UF_CRM_6_PREV_EMPLOYER',
    userTypeId: 'string',
    editFormLabel: 'Previous Employer',
    listColumnLabel: 'Previous Employer',
    mandatory: 'N',
    category: 'Experience'
  },
  {
    fieldName: 'UF_CRM_6_PREV_POSITION',
    userTypeId: 'string',
    editFormLabel: 'Previous Position',
    listColumnLabel: 'Previous Position',
    mandatory: 'N',
    category: 'Experience'
  },

  // Professional References (1)
  {
    fieldName: 'UF_CRM_6_REFERENCES',
    userTypeId: 'text',
    editFormLabel: 'Professional References',
    listColumnLabel: 'References',
    mandatory: 'N',
    category: 'References'
  },

  // Legal & Background (6)
  {
    fieldName: 'UF_CRM_6_WORK_AUTH',
    userTypeId: 'enumeration',
    editFormLabel: 'Work Authorization',
    listColumnLabel: 'Work Auth',
    mandatory: 'N',
    category: 'Legal',
    list: [
      { VALUE: 'US Citizen', SORT: 10 },
      { VALUE: 'Green Card Holder', SORT: 20 },
      { VALUE: 'Work Visa', SORT: 30 },
      { VALUE: 'Require Sponsorship', SORT: 40 }
    ]
  },
  {
    fieldName: 'UF_CRM_6_FELONY',
    userTypeId: 'boolean',
    editFormLabel: 'Felony Conviction',
    listColumnLabel: 'Felony',
    mandatory: 'N',
    category: 'Legal'
  },
  {
    fieldName: 'UF_CRM_6_FELONY_DETAILS',
    userTypeId: 'text',
    editFormLabel: 'Felony Details',
    listColumnLabel: 'Felony Details',
    mandatory: 'N',
    category: 'Legal'
  },
  {
    fieldName: 'UF_CRM_6_DRUG_TEST',
    userTypeId: 'boolean',
    editFormLabel: 'Willing to Drug Test',
    listColumnLabel: 'Drug Test',
    mandatory: 'N',
    category: 'Legal'
  },
  {
    fieldName: 'UF_CRM_6_BG_CHECK',
    userTypeId: 'boolean',
    editFormLabel: 'Willing to Background Check',
    listColumnLabel: 'Background Check',
    mandatory: 'N',
    category: 'Legal'
  },
  {
    fieldName: 'UF_CRM_6_VETERAN',
    userTypeId: 'boolean',
    editFormLabel: 'Veteran Status',
    listColumnLabel: 'Veteran',
    mandatory: 'N',
    category: 'Legal'
  },

  // CRITICAL: Resume Upload (1)
  {
    fieldName: 'UF_CRM_6_RESUME',
    userTypeId: 'file',
    editFormLabel: 'Resume/CV',
    listColumnLabel: 'Resume',
    mandatory: 'N',
    category: 'Documents'
  },

  // Metadata Fields (4)
  {
    fieldName: 'UF_CRM_6_SOURCE',
    userTypeId: 'string',
    editFormLabel: 'Application Source',
    listColumnLabel: 'Source',
    mandatory: 'N',
    category: 'Metadata'
  },
  {
    fieldName: 'UF_CRM_6_REFERRAL',
    userTypeId: 'string',
    editFormLabel: 'Referred By',
    listColumnLabel: 'Referral',
    mandatory: 'N',
    category: 'Metadata'
  },
  {
    fieldName: 'UF_CRM_6_APPLIED_DATE',
    userTypeId: 'datetime',
    editFormLabel: 'Application Date',
    listColumnLabel: 'Applied Date',
    mandatory: 'N',
    category: 'Metadata'
  },
  {
    fieldName: 'UF_CRM_6_IP_ADDRESS',
    userTypeId: 'string',
    editFormLabel: 'IP Address',
    listColumnLabel: 'IP Address',
    mandatory: 'N',
    category: 'Metadata'
  }
];

async function createField(field) {
  const payload = {
    moduleId: 'crm',
    field: {
      entityId: 'DYNAMIC_1054',
      fieldName: field.fieldName,
      userTypeId: field.userTypeId,
      xmlId: field.fieldName,
      editFormLabel: { en: field.editFormLabel },
      listColumnLabel: { en: field.listColumnLabel },
      mandatory: field.mandatory
    }
  };

  // Add list values for enumeration fields
  if (field.userTypeId === 'enumeration' && field.list) {
    payload.field.list = field.list;
  }

  const response = await fetch(`${WEBHOOK_URL}userfieldconfig.add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  return result;
}

async function main() {
  console.log('🚀 Bitrix24 Field Creation Script\n');
  console.log(`📡 Webhook: ${WEBHOOK_URL}\n`);
  console.log(`📝 Creating ${FIELDS.length} fields in HR Center SPA (entity 1054)\n`);

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  // Group fields by category
  const categories = [...new Set(FIELDS.map(f => f.category))];

  for (const category of categories) {
    const categoryFields = FIELDS.filter(f => f.category === category);
    console.log(`\n📁 ${category} (${categoryFields.length} fields)`);
    console.log('─'.repeat(60));

    for (const field of categoryFields) {
      process.stdout.write(`  Creating ${field.fieldName}... `);

      try {
        const result = await createField(field);

        if (result.error === 0 || result.result) {
          console.log('✅');
          successCount++;
        } else {
          console.log(`❌ ${result.error_description || 'Unknown error'}`);
          errorCount++;
          errors.push({ field: field.fieldName, error: result.error_description });
        }
      } catch (error) {
        console.log(`❌ ${error.message}`);
        errorCount++;
        errors.push({ field: field.fieldName, error: error.message });
      }

      // Rate limiting: wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Summary
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(60));
  console.log(`✅ Success: ${successCount} fields`);
  console.log(`❌ Failed:  ${errorCount} fields`);
  console.log('═'.repeat(60));

  if (errors.length > 0) {
    console.log('\n❌ Errors:\n');
    errors.forEach(({ field, error }) => {
      console.log(`  • ${field}: ${error}`);
    });
  }

  if (successCount === FIELDS.length) {
    console.log('\n🎉 All fields created successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Update backend code to map these fields (see applications.ts)');
    console.log('2. Test application submission');
    console.log('3. Verify fields appear in Bitrix24 HR Center');
  } else if (successCount > 0) {
    console.log(`\n⚠️  ${successCount} fields created, but ${errorCount} failed.`);
    console.log('Please check the errors above and retry failed fields manually.');
  } else {
    console.log('\n❌ No fields were created. Check your webhook permissions.');
    console.log('\nRequired permissions:');
    console.log('- CRM (all)');
    console.log('- User field configuration (all)');
  }

  process.exit(errorCount > 0 ? 1 : 0);
}

// Run the script
main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
