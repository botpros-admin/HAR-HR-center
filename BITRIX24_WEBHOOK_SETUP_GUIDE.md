# Bitrix24 Webhook Configuration Guide
**Date:** October 20, 2025
**System:** Hartzell HR Center - Pipeline Automation

## 🎯 Overview

This guide walks you through configuring Bitrix24 automation rules to trigger automated emails when candidates move through the recruitment pipeline.

**What This Enables:**
- ✉️ **Automatic rejection emails** when candidates are moved to "Reject"
- 🎉 **Automatic offer emails** when candidates are moved to "Offer"
- 👋 **Automatic welcome emails** when candidates enter "Onboarding"

## 📋 Prerequisites

- [x] Backend deployed to `https://hartzell.work/api/*` ✅
- [x] Webhook endpoint live at `https://hartzell.work/api/bitrix/stage-change` ✅
- [x] All 4 pipelines configured in Bitrix24 ✅
- [ ] Admin access to Bitrix24 automation settings

## 🔧 Step-by-Step Configuration

### Step 1: Navigate to Automation Settings

1. Log into Bitrix24: https://hartzell.app
2. Go to **CRM** → **HR Center**
3. Click the **gear icon** (⚙️) next to the pipeline name
4. Select **Automation**

---

### Step 2: Configure Rejection Email Automation

**Pipeline:** Applicants (Category 18)
**Stage:** Reject (DT1054_18:FAIL)

1. In the Automation rules list, find the **"Reject"** stage
2. Click **"Add trigger"**
3. Select **"Webhook"** from the list
4. Configure:
   - **Name:** "Send Rejection Email"
   - **Webhook URL:** `https://hartzell.work/api/bitrix/stage-change`
   - **Method:** POST
   - **Headers:** None required
   - **Body (JSON):**
   ```json
   {
     "event": "ONCRMSTAGEIDCHANGE",
     "data": {
       "FIELDS": {
         "ID": "{=Document:ID}",
         "STAGE_ID": "{=Document:STAGE_ID}",
         "CATEGORY_ID": "{=Document:CATEGORY_ID}"
       }
     }
   }
   ```
5. Click **"Save"**

**Test:** Move a test candidate to "Reject" and verify they receive an email.

---

### Step 3: Configure Offer Email Automation

**Pipeline:** Applicants (Category 18)
**Stage:** Offer (DT1054_18:SUCCESS)

1. In the Automation rules list, find the **"Offer"** stage
2. Click **"Add trigger"**
3. Select **"Webhook"** from the list
4. Configure:
   - **Name:** "Send Offer Congratulations Email"
   - **Webhook URL:** `https://hartzell.work/api/bitrix/stage-change`
   - **Method:** POST
   - **Headers:** None required
   - **Body (JSON):**
   ```json
   {
     "event": "ONCRMSTAGEIDCHANGE",
     "data": {
       "FIELDS": {
         "ID": "{=Document:ID}",
         "STAGE_ID": "{=Document:STAGE_ID}",
         "CATEGORY_ID": "{=Document:CATEGORY_ID}"
       }
     }
   }
   ```
5. Click **"Save"**

**Test:** Move a test candidate to "Offer" and verify they receive an email.

---

### Step 4: Configure Onboarding Welcome Email

**Pipeline:** Onboarding (Category 10)
**Stage:** Incomplete (DT1054_10:NEW) - First stage when entering Onboarding

1. In the Automation rules list, find the **"Incomplete"** stage
2. Click **"Add trigger"**
3. Select **"Webhook"** from the list
4. Configure:
   - **Name:** "Send Onboarding Welcome Email"
   - **Webhook URL:** `https://hartzell.work/api/bitrix/stage-change`
   - **Method:** POST
   - **Headers:** None required
   - **Body (JSON):**
   ```json
   {
     "event": "ONCRMSTAGEIDCHANGE",
     "data": {
       "FIELDS": {
         "ID": "{=Document:ID}",
         "STAGE_ID": "{=Document:STAGE_ID}",
         "CATEGORY_ID": "{=Document:CATEGORY_ID}"
       }
     }
   }
   ```
5. Click **"Save"**

