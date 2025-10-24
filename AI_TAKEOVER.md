# 🤖 Cloudflare Infrastructure - Complete AI Takeover Guide

**Account:** agent@botpros.ai | **Account ID:** b68132a02e46f8cc02bcf9c5745a72b9
**Created:** October 24, 2025 | **Status:** Production Ready ✅

---

## 📋 Table of Contents

1. [Quick Start (5 Minutes)](#quick-start-5-minutes)
2. [Account Overview](#account-overview)
3. [Infrastructure Inventory](#infrastructure-inventory)
4. [Secrets & Credentials](#secrets--credentials)
5. [Deployment Procedures](#deployment-procedures)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Creating New Projects (botpros.ai)](#creating-new-projects-botprosaiai)
8. [Troubleshooting](#troubleshooting)
9. [Recent Issues & Fixes](#recent-issues--fixes)
10. [Emergency Procedures](#emergency-procedures)

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Verify Authentication

```bash
cd "/mnt/c/Users/Agent/Desktop/HR Center/cloudflare-app"
wrangler whoami
```

**Expected output:**
```
👋 You are logged in with an OAuth Token, associated with the email agent@botpros.ai.
Account ID: b68132a02e46f8cc02bcf9c5745a72b9
```

**If not authenticated:**
```bash
wrangler login
```

### Step 2: Quick Infrastructure Check

```bash
# List current deployments
wrangler deployments list | head -10

# Check database
wrangler d1 list | grep hartzell_hr_prod

# Check secrets
wrangler secret list

# Check production is live
curl -I https://hartzell.work/api/health
curl -I https://app.hartzell.work
```

### Step 3: Test Deployment

```bash
# Backend (dry run)
cd "/mnt/c/Users/Agent/Desktop/HR Center/cloudflare-app"
wrangler deploy --dry-run

# Frontend (check package.json exists)
cd "/mnt/c/Users/Agent/Desktop/HR Center/frontend"
ls -l package.json
```

**✅ If all checks pass, you're ready to manage the infrastructure!**

---

## 🔐 Account Overview

### Cloudflare Account

```yaml
Email:           agent@botpros.ai
Account ID:      b68132a02e46f8cc02bcf9c5745a72b9
Account Name:    Agent@botpros.ai's Account
Plan:            Free Tier
Monthly Cost:    $0
```

**Dashboard:** https://dash.cloudflare.com/b68132a02e46f8cc02bcf9c5745a72b9

### Token Permissions

✅ Workers (write) | ✅ Workers KV (write) | ✅ D1 (write) | ✅ Pages (write)
✅ R2 (write) | ✅ Zones (read) | ✅ AI (write) | ✅ Queues (write)

### Authentication Location

- **Windows:** `C:\Users\Agent\.wrangler\config\default.toml`
- **WSL:** `/home/agent/.wrangler/config/default.toml`

---

## 🏗️ Infrastructure Inventory

### Production System: Hartzell HR Center

**Live URLs:**
- **Frontend:** https://app.hartzell.work
- **Backend API:** https://hartzell.work/api/*

**Status:** ✅ LIVE IN PRODUCTION (Deployed Oct 2025)

### 1. Workers (Backend)

#### hartzell-hr-center-production

```yaml
Route:           hartzell.work/api/*
Latest Version:  60c2eb9a-5bc0-479f-af98-b1561abece89
Deploy Date:     October 24, 2025 2:46 AM UTC
Framework:       Hono (Node.js)
Entry Point:     workers/index.ts
Location:        /mnt/c/Users/Agent/Desktop/HR Center/cloudflare-app/
```

**Cron Triggers:**
- `0 13 * * *` - Daily at 1 PM UTC (9 AM EDT)
- `0 14 * * *` - Daily at 2 PM UTC (9 AM EST)
- Purpose: Email reminders (reminder/overdue document assignments)

**Commands:**
```bash
cd "/mnt/c/Users/Agent/Desktop/HR Center/cloudflare-app"

# Deploy
wrangler deploy

# View logs
wrangler tail
wrangler tail --format pretty
wrangler tail --status error
timeout 60 wrangler tail  # Tail for 60 seconds

# List deployments
wrangler deployments list

# Rollback (if needed)
wrangler versions deploy [VERSION_ID]@100
```

### 2. D1 Databases (SQLite)

| Name | UUID | Size | Purpose |
|------|------|------|---------|
| **hartzell_hr_prod** | `9926c3a9-c6e1-428f-8c36-fdb001c326fd` | 942 KB | Production |
| hartzell_hr_staging | `114317f0-6441-4201-8757-b300acd822d8` | 266 KB | Staging |
| hartzell_hr_dev | `a193ff69-4192-4124-9e86-e55f29673ba8` | 266 KB | Development |

**Production Binding:** `DB`

**Production Tables (7):**
```sql
sessions                 -- User sessions (8hr expiry)
login_attempts          -- Rate limiting (15min window)
admin_users             -- Admin credentials (bcrypt)
employee_cache          -- Cached employee metadata
document_templates      -- PDF template metadata
document_assignments    -- Document-to-employee assignments
onboarding_tokens       -- Magic link tokens (7 day expiry)
```

**Common Commands:**
```bash
# List tables
wrangler d1 execute hartzell_hr_prod --command="
SELECT name FROM sqlite_master WHERE type='table'
"

# Count active sessions
wrangler d1 execute hartzell_hr_prod --command="
SELECT COUNT(*) FROM sessions
WHERE expires_at > CAST(strftime('%s', 'now') * 1000 AS INTEGER)
"

# Clean expired sessions
wrangler d1 execute hartzell_hr_prod --command="
DELETE FROM sessions
WHERE expires_at < CAST(strftime('%s', 'now') * 1000 AS INTEGER)
"

# Export database
wrangler d1 export hartzell_hr_prod --output=backup.sql

# Execute migration
wrangler d1 execute hartzell_hr_prod --file=schema.sql
```

### 3. KV Namespaces (Key-Value Store)

| Name | ID | Purpose |
|------|-----|---------|
| **production-CACHE** | `54f7714316b14265a8224c255d9a7f80` | Production cache |
| CACHE | `ae6971a1e8f746d4a39687a325f5dd2b` | Legacy cache |
| staging-CACHE | `540544d672e443d597b93065e6f48c93` | Staging |
| development-CACHE | `8e0ddf46ecc8455d809613e5f00b1192` | Development |

**Production Binding:** `CACHE`

**Free Tier Limits:**
- 100,000 reads/day
- 1,000 writes/day ⚠️ **CRITICAL**
- 1 GB storage

**Commands:**
```bash
# Production namespace ID
PROD_KV_ID="54f7714316b14265a8224c255d9a7f80"

# List keys
wrangler kv key list --namespace-id=$PROD_KV_ID

# Get key
wrangler kv key get "employee:badge:EMP1001" --namespace-id=$PROD_KV_ID

# Put key
wrangler kv key put "test:key" "value" --namespace-id=$PROD_KV_ID

# Delete key
wrangler kv key delete "test:key" --namespace-id=$PROD_KV_ID

# Bulk delete ALL keys (⚠️ USE WITH CAUTION)
wrangler kv key list --namespace-id=$PROD_KV_ID | \
  jq -r '.[].name' | \
  xargs -I {} wrangler kv key delete "{}" --namespace-id=$PROD_KV_ID
```

### 4. R2 Buckets (Object Storage)

| Name | Purpose | Binding |
|------|---------|---------|
| **hartzell-assets-prod** | Static assets (logo, images) | `ASSETS` |
| **hartzell-hr-templates-prod** | PDF templates | `DOCUMENTS` |
| hartzell-assets-staging | Staging assets | - |
| hartzell-hr-templates-staging | Staging templates | - |
| hartzell-assets-dev | Dev assets | - |
| hartzell-hr-templates-dev | Dev templates | - |

**Commands:**
```bash
# List objects
wrangler r2 object list hartzell-assets-prod
wrangler r2 object list hartzell-hr-templates-prod

# Upload
wrangler r2 object put hartzell-assets-prod/logo.png --file=logo.png

# Download
wrangler r2 object get hartzell-assets-prod/logo.png --file=downloaded.png

# Delete
wrangler r2 object delete hartzell-assets-prod/logo.png
```

### 5. Pages (Frontend Hosting)

#### hartzell-hr-frontend

```yaml
Custom Domain:       app.hartzell.work
Cloudflare Domain:   hartzell-hr-frontend.pages.dev
Framework:           Next.js 14 (Static Export)
Build Command:       npm run build
Output Directory:    out/
Production Branch:   main (⚠️ CRITICAL - only branch serving custom domain)
Location:            /mnt/c/Users/Agent/Desktop/HR Center/frontend/
```

**Environment Variables (Set in Pages Dashboard):**
```bash
NEXT_PUBLIC_API_URL=https://hartzell.work/api
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=[hCaptcha site key]
```

**Commands:**
```bash
cd "/mnt/c/Users/Agent/Desktop/HR Center/frontend"

# Deploy (ALWAYS use this!)
npm run deploy

# List deployments
npx wrangler pages deployment list --project-name=hartzell-hr-frontend
```

---

## 🔑 Secrets & Credentials

### Worker Secrets (5 Total)

**Set via:** `wrangler secret put SECRET_NAME`

| Secret | Purpose | How to Get/Generate |
|--------|---------|-------------------|
| `BITRIX24_WEBHOOK_URL` | Bitrix24 REST API endpoint | Bitrix24 Admin → Integrations → Webhooks |
| `BITRIX_WEBHOOK_URL` | Duplicate/legacy (same value) | Same as above |
| `SESSION_SECRET` | Session encryption (32-byte hex) | `openssl rand -hex 32` |
| `RESEND_API_KEY` | Email delivery service | https://resend.com/api-keys |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile CAPTCHA | Dashboard → Turnstile |

### Secret Values (PRODUCTION)

⚠️ **SECURITY WARNING:** These are production secrets. Store securely.

#### BITRIX24_WEBHOOK_URL & BITRIX_WEBHOOK_URL
```
https://hartzell.app/rest/1/jp689g5yfvre9pvd
```

**Update:**
```bash
echo "https://hartzell.app/rest/1/jp689g5yfvre9pvd" | wrangler secret put BITRIX24_WEBHOOK_URL
echo "https://hartzell.app/rest/1/jp689g5yfvre9pvd" | wrangler secret put BITRIX_WEBHOOK_URL
```

**Regenerate:**
1. Go to https://hartzell.app
2. Admin → Settings → Developer tools → Other → Inbound webhook
3. Create webhook with permissions: `crm`, `user`, `task`
4. Copy webhook URL

#### SESSION_SECRET
**Format:** 32-byte hex (64 characters)

**Generate new:**
```bash
openssl rand -hex 32
```

**Set:**
```bash
openssl rand -hex 32 | wrangler secret put SESSION_SECRET
```

⚠️ **WARNING:** Changing this logs out all users!

#### RESEND_API_KEY
**Get from:** https://resend.com/api-keys
**Format:** `re_...`

**Set:**
```bash
echo "re_YOUR_API_KEY" | wrangler secret put RESEND_API_KEY
```

**Email config:**
- From: `onboarding@hartzell.work`
- Domain: `hartzell.work` (must be verified in Resend)

#### TURNSTILE_SECRET_KEY
**Get from:** Dashboard → Turnstile → Select Site → Secret Key

**Set:**
```bash
echo "YOUR_SECRET_KEY" | wrangler secret put TURNSTILE_SECRET_KEY
```

**Corresponding site key (public):** Set in Pages environment variables

### Managing Secrets

**List secrets:**
```bash
wrangler secret list
```

**Update secret:**
```bash
wrangler secret put SECRET_NAME
# Paste value when prompted (hidden)
```

**Delete secret:**
```bash
wrangler secret delete SECRET_NAME
```

---

## 🚀 Deployment Procedures

### Backend Deployment (Worker)

```bash
cd "/mnt/c/Users/Agent/Desktop/HR Center/cloudflare-app"

# Deploy to production
wrangler deploy

# Verify
wrangler deployments list
curl -I https://hartzell.work/api/health
```

**What happens:**
1. TypeScript compiled to JavaScript
2. Dependencies bundled
3. Uploaded to Cloudflare Workers
4. Routes updated: `hartzell.work/api/*`
5. New version ID returned

### Frontend Deployment (Pages)

⚠️ **CRITICAL:** ALWAYS use this exact command:

```bash
cd "/mnt/c/Users/Agent/Desktop/HR Center/frontend"
npm run deploy
```

**Why this is critical:**
- Custom domain `app.hartzell.work` is ONLY configured for `main` branch
- Script automatically deploys to `main` branch
- Cleans all caches (prevents stale builds)
- Verifies responsive design classes
- Commits dirty files if needed

**❌ NEVER do this:**
```bash
wrangler pages deploy out  # Wrong branch!
npm run build && wrangler pages deploy out  # No cache cleaning!
```

**What `npm run deploy` does:**
1. Cleans `.next`, `out`, `node_modules/.cache`
2. Runs `npm run build` (Next.js static export)
3. Verifies responsive design in output
4. Deploys to `main` branch via wrangler
5. Updates custom domain automatically

**Verify:**
```bash
# List deployments
npx wrangler pages deployment list --project-name=hartzell-hr-frontend

# Test URL
curl -I https://app.hartzell.work/
```

### Database Migrations

```bash
cd "/mnt/c/Users/Agent/Desktop/HR Center/cloudflare-app"

# Execute SQL file
wrangler d1 execute hartzell_hr_prod --file=migrations/001_migration.sql

# Execute single command
wrangler d1 execute hartzell_hr_prod --command="
ALTER TABLE users ADD COLUMN new_field TEXT
"

# Verify
wrangler d1 execute hartzell_hr_prod --command="
SELECT sql FROM sqlite_master WHERE type='table'
"
```

---

## 📊 Monitoring & Maintenance

### View Logs

```bash
cd "/mnt/c/Users/Agent/Desktop/HR Center/cloudflare-app"

# Live tail (all requests)
wrangler tail

# Pretty format
wrangler tail --format pretty

# Filter by status
wrangler tail --status error
wrangler tail --status success

# Filter by method
wrangler tail --method POST

# Limited duration
timeout 60 wrangler tail
```

### Check Usage

**Via Dashboard:**
1. Go to https://dash.cloudflare.com/b68132a02e46f8cc02bcf9c5745a72b9
2. Workers & Pages → Select worker → Analytics
3. D1 / KV / R2 → View usage

**Current Usage (Oct 24, 2025):**
```
Workers:  ~500 requests/day  (0.5% of 100K limit) ✅
D1:       ~1 MB storage      (0.02% of 5GB limit) ✅
KV Reads: ~100/day           (0.1% of 100K limit) ✅
KV Writes: ~0/day            (0% of 1K limit) ✅ FIXED!
R2:       ~5 MB storage      (0.05% of 10GB limit) ✅
```

**Monthly Cost:** $0 (within free tier) ✅

### Database Maintenance

```bash
# Clean expired sessions
wrangler d1 execute hartzell_hr_prod --command="
DELETE FROM sessions
WHERE expires_at < CAST(strftime('%s', 'now') * 1000 AS INTEGER)
"

# Clear rate limiting
wrangler d1 execute hartzell_hr_prod --command="
DELETE FROM login_attempts
"

# View stats
wrangler d1 execute hartzell_hr_prod --command="
SELECT
  (SELECT COUNT(*) FROM sessions) as total_sessions,
  (SELECT COUNT(*) FROM employee_cache) as cached_employees,
  (SELECT COUNT(*) FROM document_assignments) as assignments
"
```

---

## 🆕 Creating New Projects (botpros.ai)

### Recommended Structure

```
/mnt/c/Users/Agent/Desktop/
├── HR Center/              ← Existing (hartzell.work)
└── BotPros Projects/
    ├── project-1/
    │   ├── backend/        ← Worker
    │   └── frontend/       ← Pages
    └── project-2/
        ├── backend/
        └── frontend/
```

### Create New Worker

```bash
# Create directory
mkdir -p "/mnt/c/Users/Agent/Desktop/BotPros Projects/my-app/backend"
cd "/mnt/c/Users/Agent/Desktop/BotPros Projects/my-app/backend"

# Initialize Worker
npm create cloudflare@latest

# Select:
# - Name: my-app-backend
# - Template: "Hello World" Worker
# - TypeScript: Yes
# - Git: Yes
# - Deploy: No (configure first)
```

**Edit `wrangler.toml`:**
```toml
name = "my-app-backend"
main = "src/index.ts"
compatibility_date = "2025-10-24"
compatibility_flags = ["nodejs_compat"]

account_id = "b68132a02e46f8cc02bcf9c5745a72b9"

# Custom domain route
routes = [
  { pattern = "api.botpros.ai/my-app/*", zone_name = "botpros.ai" }
]

# Add D1 if needed
[[d1_databases]]
binding = "DB"
database_name = "my-app-db"
database_id = "CREATE_WITH: wrangler d1 create my-app-db"

# Add KV if needed
[[kv_namespaces]]
binding = "CACHE"
id = "CREATE_WITH: wrangler kv namespace create CACHE"

# Add R2 if needed
[[r2_buckets]]
binding = "STORAGE"
bucket_name = "CREATE_WITH: wrangler r2 bucket create my-app-storage"
```

**Deploy:**
```bash
# Create resources first
wrangler d1 create my-app-db  # Copy UUID to wrangler.toml
wrangler kv namespace create "CACHE"  # Copy ID to wrangler.toml
wrangler r2 bucket create my-app-storage

# Deploy
wrangler deploy
```

### Create New Pages Project

```bash
cd "/mnt/c/Users/Agent/Desktop/BotPros Projects/my-app"

# Create Next.js app
npx create-next-app@latest frontend
cd frontend

# Configure for static export
# Edit next.config.js:
module.exports = {
  output: 'export',
  trailingSlash: true,
}

# Build
npm run build

# Deploy
npx wrangler pages deploy out --project-name=my-app-frontend --branch=main
```

**Add Custom Domain:**
1. Dashboard → Pages → my-app-frontend
2. Settings → Custom domains → Add domain
3. Enter: `my-app.botpros.ai`
4. Cloudflare auto-creates DNS if managing domain

**Set Environment Variables:**
1. Dashboard → Pages → my-app-frontend
2. Settings → Environment variables
3. Add:
   - `NEXT_PUBLIC_API_URL` = `https://api.botpros.ai/my-app`
   - (any other public vars)

---

## 🔧 Troubleshooting

### Issue: Worker Not Responding

**Symptoms:** 500 errors, timeouts

**Solutions:**
```bash
# Check recent deployments
wrangler deployments list

# View error logs
wrangler tail --status error

# Rollback if needed
wrangler versions deploy [PREVIOUS_VERSION_ID]@100
```

### Issue: Frontend Can't Reach Backend

**Symptoms:** "Failed to fetch" in browser console

**Solutions:**
1. Verify backend is live:
   ```bash
   curl -I https://hartzell.work/api/health
   ```

2. Check CORS settings in `workers/index.ts` (lines 27-53)

3. Verify frontend environment variable:
   - Dashboard → Pages → hartzell-hr-frontend → Settings → Environment variables
   - Check: `NEXT_PUBLIC_API_URL = https://hartzell.work/api`

4. Rebuild frontend:
   ```bash
   cd frontend
   npm run deploy
   ```

### Issue: Database Errors

**Symptoms:** "Database error" in logs

**Solutions:**
```bash
# Verify database exists
wrangler d1 list | grep hartzell_hr_prod

# Check tables
wrangler d1 execute hartzell_hr_prod --command="
SELECT name FROM sqlite_master WHERE type='table'
"

# Check binding in wrangler.toml
grep -A 3 "d1_databases" wrangler.toml
```

### Issue: KV Write Limit Exceeded

**Symptoms:** Daily emails "KV write limit exceeded"

**Diagnosis:**
```bash
# Check cron triggers
grep -A 5 "triggers" wrangler.toml

# Look for excessive KV writes in code
grep -r "CACHE.put" workers/
```

**Fix:** See "Recent Issues & Fixes" section below

### Issue: Session Expires Immediately

**Symptoms:** Logged out after every request

**Solutions:**
```bash
# Check SESSION_SECRET exists
wrangler secret list | grep SESSION_SECRET

# Regenerate if needed
openssl rand -hex 32 | wrangler secret put SESSION_SECRET
wrangler deploy

# Verify session max age in wrangler.toml
grep SESSION_MAX_AGE wrangler.toml  # Should be 28800 (8 hours)
```

### Issue: Secrets Not Found

**Symptoms:** "Secret not found" error in logs

**Solutions:**
```bash
# List all secrets
wrangler secret list

# Missing secrets? Set them:
wrangler secret put BITRIX24_WEBHOOK_URL
wrangler secret put SESSION_SECRET
wrangler secret put RESEND_API_KEY
wrangler secret put TURNSTILE_SECRET_KEY

# Deploy after setting secrets
wrangler deploy
```

---

## 🚨 Recent Issues & Fixes

### KV Write Limit Exceeded (FIXED Oct 24, 2025)

**Problem:**
Daily emails: "You have exceeded the daily Cloudflare Workers KV free tier limit of 1000 Workers KV put operations."

**Root Cause:**
Cron job running **every single minute** (1,440 times/day), polling Bitrix24 and writing state to KV for 39 employees:
- Every minute = 1,440 cron executions/day
- 39 employees polled each time
- Total: **56,160 KV writes/day** (56x over 1,000 limit!)

**The Problem Code:**
```toml
# wrangler.toml (OLD - BROKEN)
[triggers]
crons = ["0 13 * * *", "0 14 * * *", "* * * * *"]
                                      ^^^^^^^^^^^
                                      EVERY MINUTE!
```

```typescript
// workers/index.ts checkStageChanges() function
// Ran 1,440 times per day!
for (const item of items) {
  await env.CACHE.put(`item_state:${itemId}`, stateToCache);  // 39 writes per run
}
```

**Solution:**
Removed the every-minute cron trigger:

```toml
# wrangler.toml (FIXED)
[triggers]
crons = ["0 13 * * *", "0 14 * * *"]  # Only daily email reminders
```

**Result:**
- KV writes: 56,000/day → ~0/day ✅
- System back within free tier ($0/month) ✅
- Email reminders still work (daily at 9 AM ET) ✅

**If You Need Stage Automation:**

**Option A: Use Bitrix24 Webhooks (Recommended - Free)**
- Configure Bitrix24 to POST to `https://hartzell.work/api/bitrix/webhook` on stage changes
- Zero polling, zero KV writes, instant detection

**Option B: Reduce Polling Frequency**
- Change to `*/15 * * * *` (every 15 minutes)
- Reduces to ~3,744 writes/day (still 3.7x over limit)
- Requires upgrading to Paid plan

**Option C: Upgrade to Paid Plan**
- $5/month minimum
- Includes 1M writes/month
- Supports every-minute polling

**Deployed:** October 24, 2025 at 2:46 AM UTC
**Version:** `60c2eb9a-5bc0-479f-af98-b1561abece89`

---

## ⚠️ Emergency Procedures

### System Down - Quick Recovery

**1. Check Status:**
```bash
# Backend
curl -I https://hartzell.work/api/health

# Frontend
curl -I https://app.hartzell.work

# View logs
wrangler tail --status error
```

**2. Rollback (if recent deployment broke it):**
```bash
# List recent versions
wrangler deployments list

# Rollback to previous version
wrangler versions deploy [PREVIOUS_VERSION_ID]@100
```

**3. Verify Recovery:**
```bash
curl https://hartzell.work/api/health
# Should return: {"status":"healthy",...}
```

### Lost Access to Secrets

**If secrets are lost, regenerate:**

```bash
# SESSION_SECRET (logs out all users)
openssl rand -hex 32 | wrangler secret put SESSION_SECRET

# BITRIX24_WEBHOOK_URL (regenerate in Bitrix24)
echo "https://hartzell.app/rest/1/NEW_WEBHOOK" | wrangler secret put BITRIX24_WEBHOOK_URL

# RESEND_API_KEY (create new in Resend dashboard)
echo "re_NEW_KEY" | wrangler secret put RESEND_API_KEY

# TURNSTILE_SECRET_KEY (regenerate in Cloudflare Turnstile)
echo "NEW_SECRET" | wrangler secret put TURNSTILE_SECRET_KEY

# Deploy after updating secrets
wrangler deploy
```

### Database Corruption

**Backup first:**
```bash
wrangler d1 export hartzell_hr_prod --output=emergency-backup.sql
```

**Reset database (⚠️ DESTRUCTIVE):**
```bash
# Re-initialize schema
wrangler d1 execute hartzell_hr_prod --file=workers/schema.sql
```

### Rate Limit Lockout

**Clear rate limits for all IPs:**
```bash
wrangler d1 execute hartzell_hr_prod --command="
DELETE FROM login_attempts
"
```

### Nuclear Option - Full Redeploy

```bash
cd "/mnt/c/Users/Agent/Desktop/HR Center"

# Backend
cd cloudflare-app
wrangler deploy

# Frontend
cd ../frontend
rm -rf .next out node_modules/.cache
npm install
npm run build
npx wrangler pages deploy out --project-name=hartzell-hr-frontend --branch=main --commit-dirty=true
```

---

## 📞 Support & Resources

### Documentation

- **Cloudflare Workers:** https://developers.cloudflare.com/workers
- **Cloudflare D1:** https://developers.cloudflare.com/d1
- **Cloudflare KV:** https://developers.cloudflare.com/kv
- **Cloudflare R2:** https://developers.cloudflare.com/r2
- **Cloudflare Pages:** https://developers.cloudflare.com/pages
- **Wrangler CLI:** https://developers.cloudflare.com/workers/wrangler/commands

### Support Channels

- **Community:** https://community.cloudflare.com
- **Discord:** https://discord.cloudflare.com
- **Status Page:** https://www.cloudflarestatus.com
- **Support Tickets:** https://dash.cloudflare.com/support

### Project Documentation (in `/mnt/c/Users/Agent/Desktop/HR Center/`)

- `README.md` - Project overview
- `SPECIFICATION.md` - Technical specification
- `DEPLOYMENT_GUIDE.md` - Detailed deployment guide
- `cloudflare-app/README.md` - Backend architecture
- `frontend/README.md` - Frontend architecture

---

## ✅ First Day Checklist

**Authentication & Access:**
- [ ] Run `wrangler whoami` - verify logged in as agent@botpros.ai
- [ ] Access Cloudflare Dashboard: https://dash.cloudflare.com/b68132a02e46f8cc02bcf9c5745a72b9
- [ ] Verify production URLs are accessible

**Infrastructure Verification:**
- [ ] List deployments: `wrangler deployments list`
- [ ] Check database: `wrangler d1 list | grep hartzell_hr_prod`
- [ ] Check secrets: `wrangler secret list` (should show 5 secrets)
- [ ] View logs: `timeout 60 wrangler tail`

**Test Deployments:**
- [ ] Backend dry-run: `wrangler deploy --dry-run`
- [ ] Backend deploy: `wrangler deploy`
- [ ] Frontend deploy: `npm run deploy` (optional, only if needed)
- [ ] Verify after deploy: `curl https://hartzell.work/api/health`

**Review Recent Changes:**
- [ ] Read "Recent Issues & Fixes" section
- [ ] Understand KV limit fix (Oct 24, 2025)
- [ ] Check current cron triggers in `wrangler.toml`

**Monitor:**
- [ ] Check usage in Dashboard
- [ ] Verify no KV write limit emails
- [ ] Confirm $0/month cost

---

## 🎉 You're Ready!

**Current Status:**
- ✅ System deployed and operational
- ✅ Within free tier ($0/month)
- ✅ All issues resolved (KV limit fixed Oct 24)
- ✅ Ready for new botpros.ai projects

**Production URLs:**
- Frontend: https://app.hartzell.work
- Backend: https://hartzell.work/api/*
- Dashboard: https://dash.cloudflare.com/b68132a02e46f8cc02bcf9c5745a72b9

**Quick Commands:**
```bash
# Navigate to project
cd "/mnt/c/Users/Agent/Desktop/HR Center/cloudflare-app"

# Deploy backend
wrangler deploy

# View logs
wrangler tail

# Deploy frontend
cd ../frontend && npm run deploy

# Check status
curl https://hartzell.work/api/health
```

---

**Last Updated:** October 24, 2025
**Document Version:** 1.0
**Infrastructure Status:** Production Ready ✅

🚀 **Welcome to the team! You now have complete control of the Cloudflare infrastructure.**
