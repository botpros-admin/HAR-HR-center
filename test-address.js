const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe',
    headless: false
  });
  
  const page = await browser.newPage();
  
  // Enable request interception to capture API responses
  await page.setRequestInterception(true);
  
  let profileResponse = null;
  
  page.on('response', async (response) => {
    if (response.url().includes('/api/employee/profile')) {
      try {
        profileResponse = await response.json();
        console.log('=== API RESPONSE ===');
        console.log('Address:', JSON.stringify(profileResponse.address, null, 2));
        console.log('Full street value:', profileResponse.address?.street);
      } catch (e) {
        console.log('Could not parse response');
      }
    }
  });
  
  page.on('request', (request) => {
    request.continue();
  });
  
  // Navigate to login
  await page.goto('https://app.hartzell.work/login', { waitUntil: 'networkidle0' });
  
  console.log('Please log in manually...');
  
  // Wait for navigation to dashboard
  await page.waitForFunction(() => window.location.pathname.includes('/dashboard'), { timeout: 120000 });
  
  // Navigate to profile
  await page.goto('https://app.hartzell.work/dashboard/profile', { waitUntil: 'networkidle0' });
  
  // Wait a bit for the response to be captured
  await page.waitForTimeout(5000);
  
  if (profileResponse) {
    console.log('\n=== FINAL RESULT ===');
    console.log('Street address value:', profileResponse.address?.street);
    console.log('Contains |;|?', profileResponse.address?.street?.includes('|;|') ? 'YES - BUG STILL EXISTS' : 'NO - FIXED');
  }
  
  await browser.close();
})();
