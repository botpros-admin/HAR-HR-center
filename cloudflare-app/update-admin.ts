/**
 * Script to make Carly Taylor an admin in Bitrix24
 */

interface Env {
  BITRIX24_WEBHOOK_URL: string;
  BITRIX24_ENTITY_TYPE_ID: string;
}

async function updateCarlyToAdmin() {
  const BITRIX24_WEBHOOK_URL = process.env.BITRIX24_WEBHOOK_URL || '';
  const ENTITY_TYPE_ID = '1054';

  // Step 1: Search for Carly Taylor in Bitrix24
  console.log('Searching for Carly Taylor in Bitrix24...');

  const searchUrl = `${BITRIX24_WEBHOOK_URL}/crm.item.list`;
  const searchBody = new URLSearchParams({
    entityTypeId: ENTITY_TYPE_ID,
    'filter[ufCrm6LastName]': 'Taylor'
  });

  const searchResponse = await fetch(searchUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: searchBody
  });

  const searchData = await searchResponse.json();

  if (searchData.error) {
    console.error('Bitrix24 Error:', searchData.error_description || searchData.error);
    return;
  }

  const employees = searchData.result?.items || [];
  console.log(`Found ${employees.length} employees with last name Taylor`);

  // Find Carly specifically
  const carly = employees.find((emp: any) =>
    emp.ufCrm6Name?.toLowerCase().includes('carly')
  );

  if (!carly) {
    console.error('Could not find Carly Taylor in Bitrix24');
    console.log('Available employees:', employees.map((e: any) => ({
      id: e.id,
      name: `${e.ufCrm6Name} ${e.ufCrm6LastName}`,
      badge: e.ufCrm6BadgeNumber
    })));
    return;
  }

  console.log(`Found Carly Taylor:
    - Bitrix ID: ${carly.id}
    - Badge Number: ${carly.ufCrm6BadgeNumber}
    - Current Position: ${carly.ufCrm6WorkPosition || 'None'}
  `);

  // Step 2: Update her position to make her admin
  console.log('\nUpdating position to "HR Director"...');

  const updateUrl = `${BITRIX24_WEBHOOK_URL}/crm.item.update`;
  const updateBody = new URLSearchParams({
    entityTypeId: ENTITY_TYPE_ID,
    id: carly.id.toString(),
    fields: JSON.stringify({
      ufCrm6WorkPosition: 'HR Director'
    })
  });

  const updateResponse = await fetch(updateUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: updateBody
  });

  const updateData = await updateResponse.json();

  if (updateData.error) {
    console.error('Update Error:', updateData.error_description || updateData.error);
    return;
  }

  console.log('✅ Successfully updated Carly Taylor to HR Director in Bitrix24!');
  console.log('\nNow she can login at https://app.hartzell.work/login');
  console.log('- Badge Number:', carly.ufCrm6BadgeNumber);
  console.log('- Will be redirected to /admin after login');
}

updateCarlyToAdmin().catch(console.error);
