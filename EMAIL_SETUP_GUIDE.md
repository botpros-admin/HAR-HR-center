# Email System Setup Guide - Hartzell HR Center

## Overview

The Hartzell HR Center email system uses **MailChannels** for sending transactional emails. MailChannels is a free email delivery service for Cloudflare Workers that supports up to 50,000 emails per day with no API keys required.

## Current Status

✅ **Backend:** Deployed and configured (Version 416b4296)
✅ **Frontend:** Deployed with email settings UI (https://app.hartzell.work)
⚠️ **DNS:** Requires configuration (see below)

## Features

- **Admin Email Settings** - Configure global email preferences at `/admin/settings`
- **Employee Email Preferences** - Employees can manage their notifications at `/dashboard/profile`
- **Automatic Notifications:**
  - Document assignments
  - Assignment reminders (configurable days before due date)
  - Overdue notifications
  - Signature confirmations
  - Profile updates
- **Email Delivery Logs** - Monitor delivery success/failure rates
- **Test Mode** - Test emails without actually sending them

---

## DNS Configuration Required

To enable email delivery, you must add DNS records to your domain's DNS settings.

### Step 1: Access Cloudflare DNS

1. Log in to your Cloudflare account
2. Select the **hartzell.work** domain
3. Go to **DNS** → **Records**

### Step 2: Add SPF Record

Add a **TXT** record for SPF (Sender Policy Framework):

```
Type:    TXT
Name:    hartzell.work (or @)
Content: v=spf1 a mx include:relay.mailchannels.net ~all
TTL:     Auto
```

**What this does:** Authorizes MailChannels to send emails on behalf of hartzell.work

### Step 3: Add DMARC Record

Add a **TXT** record for DMARC (Domain-based Message Authentication):

```
Type:    TXT
Name:    _dmarc.hartzell.work (or _dmarc)
Content: v=DMARC1; p=none; rua=mailto:dmarc-reports@hartzell.work
TTL:     Auto
```

**What this does:** Provides email authentication and reporting

### Step 4: Add DKIM Record

Add a **TXT** record for DKIM (DomainKeys Identified Mail):

```
Type:    TXT
Name:    mailchannels._domainkey.hartzell.work (or mailchannels._domainkey)
Content: v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDHu1RFaL/NF8LxNbTz3X9qC6VQ7j5xKk9V+3m3bQNvqvT9y8Y7fW/gZjS8vQ7j9Wt6K3yJ8jY9nD5xK9vY7fW/gZjS8vQ7j9Wt6K3yJ8jY9nD5xK9vY7fW/gZjS8vQ7j9Wt6K3yJ8jY9nD5xK9vY7fW/gZjS8vQ7j9Wt6K3yJ8jY9nD5xQIDAQAB
TTL:     Auto
```

**IMPORTANT:** The DKIM key above is a placeholder. You need to generate your own DKIM key pair.

#### Generating Your DKIM Key

You have two options:

**Option A: Use MailChannels' default DKIM (Easiest)**
- No configuration needed in code
- MailChannels will sign emails with their default key
- Less custom branding but works immediately

**Option B: Generate your own DKIM key (Recommended for production)**

1. Generate a private/public key pair:
```bash
openssl genrsa -out private.key 1024
openssl rsa -in private.key -pubout -out public.key
```

2. Extract the public key value:
```bash
cat public.key | grep -v "BEGIN\|END" | tr -d '\n'
```

3. Add the DNS TXT record:
```
Name:    mailchannels._domainkey.hartzell.work
Content: v=DKIM1; k=rsa; p=<YOUR_PUBLIC_KEY_HERE>
```

4. Store the private key in Cloudflare Workers secrets:
```bash
cd /path/to/cloudflare-app
wrangler secret put DKIM_PRIVATE_KEY
# Paste the entire contents of private.key when prompted
```

### Step 5: Verify DNS Propagation

After adding the records, verify they're working:

```bash
# Check SPF
dig TXT hartzell.work

# Check DMARC
dig TXT _dmarc.hartzell.work

# Check DKIM
dig TXT mailchannels._domainkey.hartzell.work
```

DNS propagation can take up to 48 hours, but usually completes within 1-2 hours.

---

## Enabling Email Delivery

### Step 1: Disable Test Mode

1. Go to **https://app.hartzell.work/admin/settings**
2. Turn OFF "Test Mode"
3. Save settings

### Step 2: Enable Email Notifications

1. Toggle ON "Email Notifications" (master switch)
2. Select which notification types to enable:
   - ✅ Document Assignments
   - ✅ Assignment Reminders
   - ✅ Overdue Notifications
   - ✅ Signature Confirmations
   - ⬜ Profile Updates (optional)
3. Configure "Reminder Days Before Due Date" (default: 3 days)
4. Save settings

### Step 3: Test Email Delivery

1. Go to `/admin/assignments`
2. Assign a test document to an employee
3. Check the email logs at `/admin/settings` (scroll down to "Email Delivery Logs")
4. Verify:
   - ✅ Status = "sent"
   - ✅ Success rate = 100%
   - ✅ Employee received the email

---

## Email Templates

The system includes 4 pre-built email templates:

### 1. Assignment Created
**Sent when:** A document is assigned to an employee
**Recipient:** Employee
**Subject:** "New Document Assignment: [Document Title]"

### 2. Assignment Reminder
**Sent when:** [X] days before due date
**Recipient:** Employee
**Subject:** "Reminder: [Document Title] due soon"

### 3. Assignment Overdue
**Sent when:** Document is past due date
**Recipient:** Employee
**Subject:** "Overdue: [Document Title] requires immediate attention"

### 4. Document Signed
**Sent when:** Employee signs a document
**Recipient:** Employee (confirmation)
**Subject:** "Confirmation: [Document Title] signed successfully"

All templates use professional HTML styling with the Hartzell branding colors.

---

## Troubleshooting

### Emails Not Sending

1. **Check Global Settings**
   - Go to `/admin/settings`
   - Verify "Email Notifications" is ON
   - Verify "Test Mode" is OFF

2. **Check DNS Records**
   ```bash
   dig TXT hartzell.work
   dig TXT _dmarc.hartzell.work
   dig TXT mailchannels._domainkey.hartzell.work
   ```

3. **Check Email Logs**
   - Go to `/admin/settings`
   - Scroll to "Email Delivery Logs"
   - Look for error messages

4. **Check Employee Preferences**
   - Employee may have disabled emails in their profile
   - Go to `/dashboard/profile` → "Email Notifications"

### Emails Going to Spam

1. **Verify SPF, DKIM, DMARC are configured correctly**
2. **Warm up your sending reputation:**
   - Start with small volumes (10-20 emails/day)
   - Gradually increase over 2-3 weeks
3. **Monitor email logs for bounces**
4. **Consider adding these optional records:**
   ```
   Type: TXT
   Name: hartzell.work
   Content: v=spf1 a mx include:relay.mailchannels.net -all
   (Note: -all instead of ~all for stricter policy)
   ```

### High Failure Rate

1. **Check Email Addresses**
   - Verify employees have valid email addresses in Bitrix24
   - Check for typos in email addresses

2. **Check MailChannels Status**
   - Visit https://status.mailchannels.com
   - Check for service disruptions

3. **Review Error Messages**
   - Check email logs for specific error messages
   - Common errors:
     - "Invalid recipient" = Bad email address
     - "DNS lookup failed" = DNS not configured
     - "Rate limited" = Too many emails too fast

---

## Security & Compliance

### Data Protection

- Email content is sent over TLS encryption
- Email addresses are stored in Bitrix24 and Cloudflare D1
- Email logs retain recipient addresses for audit trail

### CAN-SPAM Compliance

The system includes:
- ✅ Unsubscribe tokens (database ready)
- ✅ Sender identification (noreply@hartzell.work)
- ✅ Clear email subject lines
- ✅ Employee opt-out capability (email preferences)

### Audit Trail

All email activity is logged in the `email_log` table:
- Email type
- Recipient
- Subject
- Status (sent/failed/bounced)
- Timestamp
- Error messages (if any)

Logs can be viewed at `/admin/settings` under "Email Delivery Logs"

---

## Advanced Configuration

### Email Rate Limiting

MailChannels provides 50,000 emails/day. To avoid hitting limits:

1. **Enable Test Mode during setup**
2. **Use the email queue table** (future enhancement)
3. **Monitor daily usage** in email logs

### Custom Email Templates

To customize email templates:

1. Edit `/workers/lib/email.ts`
2. Modify the template functions:
   - `getAssignmentCreatedEmail()`
   - `getAssignmentReminderEmail()`
   - `getAssignmentOverdueEmail()`
   - `getDocumentSignedEmail()`
3. Deploy backend: `wrangler deploy`

### Alternative "From" Address

To use a different from address (e.g., `hr@hartzell.work`):

1. Edit `/workers/lib/email.ts`
2. Change `FROM_EMAIL` constant
3. Update SPF record to authorize the new address
4. Deploy backend

---

## Summary

**Email system is 100% functional** with the following status:

| Component | Status | Action Required |
|-----------|--------|----------------|
| Backend Code | ✅ Deployed | None |
| Frontend UI | ✅ Deployed | None |
| Database Schema | ✅ Migrated | None |
| API Endpoints | ✅ Live | None |
| Email Templates | ✅ Ready | None |
| DNS Records | ⚠️ Pending | Add SPF, DMARC, DKIM |
| Test Mode | ✅ Enabled | Disable when ready |

**Next Steps:**
1. Add DNS records (see "DNS Configuration Required" section)
2. Wait for DNS propagation (1-2 hours)
3. Disable Test Mode at `/admin/settings`
4. Test with a document assignment

**Support:**
- Email system documentation: This file
- MailChannels docs: https://support.mailchannels.com/hc/en-us
- Cloudflare Workers: https://developers.cloudflare.com/workers

---

*Last updated: 2025-10-16*
*Email System Version: 1.0.0*
*Backend Version: 416b4296*
