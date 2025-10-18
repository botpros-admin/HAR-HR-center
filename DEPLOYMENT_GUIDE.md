# 🚀 Hartzell HR Center - Deployment Guide

**Last Updated:** October 12, 2025
**Status:** ✅ DEPLOYED AND OPERATIONAL

---

## 📋 Table of Contents

1. [Current Deployment Status](#current-deployment-status)
2. [Production URLs](#production-urls)
3. [Infrastructure Overview](#infrastructure-overview)
4. [Deployment Procedures](#deployment-procedures)
5. [Testing Your Deployment](#testing-your-deployment)
6. [Common Operations](#common-operations)
7. [Troubleshooting](#troubleshooting)

---

## ✅ Current Deployment Status

### What's Deployed

**Backend (Cloudflare Workers)** ✅
- Worker: `hartzell-hr-center-production`
- Routes: `hartzell.work/api/*`
- Current Version: `e702eb84-6e35-498f-899b-4961d876fda9`
- Deployed: October 12, 2025

**Frontend (Cloudflare Pages)** ✅
- Project: `hartzell-hr-frontend`
- Custom Domain: `app.hartzell.work`
- Latest Deployment: `ba780ac1.hartzell-hr-frontend.pages.dev`
- Deployed: October 11, 2025

**Database (D1)** ✅
- Database: `hartzell_hr_prod`
- ID: `9926c3a9-c6e1-428f-8c36-fdb001c326fd`
- Tables: 7
- Status: Active

**Cache (KV)** ✅
- Namespace: Production Cache
- ID: `54f7714316b14265a8224c255d9a7f80`
- Usage: Employee data caching (24hr TTL)

**Storage (R2)** ✅
- Assets Bucket: `hartzell-assets-prod`
- Templates Bucket: `hartzell-hr-templates-prod`

**Integrations** ✅
- Bitrix24: REST API via webhook (entity type 1054)
- hCaptcha: Tier 3 authentication

---

## 🌐 Production URLs

### Employee Portal (Frontend)
- **Custom Domain:** https://app.hartzell.work ✅
- **Pages URL:** https://ba780ac1.hartzell-hr-frontend.pages.dev

### Backend API
- **Production:** https://hartzell.work/api/* ✅
- **Worker URL:** hartzell-hr-center-production.agent-b68.workers.dev

### Management Dashboards
- **Cloudflare Account:** https://dash.cloudflare.com/b68132a02e46f8cc02bcf9c5745a72b9
- **Workers:** https://dash.cloudflare.com/b68132a02e46f8cc02bcf9c5745a72b9/workers
- **Pages:** https://dash.cloudflare.com/b68132a02e46f8cc02bcf9c5745a72b9/pages
- **D1 Database:** https://dash.cloudflare.com/b68132a02e46f8cc02bcf9c5745a72b9/d1
- **KV Storage:** https://dash.cloudflare.com/b68132a02e46f8cc02bcf9c5745a72b9/kv
- **R2 Storage:** https://dash.cloudflare.com/b68132a02e46f8cc02bcf9c5745a72b9/r2

---

## 🏗️ Infrastructure Overview

### Cloudflare Account
**Account ID:** b68132a02e46f8cc02bcf9c5745a72b9

### Backend Configuration (Worker)

**Secrets (Set via `wrangler secret put`):**
- `BITRIX24_WEBHOOK_URL` - Bitrix24 REST API webhook
- `SESSION_SECRET` - 32-byte hex string for session encryption
- `HCAPTCHA_SECRET` - hCaptcha secret key

**Environment Variables (wrangler.toml):**
```toml
[vars]
BITRIX24_ENTITY_TYPE_ID = "1054"
SESSION_MAX_AGE = "28800"          # 8 hours
RATE_LIMIT_MAX_ATTEMPTS = "5"
RATE_LIMIT_WINDOW = "900"          # 15 minutes
```

**Database Tables (D1):**
1. `sessions` - User session management
2. `login_attempts` - Rate limiting
3. `admin_users` - Admin authentication
4. `employee_cache` - Bitrix24 data cache
5. `signature_requests` - Placeholder for future
6. `templates` - PDF templates
7. `assignments` - Document assignments

### Frontend Configuration (Pages)

**Environment Variables:**
- `NEXT_PUBLIC_API_URL` = `https://hartzell.work/api`
- `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` = (hCaptcha site key)

**Build Settings:**
- Framework: Next.js 14 (Static Export)
- Build Command: `npm run build`
- Output Directory: `out/`

---

## 🚀 Deployment Procedures

### Backend Deployment (Worker)

**Prerequisites:**
- Wrangler CLI installed (`npm install -g wrangler`)
- Authenticated to Cloudflare (`wrangler login`)
- Located in `/cloudflare-app` directory

**Deploy Command:**
```bash
cd /mnt/c/Users/Agent/Desktop/HR\ Center/cloudflare-app
wrangler deploy
```

**What Happens:**
1. TypeScript compiled to JavaScript
2. Dependencies bundled
3. Uploaded to Cloudflare Workers
4. Routes updated: `hartzell.work/api/*`
5. New version ID returned

**Verify Deployment:**
```bash
# List recent deployments
wrangler deployments list

# Test API endpoint
curl -I https://hartzell.work/api/auth/session
```

**Expected Output:**
```
HTTP/2 401 (or 200 if you have a valid session)
```

### Frontend Deployment (Pages) - MANDATORY METHOD

**⚠️ CRITICAL: ONLY USE THIS DEPLOYMENT METHOD ⚠️**

**DO NOT:**
- ❌ Use `wrangler pages deploy` directly
- ❌ Deploy to any branch other than `main`
- ❌ Skip the deploy script

**Prerequisites:**
- Located in `/frontend` directory
- Node.js 20+ installed
- `npm install` completed

**ONLY CORRECT DEPLOYMENT COMMAND:**
```bash
cd /mnt/c/Users/Agent/Desktop/HR\ Center/frontend
npm run deploy
```

**Why This Is The ONLY Method:**
- ✅ Deploys to `main` branch (the ONLY branch that serves app.hartzell.work)
- ✅ Cleans all caches automatically (prevents stale builds)
- ✅ Single command deployment
- ✅ Always deploys fresh build
- ✅ Consistent process every time

**What Happens Automatically:**
1. Cleans all build caches (`.next`, `out`, `node_modules/.cache`)
2. Builds Next.js static export to `./out` directory
3. Deploys to Cloudflare Pages (`hartzell-hr-frontend` project)
4. Updates custom domain `app.hartzell.work` automatically

**Verify Deployment:**
```bash
# List recent deployments
npx wrangler pages deployment list --project-name=hartzell-hr-frontend

# Test frontend
curl -I https://app.hartzell.work/
```

**Expected Output:**
```
HTTP/2 200
```

### Database Migrations (D1)

**Initial Setup (Already Completed):**
```bash
# Create database
wrangler d1 create hartzell_hr_prod

# Initialize schema
wrangler d1 execute hartzell_hr_prod --file=workers/schema.sql
```

**Adding New Tables/Columns:**
```bash
# Option 1: Direct SQL command
wrangler d1 execute hartzell_hr_prod --command="ALTER TABLE tablename ADD COLUMN columnname TEXT"

# Option 2: SQL file
wrangler d1 execute hartzell_hr_prod --file=path/to/migration.sql
```

### Secrets Management

**List Current Secrets:**
```bash
cd cloudflare-app
wrangler secret list
```

**Update a Secret:**
```bash
wrangler secret put SECRET_NAME
# Paste secret value when prompted
```

**Generate and Set Session Secret:**
```bash
openssl rand -hex 32 | wrangler secret put SESSION_SECRET
```

**Update Bitrix24 Webhook:**
```bash
wrangler secret put BITRIX24_WEBHOOK_URL
# Paste: https://hartzell.app/rest/1/jp689g5yfvre9pvd
```

**Update hCaptcha Secret:**
```bash
wrangler secret put HCAPTCHA_SECRET
# Paste your hCaptcha secret key
```

---

## 🧪 Testing Your Deployment

### 1. Test Frontend Availability

```bash
# Test landing page
curl -I https://app.hartzell.work/

# Test login page
curl -I https://app.hartzell.work/login/

# Test admin page (should redirect if not authenticated)
curl -I https://app.hartzell.work/admin/
```

**Expected:** All return `HTTP/2 200`

### 2. Test Backend API

```bash
# Test session endpoint (should return 401 without auth)
curl -I https://hartzell.work/api/auth/session

# Test login endpoint
curl -X POST https://hartzell.work/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "badgeNumber": "EMP1001",
    "dateOfBirth": "1990-01-15"
  }'
```

**Expected:**
- Session endpoint: `HTTP/2 401` or `HTTP/2 200` (if authenticated)
- Login endpoint: JSON response with success/error

### 3. Test Database Connectivity

```bash
cd cloudflare-app

# List all tables
wrangler d1 execute hartzell_hr_prod --command="SELECT name FROM sqlite_master WHERE type='table'"

# Count sessions
wrangler d1 execute hartzell_hr_prod --command="SELECT COUNT(*) FROM sessions"

# Check employee cache
wrangler d1 execute hartzell_hr_prod --command="SELECT COUNT(*) FROM employee_cache"
```

### 4. Test Bitrix24 Integration

```bash
# Test direct Bitrix24 API call (replace with actual webhook URL)
curl "https://hartzell.app/rest/1/YOUR_WEBHOOK/crm.item.list?entityTypeId=1054" | jq
```

**Expected:** JSON response with employee list

### 5. End-to-End Testing

1. **Login Flow:**
   - Visit https://app.hartzell.work/login
   - Enter Badge Number: EMP1001
   - Enter Date of Birth: 01/15/1990
   - Should proceed to ID verification
   - Enter last 4 of SSN + solve CAPTCHA
   - Should redirect to dashboard

2. **Employee Dashboard:**
   - View profile information
   - Check for pending tasks/documents
   - Verify data loads correctly

3. **Admin Login:**
   - Visit https://app.hartzell.work/admin
   - Enter admin credentials (set in D1)
   - View employee directory
   - Edit employee details
   - Upload template

4. **Rate Limiting:**
   - Attempt login with wrong password 5+ times
   - Should see "Too many attempts" error
   - CAPTCHA should be required

---

## 🔧 Common Operations

### View Worker Logs

```bash
cd cloudflare-app

# Live tail (all requests)
wrangler tail

# Filter by status
wrangler tail --status error

# Filter by method
wrangler tail --method POST

# Pretty format
wrangler tail --format pretty

# Specific duration (e.g., 60 seconds)
timeout 60 wrangler tail
```

### Database Queries

```bash
# Count active sessions
wrangler d1 execute hartzell_hr_prod --command="
SELECT COUNT(*) as active_sessions
FROM sessions
WHERE expires_at > CAST(strftime('%s', 'now') * 1000 AS INTEGER)
"

# Recent login attempts
wrangler d1 execute hartzell_hr_prod --command="
SELECT ip_address, attempt_time, success
FROM login_attempts
ORDER BY attempt_time DESC
LIMIT 20
"

# Employee cache stats
wrangler d1 execute hartzell_hr_prod --command="
SELECT
  COUNT(*) as total_employees,
  COUNT(DISTINCT department) as departments,
  MAX(last_sync) as last_sync
FROM employee_cache
"

# Clean up expired sessions
wrangler d1 execute hartzell_hr_prod --command="
DELETE FROM sessions
WHERE expires_at < CAST(strftime('%s', 'now') * 1000 AS INTEGER)
"
```

### KV Cache Operations

```bash
# List all keys
wrangler kv key list --namespace-id=54f7714316b14265a8224c255d9a7f80

# Get specific employee from cache
wrangler kv key get "employee:badge:EMP1001" --namespace-id=54f7714316b14265a8224c255d9a7f80

# Delete cache entry
wrangler kv key delete "employee:badge:EMP1001" --namespace-id=54f7714316b14265a8224c255d9a7f80

# Bulk delete all keys (for testing)
wrangler kv key list --namespace-id=54f7714316b14265a8224c255d9a7f80 | \
  jq -r '.[].name' | \
  xargs -I {} wrangler kv key delete "{}" --namespace-id=54f7714316b14265a8224c255d9a7f80
```

### R2 Storage Operations

```bash
# List objects in templates bucket
wrangler r2 object list hartzell-hr-templates-prod

# Download a template
wrangler r2 object get hartzell-hr-templates-prod/templates/UUID.pdf --file=downloaded.pdf

# Upload a template
wrangler r2 object put hartzell-hr-templates-prod/templates/UUID.pdf --file=template.pdf

# Delete a template
wrangler r2 object delete hartzell-hr-templates-prod/templates/UUID.pdf
```

### Rollback Procedures

**Rollback Backend (Worker):**
```bash
# List recent deployments
wrangler deployments list

# Deploy specific version
wrangler versions deploy [VERSION_ID]@[PERCENTAGE]
# Example: wrangler versions deploy 6f20064e@100
```

**Rollback Frontend (Pages):**
```bash
# List deployments
wrangler pages deployment list --project-name=hartzell-hr-frontend

# Redeploy specific commit
git checkout [COMMIT_HASH]
cd frontend
npm run deploy
git checkout main
```

---

## 🐛 Troubleshooting

### Issue: Frontend Can't Reach Backend

**Symptoms:**
- "Failed to fetch" errors in browser console
- Network timeout errors
- CORS errors

**Solutions:**

1. **Verify backend is running:**
   ```bash
   curl -I https://hartzell.work/api/auth/session
   ```
   Expected: `HTTP/2 401` or `HTTP/2 200`

2. **Check frontend API URL:**
   - Visit Pages project in Cloudflare Dashboard
   - Settings → Environment variables
   - Verify `NEXT_PUBLIC_API_URL` = `https://hartzell.work/api`

3. **Rebuild frontend if needed:**
   ```bash
   cd frontend
   npm run deploy
   ```

### Issue: "Too Many Attempts" / Rate Limited

**Symptoms:**
- Can't login after 5 failed attempts
- "Too many attempts" error message

**Solutions:**

1. **Clear rate limits for specific IP:**
   ```bash
   wrangler d1 execute hartzell_hr_prod --command="
   DELETE FROM login_attempts WHERE ip_address='123.456.789.0'
   "
   ```

2. **Clear all rate limits (testing only):**
   ```bash
   wrangler d1 execute hartzell_hr_prod --command="DELETE FROM login_attempts"
   ```

### Issue: Session Expires Immediately

**Symptoms:**
- Logged out after every request
- "Session expired" immediately after login

**Solutions:**

1. **Check session secret:**
   ```bash
   wrangler secret list | grep SESSION_SECRET
   ```

2. **Regenerate session secret:**
   ```bash
   openssl rand -hex 32 | wrangler secret put SESSION_SECRET
   wrangler deploy
   ```

3. **Verify session expiry time:**
   - Check `wrangler.toml` → `SESSION_MAX_AGE = "28800"` (8 hours)

### Issue: Employee Not Found

**Symptoms:**
- "Invalid credentials" for valid employee
- Badge number not recognized

**Solutions:**

1. **Test Bitrix24 API directly:**
   ```bash
   curl "https://hartzell.app/rest/1/jp689g5yfvre9pvd/crm.item.list?entityTypeId=1054&filter\[ufCrm6BadgeNumber\]=EMP1001" | jq
   ```

2. **Check webhook URL secret:**
   ```bash
   wrangler secret list | grep BITRIX24
   ```

3. **Refresh employee cache:**
   - Login as admin at https://app.hartzell.work/admin
   - Click "Refresh Employees" button

### Issue: CAPTCHA Not Working

**Symptoms:**
- CAPTCHA doesn't load
- "Invalid CAPTCHA" error

**Solutions:**

1. **Verify hCaptcha site key (frontend):**
   - Pages Dashboard → hartzell-hr-frontend → Settings → Environment variables
   - Check `NEXT_PUBLIC_HCAPTCHA_SITE_KEY`

2. **Verify hCaptcha secret (backend):**
   ```bash
   wrangler secret list | grep HCAPTCHA
   ```

3. **Test hCaptcha directly:**
   - Visit https://www.hcaptcha.com/
   - Verify site/secret keys are valid

### Issue: Database Queries Failing

**Symptoms:**
- "Database error" in logs
- Empty responses from API

**Solutions:**

1. **Verify database exists:**
   ```bash
   wrangler d1 list | grep hartzell_hr_prod
   ```

2. **Check table schema:**
   ```bash
   wrangler d1 execute hartzell_hr_prod --command="SELECT sql FROM sqlite_master WHERE type='table'"
   ```

3. **Reset database (⚠️ DESTRUCTIVE):**
   ```bash
   # Backup first
   wrangler d1 export hartzell_hr_prod --output=backup.sql

   # Reset
   wrangler d1 execute hartzell_hr_prod --file=workers/schema.sql
   ```

---

## 📊 Deployment Statistics

### Resource Usage (39 Employees)

| Resource | Daily Usage | Monthly Limit (Free Tier) | Status |
|----------|-------------|---------------------------|--------|
| Worker Requests | ~500 | 100,000 | ✅ 0.5% used |
| D1 Reads | ~2,000 | 5,000,000 | ✅ 0.04% used |
| D1 Writes | ~100 | 100,000 | ✅ 0.1% used |
| D1 Storage | ~10 MB | 5 GB | ✅ 0.2% used |
| KV Reads | ~1,000 | 100,000 | ✅ 1% used |
| KV Writes | ~50 | 1,000 | ✅ 5% used |
| Pages Builds | 2-5 | 500 | ✅ <1% used |

**Monthly Cost:** $0 (within free tier)

### Code Statistics

| Metric | Value |
|--------|-------|
| Backend (TypeScript) | ~1,200 lines |
| Frontend (TypeScript/TSX) | ~2,500 lines |
| Total Files | ~70 |
| API Endpoints | 25+ |
| Frontend Pages | 15+ |
| Database Tables | 7 |

---

## 🎯 Pre-Launch Checklist

Before announcing to employees:

- [x] Backend deployed to production
- [x] Frontend deployed with custom domain
- [x] Database initialized with schema
- [x] All secrets configured
- [x] Bitrix24 integration tested
- [x] Authentication flow tested (3-tier)
- [x] Rate limiting tested
- [x] Admin dashboard functional
- [x] Employee portal functional
- [ ] Train HR staff on admin interface
- [ ] Test with small group of employees
- [ ] Prepare announcement email
- [ ] Set up monitoring alerts (optional)

---

## 📞 Support Resources

**Documentation:**
- `README.md` - System overview
- `SPECIFICATION.md` - Complete technical specification
- `cloudflare-app/README.md` - Backend architecture
- `frontend/README.md` - Frontend architecture

**External Resources:**
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/commands/)
- [Hono Framework Docs](https://hono.dev/)
- [Next.js Docs](https://nextjs.org/docs)

**Monitoring:**
- Worker Logs: `wrangler tail`
- Cloudflare Dashboard: https://dash.cloudflare.com/b68132a02e46f8cc02bcf9c5745a72b9

---

## 🎉 Deployment Complete!

**The Hartzell HR Center is DEPLOYED and OPERATIONAL!**

- ✅ Backend API: https://hartzell.work/api/*
- ✅ Employee Portal: https://app.hartzell.work
- ✅ Admin Dashboard: https://app.hartzell.work/admin
- ✅ Monthly Cost: $0 (Cloudflare free tier)
- ✅ 39 employees ready to use the system

**Status:** 🚀 **PRODUCTION**

---

*Last Updated: October 12, 2025*
*Deployment Version: 1.0.0*