**Test:** Move a test candidate from Offer → Onboarding and verify they receive welcome email.

---

## 🧪 Testing Your Configuration

### Test 1: Rejection Email
1. Create a test candidate in the "Applicants" pipeline
2. Add an email address: `your-personal-email@gmail.com` (use your own email for testing)
3. Move the candidate to **"Reject"** stage
4. **Expected Result:**
   - Email received with subject "Update on Your Application with Hartzell Companies"
   - Timeline entry in Bitrix24: "Rejection email sent automatically"

### Test 2: Offer Email
1. Create or use an existing test candidate in "Applicants"
2. Ensure they have a valid email address
3. Move the candidate to **"Offer"** stage
4. **Expected Result:**
   - Email received with subject "🎉 Congratulations - Job Offer from Hartzell Companies!"
   - Timeline entry in Bitrix24: "Offer congratulations email sent automatically"

### Test 3: Onboarding Welcome Email
1. Use a candidate that's already in "Offer" stage
2. Move them to **"Onboarding"** → **"Incomplete"**
3. **Expected Result:**
   - Email received with subject "Welcome to Hartzell - Let's Get You Started!"
   - Timeline entry in Bitrix24: "Onboarding welcome email sent automatically"

---

## 📊 Monitoring and Troubleshooting

### View Webhook Logs

```bash
cd /mnt/c/Users/Agent/Desktop/HR\ Center/cloudflare-app
wrangler tail --format pretty
```

This shows real-time logs of:
- Webhook calls from Bitrix24
- Email sends
- Any errors

### Check Email Log in Database

```bash
# Query email_log table to see all sent emails
wrangler d1 execute hartzell_hr_prod --command "SELECT * FROM email_log ORDER BY created_at DESC LIMIT 10"
```

### Common Issues

**Issue:** Webhook not triggering
**Solution:** Verify the webhook URL is exactly `https://hartzell.work/api/bitrix/stage-change` (no trailing slash)

**Issue:** Email not sending
**Solution:** Check that the candidate has a valid email in `ufCrm6Email` field in Bitrix24

**Issue:** "Employee not found" error
**Solution:** The item ID in Bitrix24 may not exist or may have been deleted. Check the item ID in the webhook payload.

---

## 📧 Email Templates Preview

### Rejection Email
**Subject:** Update on Your Application with Hartzell Companies
**Content:** Professional, empathetic rejection notice explaining the decision and informing that application is kept on file for 12 months.

### Offer Email
**Subject:** 🎉 Congratulations - Job Offer from Hartzell Companies!
**Content:** Celebratory email explaining next steps:
1. HR will call within 24-48 hours
2. Formal offer letter will be sent to sign
3. Onboarding process begins after signing

### Onboarding Welcome Email
**Subject:** Welcome to Hartzell - Let's Get You Started!
**Content:** Welcome message with start date and document checklist:
- I-9 Employment Eligibility
- W-4 Tax Withholding
- Direct Deposit
- Background Check
- Drug Test

---

## 🔐 Security Notes

- ✅ Webhook endpoint is **CSRF-exempt** (external webhooks can't send CSRF tokens)
- ✅ Webhook is **POST-only** (GET requests return 404)
- ✅ All emails logged to `email_log` table for audit trail
- ✅ Timeline entries created in Bitrix24 for transparency

---

## 🎯 Success Criteria

After completing this setup, you should have:

- [x] 3 automation rules configured in Bitrix24
- [x] Rejection emails sending automatically
- [x] Offer emails sending automatically
- [x] Onboarding welcome emails sending automatically
- [x] All email events logged to Bitrix24 timeline
- [x] All emails tracked in `email_log` database table

---

## 📞 Next Steps

1. **Configure the webhooks** using this guide (15-20 minutes)
2. **Test with real candidates** moving through the pipeline
3. **Monitor logs** for first few days to ensure smooth operation
4. **Optional:** Configure additional automations (HR tasks, document assignments, etc.)

---

**Webhook Endpoint:** `https://hartzell.work/api/bitrix/stage-change`
**Health Check:** `https://hartzell.work/api/bitrix/health`
**Deployment Date:** October 20, 2025
**Version:** 1.0.0
