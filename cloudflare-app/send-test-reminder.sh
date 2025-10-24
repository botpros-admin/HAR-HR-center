#!/bin/bash

# Test Reminder Email Sender
# This script sends a test reminder email to mritchie@botpros.ai

# Check if RESEND_API_KEY is set
if [ -z "$RESEND_API_KEY" ]; then
  echo "❌ ERROR: RESEND_API_KEY environment variable not set"
  echo ""
  echo "Please run:"
  echo "  export RESEND_API_KEY='your_resend_api_key_here'"
  echo "  bash send-test-reminder.sh"
  exit 1
fi

# Calculate due date (3 days from now)
DUE_DATE=$(date -d '+3 days' '+%B %d, %Y' 2>/dev/null || date -v+3d '+%B %d, %Y')

echo "Sending test reminder email to: mritchie@botpros.ai"
echo "Due date: $DUE_DATE"
echo ""

# Send email
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "https://api.resend.com/emails" \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"from\": \"Hartzell HR Center <noreply@hartzell.work>\",
    \"to\": [\"mritchie@botpros.ai\"],
    \"subject\": \"Reminder: W-4 Employee Withholding Certificate - Due Soon\",
    \"html\": \"<!DOCTYPE html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'></head><body style='font-family: -apple-system, BlinkMacSystemFont, \\\"Segoe UI\\\", Roboto, \\\"Helvetica Neue\\\", Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'><div style='background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;'><h1 style='margin: 0; font-size: 24px;'>⏰ Document Reminder</h1></div><div style='background-color: #fffbeb; padding: 30px; border: 1px solid #fde68a; border-top: none; border-radius: 0 0 8px 8px;'><h2 style='color: #92400e; margin-top: 0;'>Upcoming Due Date</h2><p>Hello Test Employee,</p><p>This is a friendly reminder that you have a pending document due soon:</p><div style='background-color: white; padding: 20px; border-left: 4px solid #f59e0b; margin: 20px 0;'><h3 style='margin: 0 0 10px 0; color: #92400e;'>W-4 Employee Withholding Certificate</h3><p style='margin: 5px 0; color: #92400e; font-weight: bold;'>Due Date: $DUE_DATE</p></div><div style='text-align: center; margin: 30px 0;'><a href='https://app.hartzell.work/' style='display: inline-block; background-color: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;'>Login to Complete</a></div><p>Please complete this document before the due date to stay compliant.</p><p style='color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #fde68a;'>This is an automated reminder from Hartzell HR Center.<br><strong>This is a test email.</strong></p></div></body></html>\",
    \"text\": \"⏰ Hartzell HR Center - Document Reminder\n\nHello Test Employee,\n\nThis is a friendly reminder that you have a pending document due soon:\n\nDocument: W-4 Employee Withholding Certificate\nDue Date: $DUE_DATE\n\nLogin to complete: https://app.hartzell.work/\n\nPlease complete this document before the due date to stay compliant.\n\n---\nThis is an automated reminder from Hartzell HR Center.\nThis is a test email.\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  EMAIL_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
  echo "✅ Test reminder email sent successfully!"
  echo "Email ID: $EMAIL_ID"
  echo "Recipient: mritchie@botpros.ai"
  echo ""
  echo "Check your inbox!"
else
  echo "❌ Failed to send email"
  echo "HTTP Status: $HTTP_CODE"
  echo "Response: $BODY"
  exit 1
fi
