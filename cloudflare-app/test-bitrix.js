// Quick test to fetch from Bitrix
const WEBHOOK = process.env.BITRIX24_WEBHOOK_URL || 'https://precisionbillingsolutions.bitrix24.com/rest/1/4q5e5wc9qosbcyjr';

const params = new URLSearchParams({
  entityTypeId: '1054',
  'filter[ufCrm6BadgeNumber]': '115',
  'select[]': 'ufCrm6UfLegalAddress'
});

fetch(`${WEBHOOK}/crm.item.list`, {
  method: 'POST',
  body: params
})
.then(r => r.json())
.then(data => {
  console.log(JSON.stringify(data, null, 2));
})
.catch(err => console.error(err));
