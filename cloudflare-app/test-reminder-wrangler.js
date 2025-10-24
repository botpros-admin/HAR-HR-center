// Quick script to send test reminder email via worker
export default {
  async fetch(request, env) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    const dueDateStr = dueDate.toLocaleDateString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;"><h1 style="margin: 0;">⏰ Document Reminder</h1></div><div style="background-color: #fffbeb; padding: 30px; border: 1px solid #fde68a; border-top: none; border-radius: 0 0 8px 8px;"><h2 style="color: #92400e; margin-top: 0;">Upcoming Due Date</h2><p>Hello Test Employee,</p><p>This is a friendly reminder that you have a pending document due soon:</p><div style="background-color: white; padding: 20px; border-left: 4px solid #f59e0b; margin: 20px 0;"><h3 style="margin: 0 0 10px 0; color: #92400e;">W-4 Employee Withholding Certificate</h3><p style="margin: 5px 0; color: #92400e; font-weight: bold;">Due Date: ${dueDateStr}</p></div><div style="text-align: center; margin: 30px 0;"><a href="https://app.hartzell.work/" style="display: inline-block; background-color: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Login to Complete</a></div><p>Please complete this document before the due date to stay compliant.</p><p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #fde68a;">This is an automated reminder from Hartzell HR Center.<br><strong>This is a test email.</strong></p></div></body></html>`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Hartzell HR Center <noreply@hartzell.work>',
        to: ['mritchie@botpros.ai'],
        subject: 'Reminder: W-4 Employee Withholding Certificate - Due Soon',
        html: html,
        text: `⏰ Document Reminder\n\nHello Test Employee,\n\nDocument: W-4 Employee Withholding Certificate\nDue Date: ${dueDateStr}\n\nLogin: https://app.hartzell.work/\n\nThis is a test email.`
      })
    });

    const result = await response.json();
    return new Response(JSON.stringify(result, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
