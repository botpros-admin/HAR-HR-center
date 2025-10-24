# 🚀 Cloudflare Infrastructure Takeover Guide

**For:** New AI Agent taking over infrastructure management
**Account:** agent@botpros.ai
**Created:** October 24, 2025
**Purpose:** Complete handoff of Hartzell HR Center Cloudflare infrastructure

---

## 📋 Table of Contents

1. [Account Overview](#account-overview)
2. [Authentication & Access](#authentication--access)
3. [Infrastructure Inventory](#infrastructure-inventory)
4. [Secrets & Credentials](#secrets--credentials)
5. [Deployment Procedures](#deployment-procedures)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Troubleshooting](#troubleshooting)
8. [Creating New Projects](#creating-new-projects)
9. [Cost Management](#cost-management)

---

## 🔐 Account Overview

**Cloudflare Account**
- **Email:** agent@botpros.ai
- **Account ID:** `b68132a02e46f8cc02bcf9c5745a72b9`
- **Account Name:** Agent@botpros.ai's Account
- **Plan:** Free Tier (Workers, Pages, D1, KV, R2)

**Dashboard URL:**
```
https://dash.cloudflare.com/b68132a02e46f8cc02bcf9c5745a72b9
```

**Token Permissions:**
- ✅ Workers (write)
- ✅ Workers KV (write)
- ✅ D1 (write)
- ✅ Pages (write)
- ✅ R2 (write)
- ✅ Zones (read)
- ✅ AI (write)
- ✅ Queues (write)

---

## 🔑 Authentication & Access

### Wrangler CLI Authentication

The Wrangler CLI is already authenticated with an OAuth token.

**Check Current Authentication:**
```bash
wrangler whoami
```

**If You Need to Re-authenticate:**
```bash
# Option 1: OAuth (recommended)
wrangler login

# Option 2: API Token
wrangler login --api-token=YOUR_TOKEN_HERE
```

**Location of Credentials:**
- Windows: `C:\Users\Agent\.wrangler\config\default.toml`
- WSL: `/home/agent/.wrangler/config/default.toml`

---

## 🏗️ Infrastructure Inventory

### 1. Workers (Backend APIs)

#### Production Worker: `hartzell-hr-center-production`
- **Route:** `hartzell.work/api/*`
- **Latest Version:** `60c2eb9a-5bc0-479f-af98-b1561abece89` (Oct 24, 2025)
- **Location:** `/mnt/c/Users/Agent/Desktop/HR Center/cloudflare-app/`
- **Entry Point:** `workers/index.ts`
- **Framework:** Hono (Node.js-compatible)

**Cron Triggers:**
- `0 13 * * *` - Daily at 1 PM UTC (9 AM EDT)
- `0 14 * * *` - Daily at 2 PM UTC (9 AM EST)

**Deploy Command:**
```bash
cd "/mnt/c/Users/Agent/Desktop/HR Center/cloudflare-app"
wrangler deploy
```

---

### 2. D1 Databases (SQLite)

| Database Name | UUID | Size | Purpose |
|--------------|------|------|---------|
| **hartzell_hr_prod** | `9926c3a9-c6e1-428f-8c36-fdb001c326fd` | 942 KB | Production HR data |
| hartzell_hr_staging | `114317f0-6441-4201-8757-b300acd822d8` | 266 KB | Staging environment |
| hartzell_hr_dev | `a193ff69-4192-4124-9e86-e55f29673ba8` | 266 KB | Development |

**Production Binding:** `DB`

**Tables in Production (7):**
1. `sessions` - User sessions
2. `login_attempts` - Rate limiting
3. `admin_users` - Admin auth
4. `employee_cache` - Cached employee data
5. `document_templates` - PDF templates
6. `document_assignments` - Document assignments
7. `onboarding_tokens` - Magic link tokens

**Query Examples:**
```bash
# List all tables
wrangler d1 execute hartzell_hr_prod --command="SELECT name FROM sqlite_master WHERE type='table'"

# Count active sessions
wrangler d1 execute hartzell_hr_prod --command="SELECT COUNT(*) FROM sessions WHERE expires_at > CAST(strftime('%s', 'now') * 1000 AS INTEGER)"

# Export database
wrangler d1 export hartzell_hr_prod --output=backup.sql
```

---

### 3. KV Namespaces (Key-Value Store)

| Namespace | ID | Purpose |
|-----------|-----|---------|
| **production-CACHE** | `54f7714316b14265a8224c255d9a7f80` | Production cache |
| CACHE | `ae6971a1e8f746d4a39687a325f5dd2b` | Legacy cache |
| staging-CACHE | `540544d672e443d597b93065e6f48c93` | Staging cache |
| development-CACHE | `8e0ddf46ecc8455d809613e5f00b1192` | Dev cache |

**Production Binding:** `CACHE`

**Operations:**
```bash
# List keys
wrangler kv key list --namespace-id=54f7714316b14265a8224c255d9a7f80

# Get key
wrangler kv key get "employee:badge:EMP1001" --namespace-id=54f7714316b14265a8224c255d9a7f80

# Put key
wrangler kv key put "test:key" "value" --namespace-id=54f7714316b14265a8224c255d9a7f80

# Delete key
wrangler kv key delete "test:key" --namespace-id=54f7714316b14265a8224c255d9a7f80

# Bulk delete all keys (use with caution!)
wrangler kv key list --namespace-id=54f7714316b14265a8224c255d9a7f80 | \
  jq -r '.[].name' | \
  xargs -I {} wrangler kv key delete "{}" --namespace-id=54f7714316b14265a8224c255d9a7f80
```

---

### 4. R2 Buckets (Object Storage)

| Bucket Name | Purpose |
|------------|---------|
| **hartzell-assets-prod** | Production static assets (logo, images) |
| **hartzell-hr-templates-prod** | Production PDF templates |
| hartzell-assets-staging | Staging assets |
| hartzell-hr-templates-staging | Staging templates |
| hartzell-assets-dev | Dev assets |
| hartzell-hr-templates-dev | Dev templates |

**Production Bindings:**
- `ASSETS` → `hartzell-assets-prod`
- `DOCUMENTS` → `hartzell-hr-templates-prod`

**Operations:**
```bash
# List objects
wrangler r2 object list hartzell-assets-prod

# Upload object
wrangler r2 object put hartzell-assets-prod/logo.png --file=logo.png

# Download object
wrangler r2 object get hartzell-assets-prod/logo.png --file=downloaded-logo.png

# Delete object
wrangler r2 object delete hartzell-assets-prod/logo.png
```

---

### 5. Pages (Frontend Hosting)

#### Project: `hartzell-hr-frontend`

**Custom Domains:**
- `app.hartzell.work` (production)
- `hartzell-hr-frontend.pages.dev` (Cloudflare subdomain)

**Configuration:**
- **Framework:** Next.js 14 (Static Export)
- **Build Command:** `npm run build`
- **Output Directory:** `out/`
- **Production Branch:** `main` (⚠️ ONLY branch serving custom domain)

**Environment Variables (Set in Pages Dashboard):**
- `NEXT_PUBLIC_API_URL` = `https://hartzell.work/api`
- `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` = (hCaptcha site key)

**Deploy Command:**
```bash
cd "/mnt/c/Users/Agent/Desktop/HR Center/frontend"
npm run deploy
```

**⚠️ CRITICAL:** Always use `npm run deploy`, never manual `wrangler pages deploy` commands. The script ensures deployment to the `main` branch.

---

## 🔐 Secrets & Credentials

### Worker Secrets (Set via `wrangler secret put`)

| Secret Name | Purpose | How to Update |
|------------|---------|---------------|
| **BITRIX24_WEBHOOK_URL** | Bitrix24 REST API webhook | `wrangler secret put BITRIX24_WEBHOOK_URL` |
| **BITRIX_WEBHOOK_URL** | Duplicate/legacy (same as above) | `wrangler secret put BITRIX_WEBHOOK_URL` |
| **SESSION_SECRET** | Session encryption (32-byte hex) | `openssl rand -hex 32 \| wrangler secret put SESSION_SECRET` |
| **RESEND_API_KEY** | Email service (Resend.com) | `wrangler secret put RESEND_API_KEY` |
| **TURNSTILE_SECRET_KEY** | Cloudflare Turnstile CAPTCHA | `wrangler secret put TURNSTILE_SECRET_KEY` |

**List Secrets:**
```bash
cd "/mnt/c/Users/Agent/Desktop/HR Center/cloudflare-app"
wrangler secret list
```

**Update a Secret:**
```bash
wrangler secret put SECRET_NAME
# Paste value when prompted (input is hidden)
```

**Delete a Secret:**
```bash
wrangler secret delete SECRET_NAME
```

### Current Secret Values (Reference)

**⚠️ SECURITY NOTE:** These are production secrets. Store securely.

```bash
# BITRIX24_WEBHOOK_URL (both variants should be the same)
https://hartzell.app/rest/1/jp689g5yfvre9pvd

# SESSION_SECRET
# Generate new: openssl rand -hex 32
# Current: [32-byte hex string - not exposed here]

# RESEND_API_KEY
# Get from: https://resend.com/api-keys
# Current: re_XXXXXX... [not exposed here]

# TURNSTILE_SECRET_KEY
# Get from: https://dash.cloudflare.com/?to=/:account/turnstile
# Current: [secret key - not exposed here]
```

---

## 🚀 Deployment Procedures

### Backend Deployment (Worker)

```bash
cd "/mnt/c/Users/Agent/Desktop/HR Center/cloudflare-app"

# Deploy to production
wrangler deploy

# View recent deployments
wrangler deployments list

# View live logs
wrangler tail

# View logs with filtering
wrangler tail --status error
wrangler tail --method POST
timeout 60 wrangler tail  # Tail for 60 seconds
```

### Frontend Deployment (Pages)

```bash
cd "/mnt/c/Users/Agent/Desktop/HR Center/frontend"

# ALWAYS use this command (includes cache cleaning and verification)
npm run deploy

# Manual alternative (if deploy script fails)
npm run deploy:quick
```

**What `npm run deploy` Does:**
1. Cleans `.next`, `out`, and `node_modules/.cache`
2. Runs `npm run build`
3. Verifies responsive design classes in output
4. Deploys to `main` branch (required for custom domain)
5. Commits dirty files if needed

### Database Migrations

```bash
cd "/mnt/c/Users/Agent/Desktop/HR Center/cloudflare-app"

# Execute SQL file
wrangler d1 execute hartzell_hr_prod --file=migrations/001_add_column.sql

# Execute single command
wrangler d1 execute hartzell_hr_prod --command="ALTER TABLE users ADD COLUMN new_field TEXT"
```

---

## 📊 Monitoring & Maintenance

### View Worker Logs

```bash
cd "/mnt/c/Users/Agent/Desktop/HR Center/cloudflare-app"

# Live tail (all requests)
wrangler tail

# Pretty format
wrangler tail --format pretty

# Filter by status
wrangler tail --status error

# Filter by method
wrangler tail --method POST

# Limited duration
timeout 60 wrangler tail
```

### Check Resource Usage

**Via Cloudflare Dashboard:**
1. Go to https://dash.cloudflare.com/b68132a02e46f8cc02bcf9c5745a72b9
2. Click "Workers & Pages"
3. View analytics for each Worker/Pages project
4. Check KV, D1, R2 usage under respective sections

**Current Usage (as of Oct 24, 2025):**
- Workers Requests: ~500/day (0.5% of 100K free limit)
- D1 Storage: ~1 MB (0.02% of 5GB limit)
- KV Reads: ~100/day (0.1% of 100K limit)
- KV Writes: ~0/day (0% of 1K limit) ✅ **Fixed!**
- R2 Storage: ~5 MB (0.05% of 10GB limit)

### Database Maintenance

```bash
# Clean up expired sessions
wrangler d1 execute hartzell_hr_prod --command="
DELETE FROM sessions WHERE expires_at < CAST(strftime('%s', 'now') * 1000 AS INTEGER)
"

# Clear rate limiting history
wrangler d1 execute hartzell_hr_prod --command="DELETE FROM login_attempts"

# View employee cache stats
wrangler d1 execute hartzell_hr_prod --command="
SELECT COUNT(*) as total, COUNT(DISTINCT department) as departments
FROM employee_cache
"
```

---

## 🔧 Troubleshooting

### Issue: Worker Not Responding

**Symptoms:** API returns 500 errors or timeouts

**Solutions:**
1. Check recent deployments: `wrangler deployments list`
2. View error logs: `wrangler tail --status error`
3. Rollback if needed: `wrangler versions deploy [VERSION_ID]@100`

### Issue: Frontend Can't Reach Backend

**Symptoms:** "Failed to fetch" in browser console

**Solutions:**
1. Verify backend is running: `curl -I https://hartzell.work/api/health`
2. Check CORS settings in `workers/index.ts` (lines 27-53)
3. Verify frontend environment variable: `NEXT_PUBLIC_API_URL=https://hartzell.work/api`

### Issue: Database Errors

**Symptoms:** "Database error" in logs

**Solutions:**
1. Check database exists: `wrangler d1 list | grep hartzell_hr_prod`
2. Verify tables: `wrangler d1 execute hartzell_hr_prod --command="SELECT name FROM sqlite_master WHERE type='table'"`
3. Check binding in `wrangler.toml`: `binding = "DB"`

### Issue: KV Write Limit Exceeded

**Symptoms:** Daily emails about KV write limit

**Root Cause:** Excessive KV writes (usually from cron jobs)

**Solution:**
1. Check cron configuration in `wrangler.toml`
2. Ensure no `* * * * *` (every minute) cron triggers
3. Review KV write operations in code
4. Consider upgrading to Paid plan ($5/month for 1M writes)

**Reference:** See `KV_LIMIT_FIX.md` for detailed fix applied on Oct 24, 2025

---

## 🆕 Creating New Projects

### For botpros.ai Domain Projects

**Recommended Structure:**

```
/mnt/c/Users/Agent/Desktop/
├── HR Center/              (Existing - hartzell.work)
└── BotPros Projects/
    ├── project-name-1/
    │   ├── backend/        (Cloudflare Worker)
    │   └── frontend/       (Cloudflare Pages)
    └── project-name-2/
```

### Create New Worker

```bash
# Create new project
mkdir -p "/mnt/c/Users/Agent/Desktop/BotPros Projects/my-app/backend"
cd "/mnt/c/Users/Agent/Desktop/BotPros Projects/my-app/backend"

# Initialize Worker
npm create cloudflare@latest

# Follow prompts:
# - Name: my-app-backend
# - Template: "Hello World" Worker
# - TypeScript: Yes
# - Git: Yes
# - Deploy: No (deploy manually after configuration)
```

**Configure `wrangler.toml`:**
```toml
name = "my-app-backend"
main = "src/index.ts"
compatibility_date = "2025-10-24"

account_id = "b68132a02e46f8cc02bcf9c5745a72b9"

# Custom domain route
routes = [
  { pattern = "api.botpros.ai/my-app/*", zone_name = "botpros.ai" }
]
```

**Deploy:**
```bash
wrangler deploy
```

### Create New Pages Project

```bash
# Create Next.js app
cd "/mnt/c/Users/Agent/Desktop/BotPros Projects/my-app"
npx create-next-app@latest frontend

# Build for static export
# Edit next.config.js:
module.exports = {
  output: 'export',
  trailingSlash: true,
}

# Deploy to Pages
cd frontend
npm run build
npx wrangler pages deploy out --project-name=my-app-frontend --branch=main
```

**Set up Custom Domain:**
1. Go to Cloudflare Dashboard → Pages → my-app-frontend
2. Settings → Custom domains → Add domain
3. Enter: `my-app.botpros.ai`
4. Add CNAME record in DNS (Cloudflare auto-creates if managing DNS)

### Create New D1 Database

```bash
# Create database
wrangler d1 create my-app-db

# Copy the database ID from output
# Add to wrangler.toml:
[[d1_databases]]
binding = "DB"
database_name = "my-app-db"
database_id = "UUID_FROM_ABOVE"

# Initialize schema
wrangler d1 execute my-app-db --file=schema.sql
```

### Create New KV Namespace

```bash
# Create namespace
wrangler kv namespace create "CACHE"

# Copy the ID from output
# Add to wrangler.toml:
[[kv_namespaces]]
binding = "CACHE"
id = "ID_FROM_ABOVE"
```

### Create New R2 Bucket

```bash
# Create bucket
wrangler r2 bucket create my-app-storage

# Add to wrangler.toml:
[[r2_buckets]]
binding = "STORAGE"
bucket_name = "my-app-storage"
```

---

## 💰 Cost Management

### Current Monthly Cost: $0

**Free Tier Limits:**
- **Workers:** 100,000 requests/day
- **D1:** 5GB storage, 5M reads/day, 100K writes/day
- **KV:** 100K reads/day, 1K writes/day, 1GB storage
- **R2:** 10GB storage, 1M Class A ops/month
- **Pages:** 500 builds/month, unlimited requests

### When to Upgrade

**Workers Paid ($5/month minimum):**
- Need > 100K requests/day
- Need > 10ms CPU time per request
- Need > 128MB memory

**KV Paid ($5/month minimum):**
- Need > 1K writes/day
- Need > 100K reads/day
- Need > 1GB storage

**D1 Paid (Coming soon):**
- Need > 5GB storage
- Need > 5M reads/day

**R2 Paid (Usage-based):**
- $0.015/GB storage/month beyond 10GB
- Class A operations: $4.50 per million beyond 1M

### Monitoring Costs

**Check Usage:**
1. Dashboard: https://dash.cloudflare.com/b68132a02e46f8cc02bcf9c5745a72b9
2. Click "Analytics & Logs" for each service
3. View usage graphs and alerts

**Set Up Alerts:**
1. Dashboard → Notifications
2. Create alerts for:
   - KV writes approaching limit
   - Worker requests approaching limit
   - D1 storage approaching limit

---

## 📚 Additional Resources

### Documentation
- **Cloudflare Workers:** https://developers.cloudflare.com/workers
- **Cloudflare D1:** https://developers.cloudflare.com/d1
- **Cloudflare KV:** https://developers.cloudflare.com/kv
- **Cloudflare R2:** https://developers.cloudflare.com/r2
- **Cloudflare Pages:** https://developers.cloudflare.com/pages
- **Wrangler CLI:** https://developers.cloudflare.com/workers/wrangler/commands

### Support
- **Cloudflare Community:** https://community.cloudflare.com
- **Discord:** https://discord.cloudflare.com
- **Status Page:** https://www.cloudflarestatus.com

---

## ✅ Takeover Checklist

**Before You Start:**
- [ ] Read this entire document
- [ ] Verify `wrangler whoami` shows correct account
- [ ] Test deploying to staging first (if available)
- [ ] Have access to Cloudflare Dashboard

**Initial Setup:**
- [ ] Clone HR Center repository to your working directory
- [ ] Run `npm install` in both `cloudflare-app/` and `frontend/`
- [ ] Verify you can deploy: `wrangler deploy --dry-run`

**Test Deployments:**
- [ ] Deploy backend: `cd cloudflare-app && wrangler deploy`
- [ ] Deploy frontend: `cd frontend && npm run deploy`
- [ ] Verify production URLs are accessible
- [ ] Check logs: `wrangler tail`

**Verify Secrets:**
- [ ] List secrets: `wrangler secret list`
- [ ] Confirm all 5 secrets are present
- [ ] DO NOT delete secrets unless replacing them

**Monitor:**
- [ ] Check usage in Cloudflare Dashboard
- [ ] Verify no KV write limit emails (should be fixed)
- [ ] Review cron job execution (daily at 9 AM ET)

**Create New Project (if needed):**
- [ ] Follow "Creating New Projects" section
- [ ] Use separate directory for botpros.ai projects
- [ ] Configure custom domain routing
- [ ] Test deployment before going live

---

## 🚨 Emergency Contacts

**Cloudflare Support:**
- Email: support@cloudflare.com
- Dashboard: https://dash.cloudflare.com/support

**Account Owner:**
- Email: agent@botpros.ai

---

## 📝 Recent Changes

**October 24, 2025:**
- ✅ Fixed KV write limit issue (removed every-minute cron)
- ✅ Reduced cron triggers from 3 to 2 (daily email reminders only)
- ✅ Deployed version: `60c2eb9a-5bc0-479f-af98-b1561abece89`
- ✅ System back within free tier ($0/month)

**For detailed history, see:**
- `KV_LIMIT_FIX.md` - KV write limit fix
- `DEPLOYMENT_GUIDE.md` - Complete deployment guide
- `README.md` - Project overview

---

**End of Takeover Guide**

You now have complete control of the Cloudflare infrastructure. Good luck! 🚀
