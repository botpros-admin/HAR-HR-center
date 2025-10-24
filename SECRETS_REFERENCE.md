# 🔐 Cloudflare Secrets Reference

**Account:** agent@botpros.ai
**Account ID:** b68132a02e46f8cc02bcf9c5745a72b9
**Last Updated:** October 24, 2025

---

## Worker Secrets (Hartzell HR Center)

### How to Access

```bash
cd "/mnt/c/Users/Agent/Desktop/HR Center/cloudflare-app"
wrangler secret list
```

### Current Secrets

| Secret Name | Purpose | Where to Get |
|------------|---------|--------------|
| `BITRIX24_WEBHOOK_URL` | Bitrix24 REST API endpoint | Bitrix24 Admin → Integrations → Webhooks |
| `BITRIX_WEBHOOK_URL` | Duplicate (legacy) | Same as above |
| `SESSION_SECRET` | Session encryption key | Generate: `openssl rand -hex 32` |
| `RESEND_API_KEY` | Email delivery service | https://resend.com/api-keys |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile CAPTCHA | Cloudflare Dashboard → Turnstile |

---

## Secret Values (CONFIDENTIAL)

### BITRIX24_WEBHOOK_URL & BITRIX_WEBHOOK_URL

```
https://hartzell.app/rest/1/jp689g5yfvre9pvd
```

**How to Update:**
```bash
echo "https://hartzell.app/rest/1/jp689g5yfvre9pvd" | wrangler secret put BITRIX24_WEBHOOK_URL
echo "https://hartzell.app/rest/1/jp689g5yfvre9pvd" | wrangler secret put BITRIX_WEBHOOK_URL
```

**How to Get New Webhook:**
1. Go to Bitrix24: https://hartzell.app
2. Admin panel → Settings → Developer tools → Other → Inbound webhook
3. Create new webhook with permissions:
   - `crm` (all CRM operations)
   - `user` (read user info)
   - `task` (create tasks)
4. Copy webhook URL

---

### SESSION_SECRET

**Purpose:** Encrypts session cookies

**Format:** 32-byte hexadecimal string (64 characters)

**Current Value:** [REDACTED - Generate new if needed]

**Generate New:**
```bash
openssl rand -hex 32
```

**Set Secret:**
```bash
openssl rand -hex 32 | wrangler secret put SESSION_SECRET
```

**⚠️ WARNING:** Changing this will invalidate all active sessions (log out all users)

---

### RESEND_API_KEY

**Purpose:** Send transactional emails (application confirmations, reminders, etc.)

**Current Value:** [REDACTED - Stored in Resend dashboard]

**How to Get:**
1. Go to https://resend.com/api-keys
2. Create new API key (or use existing)
3. Copy key (starts with `re_...`)

**Set Secret:**
```bash
echo "re_YOUR_API_KEY_HERE" | wrangler secret put RESEND_API_KEY
```

**Email Settings:**
- **From:** onboarding@hartzell.work (configured in Resend)
- **Domain:** hartzell.work (must be verified in Resend)

---

### TURNSTILE_SECRET_KEY

**Purpose:** Verify Cloudflare Turnstile CAPTCHA challenges

**Current Value:** [REDACTED - Stored in Cloudflare Dashboard]

**How to Get:**
1. Go to Cloudflare Dashboard: https://dash.cloudflare.com/b68132a02e46f8cc02bcf9c5745a72b9
2. Click "Turnstile"
3. Select your site (or create new)
4. Copy "Secret Key"

**Set Secret:**
```bash
echo "YOUR_TURNSTILE_SECRET_KEY" | wrangler secret put TURNSTILE_SECRET_KEY
```

**Corresponding Site Key (Public):**
- Stored in frontend environment variable: `NEXT_PUBLIC_HCAPTCHA_SITE_KEY`
- Get from same Turnstile dashboard page ("Site Key")

---

## Environment Variables (Non-Secret)

These are set in `wrangler.toml` and are NOT secret:

