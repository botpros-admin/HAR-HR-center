/**
 * Quick script to check OpenSign document status and manually process if signed
 * Run with: node check-opensign-status.js Ow3izdDKNg
 */

const OPENSIGN_API_TOKEN = process.env.OPENSIGN_API_TOKEN;
const DOCUMENT_ID = process.argv[2] || 'Ow3izdDKNg';

if (!OPENSIGN_API_TOKEN) {
  console.error('Error: OPENSIGN_API_TOKEN environment variable not set');
  console.error('Get it from Cloudflare: npx wrangler secret list --env production');
  process.exit(1);
}

async function checkDocumentStatus() {
  try {
    const url = `https://api.opensignlabs.com/api/v1.1/document/${DOCUMENT_ID}`;

    console.log(`Checking document status for: ${DOCUMENT_ID}`);
    console.log(`URL: ${url}\n`);

    const response = await fetch(url, {
      headers: {
        'x-api-token': OPENSIGN_API_TOKEN,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error('Response:', text);
      return;
    }

    const data = await response.json();
    console.log('Document Status:');
    console.log(JSON.stringify(data, null, 2));

    // Check if signed
    if (data.status === 'signed' || data.status === 'completed') {
      console.log('\n✅ Document is SIGNED in OpenSign!');
      console.log('\nNext steps:');
      console.log('1. The webhook should have been called but was blocked by CSRF');
      console.log('2. You can manually trigger the webhook processing by calling:');
      console.log(`   POST https://hartzell.work/api/signatures/webhooks/opensign`);
      console.log('3. Or re-sign the document now that the webhook is fixed');
    } else {
      console.log(`\n⏳ Document status: ${data.status || 'unknown'}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkDocumentStatus();
