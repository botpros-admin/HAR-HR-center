// Quick script to fetch Bitrix24 field definitions
async function getFields() {
  const webhookUrl = process.env.BITRIX24_WEBHOOK_URL;
  const entityTypeId = process.env.BITRIX24_ENTITY_TYPE_ID || '1054';
  
  if (!webhookUrl) {
    console.error('BITRIX24_WEBHOOK_URL environment variable not set');
    process.exit(1);
  }

  const url = `${webhookUrl}/crm.type.fields`;
  const params = new URLSearchParams({ entityTypeId });
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });
  
  const data = await response.json();
  
  if (data.error) {
    console.error('Bitrix Error:', data.error_description || data.error);
    process.exit(1);
  }
  
  const fields = data.result || {};
  const fieldList = Object.entries(fields).map(([name, def]) => ({
    name,
    title: def.title || name,
    type: def.type,
    isRequired: def.isRequired || false,
    isReadOnly: def.isReadOnly || false,
    isMultiple: def.isMultiple || false,
  }));
  
  console.log(JSON.stringify({
    entityTypeId,
    totalFields: fieldList.length,
    fields: fieldList
  }, null, 2));
}

getFields().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