```toml
[vars]
BITRIX24_ENTITY_TYPE_ID = "1054"      # Bitrix24 SPA entity type
SESSION_MAX_AGE = "28800"             # 8 hours in seconds
RATE_LIMIT_MAX_ATTEMPTS = "5"         # Max login attempts
RATE_LIMIT_WINDOW = "900"             # 15 minutes in seconds
```

---

## Frontend Environment Variables

Set in Cloudflare Pages Dashboard → hartzell-hr-frontend → Settings → Environment Variables:

| Variable | Value | Purpose |
|---------|-------|---------|
| `NEXT_PUBLIC_API_URL` | `https://hartzell.work/api` | Backend API endpoint |
| `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` | [Get from Turnstile] | Turnstile site key (public) |

---

## How to Update Secrets

### Interactive (Prompted for value)

```bash
cd "/mnt/c/Users/Agent/Desktop/HR Center/cloudflare-app"
wrangler secret put SECRET_NAME
# Paste value when prompted (hidden input)
```

### Non-Interactive (Pipe value)

```bash
echo "secret_value_here" | wrangler secret put SECRET_NAME
```

### From File

```bash
cat secret.txt | wrangler secret put SECRET_NAME
```

---

## How to Delete Secrets

```bash
wrangler secret delete SECRET_NAME
```

**⚠️ WARNING:** This will cause Worker errors if the secret is referenced in code!

---

## Backup & Recovery

### Export Secrets (Names Only)

```bash
wrangler secret list > secrets-backup.json
```

**Note:** Cloudflare does NOT allow exporting secret values. You must store them separately.

### Store Secrets Securely

**Recommended Options:**
1. **Password Manager** (1Password, LastPass, Bitwarden)
2. **Environment File** (`.env` - NEVER commit to git!)
3. **Encrypted Note** (GPG, age)

**Example `.env` file:**
```bash
# Cloudflare Worker Secrets - DO NOT COMMIT
BITRIX24_WEBHOOK_URL=https://hartzell.app/rest/1/jp689g5yfvre9pvd
SESSION_SECRET=<32-byte-hex-string>
RESEND_API_KEY=re_xxxxxxxxxxxxx
TURNSTILE_SECRET_KEY=<turnstile-secret>
```

**Add to `.gitignore`:**
```
.env
.env.local
secrets.txt
SECRETS_REFERENCE.md
```

---

## Troubleshooting

### Issue: "Secret not found" error

**Solution:** Set the secret
```bash
wrangler secret put SECRET_NAME
```

### Issue: "Invalid secret value" error

**Causes:**
- Empty value
- Wrong format (e.g., expecting hex, got plain text)
- Special characters not properly escaped

**Solution:** Check format and retry

### Issue: Need to rotate secrets

**Steps:**
1. Generate new secret value
2. Update secret: `wrangler secret put SECRET_NAME`
3. Deploy worker: `wrangler deploy`
4. Verify functionality
5. Update backup documentation

---

## Security Best Practices

✅ **DO:**
- Store secrets in password manager
- Rotate secrets periodically (every 90 days)
- Use different secrets for dev/staging/production
- Delete unused secrets
- Monitor access logs

❌ **DON'T:**
- Commit secrets to git
- Share secrets via email/Slack
- Use same secret across multiple projects
- Log secret values
- Store secrets in plaintext files

---

## Emergency Access

If you lose access to secrets:

1. **Bitrix24 Webhook:** Regenerate in Bitrix24 dashboard
2. **Session Secret:** Generate new with `openssl rand -hex 32` (will log out all users)
3. **Resend API Key:** Create new key in Resend dashboard
4. **Turnstile Secret:** Regenerate in Cloudflare Turnstile dashboard

**After regenerating, update Worker immediately:**
```bash
wrangler secret put SECRET_NAME  # Set new value
wrangler deploy                  # Deploy updated worker
```

---

**End of Secrets Reference**

🔒 Keep this document secure and never commit to public repositories!
