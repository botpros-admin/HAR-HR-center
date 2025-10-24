/**
 * Send Test Reminder Email Script
 * Run with: node send-test-reminder.js
 */

// You'll need to replace YOUR_RESEND_API_KEY with your actual key
const RESEND_API_KEY = process.env.RESEND_API_KEY || 'YOUR_RESEND_API_KEY';
const TEST_EMAIL = 'mritchie@botpros.ai';

// Calculate due date (3 days from now)
const dueDate = new Date();
dueDate.setDate(dueDate.getDate() + 3);
const dueDateStr = dueDate.toLocaleDateString('en-US', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});

// Email HTML template
const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">⏰ Document Reminder</h1>
  </div>

  <div style="background-color: #fffbeb; padding: 30px; border: 1px solid #fde68a; border-top: none; border-radius: 0 0 8px 8px;">
    <h2 style="color: #92400e; margin-top: 0;">Upcoming Due Date</h2>

    <p>Hello Test Employee,</p>

    <p>This is a friendly reminder that you have a pending document due soon:</p>

    <div style="background-color: white; padding: 20px; border-left: 4px solid #f59e0b; margin: 20px 0;">
      <h3 style="margin: 0 0 10px 0; color: #92400e;">W-4 Employee Withholding Certificate</h3>
      <p style="margin: 5px 0; color: #92400e; font-weight: bold;">Due Date: ${dueDateStr}</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://app.hartzell.work/" style="display: inline-block; background-color: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Login to Complete</a>
    </div>

    <p>Please complete this document before the due date to stay compliant.</p>

    <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #fde68a;">
      This is an automated reminder from Hartzell HR Center.<br>
      <strong>This is a test email to demonstrate the reminder system.</strong>
    </p>
  </div>
</body>
</html>
`.trim();

const emailText = `
⏰ Hartzell HR Center - Document Reminder

Hello Test Employee,

This is a friendly reminder that you have a pending document due soon:

Document: W-4 Employee Withholding Certificate
Due Date: ${dueDateStr}

Login to complete: https://app.hartzell.work/

Please complete this document before the due date to stay compliant.

---
This is an automated reminder from Hartzell HR Center.
This is a test email to demonstrate the reminder system.
`.trim();

// Send email via Resend API
async function sendTestEmail() {
  try {
    console.log('Sending test reminder email to:', TEST_EMAIL);
    console.log('Due date:', dueDateStr);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Hartzell HR Center <noreply@hartzell.work>',
        to: [TEST_EMAIL],
        subject: 'Reminder: W-4 Employee Withholding Certificate - Due Soon',
        html: emailHtml,
        text: emailText
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Failed to send email');
      console.error('Status:', response.status);
      console.error('Error:', errorData);
      process.exit(1);
    }

    const responseData = await response.json();
    console.log('✅ Test reminder email sent successfully!');
    console.log('Email ID:', responseData.id);
    console.log('Recipient:', TEST_EMAIL);
    console.log('\nCheck your inbox at mritchie@botpros.ai');

  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    process.exit(1);
  }
}

// Check if API key is set
if (!RESEND_API_KEY || RESEND_API_KEY === 'YOUR_RESEND_API_KEY') {
  console.error('❌ ERROR: RESEND_API_KEY not set');
  console.error('Please set the environment variable:');
  console.error('  export RESEND_API_KEY="your_key_here"');
  console.error('Or edit this file and replace YOUR_RESEND_API_KEY with your actual key');
  process.exit(1);
}

// Run
sendTestEmail();
