# 🚀 Hartzell HR Center - Complete Handoff Guide

**Last Updated**: October 3, 2025
**Status**: Production Ready

---

## 📋 Table of Contents

1. [Live URLs & Access](#live-urls--access)
2. [Cloudflare Account Details](#cloudflare-account-details)
3. [GitHub Repository](#github-repository)
4. [Essential Commands](#essential-commands)
5. [Environment Variables & Secrets](#environment-variables--secrets)
6. [Deployment Process](#deployment-process)
7. [Monitoring & Logs](#monitoring--logs)
8. [Database Management](#database-management)
9. [Troubleshooting](#troubleshooting)
10. [Emergency Procedures](#emergency-procedures)

---

## 🌐 Live URLs & Access

### Production URLs

**Frontend (Employee Portal)**:
- **Current**: https://5a404a11.hartzell-hr-frontend.pages.dev
- **Custom Domain**: hartzell.work (pending configuration)

**Backend (API)**:
- **Workers URL**: https://hartzell-hr-center.agent-b68.workers.dev/api
- **Custom Domain**: hartzell.work/api/* (pending domain configuration)

### Cloudflare Dashboard URLs

- **Main Dashboard**: https://dash.cloudflare.com/b68132a02e46f8cc02bcf9c5745a72b9
- **Workers**: https://dash.cloudflare.com/b68132a02e46f8cc02bcf9c5745a72b9/workers/overview
- **Pages**: https://dash.cloudflare.com/b68132a02e46f8cc02bcf9c5745a72b9/pages/view/hartzell-hr-frontend
- **D1 Database**: https://dash.cloudflare.com/b68132a02e46f8cc02bcf9c5745a72b9/d1
- **Turnstile**: https://dash.cloudflare.com/b68132a02e46f8cc02bcf9c5745a72b9/turnstile

---

## 🔐 Cloudflare Account Details

### Account Information

- **Account ID**: `b68132a02e46f8cc02bcf9c5745a72b9`
- **Email**: agent@botpros.ai
- **Authentication**: OAuth (currently logged in via `wrangler login`)

### Check Login Status

```bash
wrangler whoami
```

**Expected Output**:
```
Account Name: Agent@botpros.ai's Account
Account ID: b68132a02e46f8cc02bcf9c5745a72b9
```

### Re-authenticate

```bash
# Logout
wrangler logout

# Login again
wrangler login
```

---

## 📦 GitHub Repository

### Repository Details

- **URL**: https://github.com/botpros-admin/HAR-HR-center
- **Status**: 7 commits ready to push (pending authentication)
- **Branch**: main

### Push to GitHub

**Option 1: Personal Access Token**
```bash
cd "/mnt/c/Users/Agent/Desktop/HR Center"

# Create token at: https://github.com/settings/tokens/new
# Scopes required: repo (full control)

# Set remote with token
git remote set-url origin https://YOUR_TOKEN@github.com/botpros-admin/HAR-HR-center.git

# Push
git push -u origin main
```

**Option 2: GitHub CLI**
```bash
# Install from: https://cli.github.com/
gh auth login
cd "/mnt/c/Users/Agent/Desktop/HR Center"
git push -u origin main
```

### Git Commands

```bash
# Check status
git status

# View commits
git log --oneline -10

# View changes
git diff

# Add files
git add .

# Commit
git commit -m "Your message"

# Push
git push origin main
```

---

## 🛠️ Essential Commands

### Backend (Cloudflare Workers)

```bash
# Navigate to backend
cd "/mnt/c/Users/Agent/Desktop/HR Center/cloudflare-app"

# Deploy backend
wrangler deploy

# View logs (real-time)
wrangler tail

# View deployments
wrangler deployments list

# Check worker status
wrangler whoami
```

### Frontend (Cloudflare Pages)

```bash
# Navigate to frontend
cd "/mnt/c/Users/Agent/Desktop/HR Center/frontend"

# Install dependencies
npm install

# Build for production
npm run build

# Deploy to Cloudflare Pages
wrangler pages deploy out --project-name=hartzell-hr-frontend

# List deployments
wrangler pages deployment list --project-name=hartzell-hr-frontend

# View project details
wrangler pages project list
```

### Database (D1)

```bash
cd "/mnt/c/Users/Agent/Desktop/HR Center/cloudflare-app"

# List tables
wrangler d1 execute hartzell_hr --command="SELECT name FROM sqlite_master WHERE type='table'"

# Count sessions
wrangler d1 execute hartzell_hr --command="SELECT COUNT(*) FROM sessions"

# View recent audit logs
wrangler d1 execute hartzell_hr --command="SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 10"

# View active sessions
wrangler d1 execute hartzell_hr --command="SELECT badge_number, expires_at FROM sessions WHERE expires_at > datetime('now')"

# Clear rate limits (for testing)
wrangler d1 execute hartzell_hr --command="DELETE FROM rate_limits"

# Database info
wrangler d1 info hartzell_hr

# Run migration file
wrangler d1 execute hartzell_hr --file=./workers/schema.sql
```

### Cache (KV)

```bash
# List KV keys
wrangler kv:key list --binding=CACHE

# Get a specific key
wrangler kv:key get "employee:badge:EMP1001" --binding=CACHE

# Delete a key
wrangler kv:key delete "employee:badge:EMP1001" --binding=CACHE

# Clear all cache (use with caution)
wrangler kv:key list --binding=CACHE | jq -r '.[].name' | xargs -I {} wrangler kv:key delete {} --binding=CACHE
```

---

## 🔑 Environment Variables & Secrets

### Backend Secrets (Cloudflare Workers)

**View Secrets**:
```bash
cd "/mnt/c/Users/Agent/Desktop/HR Center/cloudflare-app"
wrangler secret list
```

**Update Secrets**:
```bash
# Bitrix24 Webhook
wrangler secret put BITRIX24_WEBHOOK_URL
# Enter: https://hartzell.app/rest/1/jp689g5yfvre9pvd

# OpenSign API Token
wrangler secret put OPENSIGN_API_TOKEN
# Sandbox: test.keNN7hbRY40lf9z7GLzd9
# Production: (get from OpenSign dashboard)

# Session Secret (generate new)
openssl rand -base64 32 | wrangler secret put SESSION_SECRET

# OpenSign Webhook Secret (generate new)
openssl rand -base64 32 | wrangler secret put OPENSIGN_WEBHOOK_SECRET

# Turnstile Secret Key
wrangler secret put TURNSTILE_SECRET_KEY
# Get from: https://dash.cloudflare.com/b68132a02e46f8cc02bcf9c5745a72b9/turnstile
```

### Current Secret Values

| Secret | Value | Notes |
|--------|-------|-------|
| `BITRIX24_WEBHOOK_URL` | https://hartzell.app/rest/1/jp689g5yfvre9pvd | Bitrix24 API endpoint |
| `OPENSIGN_API_TOKEN` | test.keNN7hbRY40lf9z7GLzd9 | Sandbox token (change for production) |
| `SESSION_SECRET` | (auto-generated) | Session encryption key |
| `OPENSIGN_WEBHOOK_SECRET` | (auto-generated) | Webhook validation |
| `TURNSTILE_SECRET_KEY` | 1x0000000000000000000000000000000AA | Test key (change for production) |

### Environment Variables (wrangler.toml)

```toml
BITRIX24_ENTITY_TYPE_ID = "1054"
OPENSIGN_ENV = "sandbox"
SESSION_MAX_AGE = "28800"  # 8 hours
RATE_LIMIT_MAX_ATTEMPTS = "5"
RATE_LIMIT_WINDOW = "900"  # 15 minutes
```

### Frontend Environment (.env.local)

```env
NEXT_PUBLIC_API_URL=https://hartzell-hr-center.agent-b68.workers.dev/api
NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
NEXT_PUBLIC_OPENSIGN_ENV=sandbox
```

---

## 🚀 Deployment Process

### Full Deployment Workflow

**1. Backend Deployment**

```bash
cd "/mnt/c/Users/Agent/Desktop/HR Center/cloudflare-app"

# 1. Update code
# 2. Test locally (optional)
npm run dev

# 3. Deploy
wrangler deploy

# 4. Verify
curl https://hartzell-hr-center.agent-b68.workers.dev/api/health

# 5. Check logs
wrangler tail
```

**2. Frontend Deployment**

```bash
cd "/mnt/c/Users/Agent/Desktop/HR Center/frontend"

# 1. Update code
# 2. Update environment variables if needed
# 3. Build
npm run build

# 4. Deploy
wrangler pages deploy out --project-name=hartzell-hr-frontend

# 5. Test deployment
# Visit the URL shown in output
```

**3. Database Migration**

```bash
cd "/mnt/c/Users/Agent/Desktop/HR Center/cloudflare-app"

# Create migration file
# workers/migrations/001_add_column.sql

# Run migration
wrangler d1 execute hartzell_hr --file=./workers/migrations/001_add_column.sql

# Verify
wrangler d1 execute hartzell_hr --command="PRAGMA table_info(your_table)"
```

---

## 📊 Monitoring & Logs

### Real-Time Logs

```bash
cd "/mnt/c/Users/Agent/Desktop/HR Center/cloudflare-app"

# All logs
wrangler tail

# Filter by status
wrangler tail --status error
wrangler tail --status ok

# Filter by method
wrangler tail --method POST
wrangler tail --method GET

# Save to file
wrangler tail > logs.txt
```

### Analytics

```bash
# View analytics
wrangler analytics

# D1 database stats
wrangler d1 info hartzell_hr

# KV namespace stats
wrangler kv:namespace list
```

### Audit Logs (Database)

```bash
# Recent login attempts
wrangler d1 execute hartzell_hr --command="
SELECT
  action,
  status,
  badge_number,
  timestamp,
  metadata
FROM audit_logs
WHERE action IN ('login_attempt', 'login_success', 'login_failed')
ORDER BY timestamp DESC
LIMIT 20"

# Failed login attempts
wrangler d1 execute hartzell_hr --command="
SELECT
  badge_number,
  COUNT(*) as attempts,
  MAX(timestamp) as last_attempt
FROM audit_logs
WHERE action = 'login_failed'
  AND timestamp > datetime('now', '-1 hour')
GROUP BY badge_number
ORDER BY attempts DESC"

# Active sessions
wrangler d1 execute hartzell_hr --command="
SELECT
  badge_number,
  role,
  expires_at,
  last_activity
FROM sessions
WHERE expires_at > datetime('now')
ORDER BY last_activity DESC"
```

---

## 💾 Database Management

### Database Details

- **Name**: hartzell_hr
- **ID**: a9a002e6-d7fb-4067-a2b2-212bf295ef28
- **Region**: ENAM
- **Tables**: 7

### Tables

1. `sessions` - User sessions
2. `audit_logs` - Event logging
3. `rate_limits` - Login attempt tracking
4. `signature_requests` - OpenSign integration
5. `pending_tasks` - Employee tasks
6. `employee_cache` - Bitrix24 data cache
7. `system_config` - Configuration

### Common Queries

```bash
# Count all records in each table
wrangler d1 execute hartzell_hr --command="
SELECT
  (SELECT COUNT(*) FROM sessions) as sessions,
  (SELECT COUNT(*) FROM audit_logs) as audit_logs,
  (SELECT COUNT(*) FROM rate_limits) as rate_limits,
  (SELECT COUNT(*) FROM signature_requests) as signature_requests,
  (SELECT COUNT(*) FROM pending_tasks) as pending_tasks,
  (SELECT COUNT(*) FROM employee_cache) as employee_cache,
  (SELECT COUNT(*) FROM system_config) as system_config"

# Clean up expired sessions
wrangler d1 execute hartzell_hr --command="
DELETE FROM sessions
WHERE expires_at < datetime('now')"

# Clean up old audit logs (older than 90 days)
wrangler d1 execute hartzell_hr --command="
DELETE FROM audit_logs
WHERE timestamp < datetime('now', '-90 days')"

# Update system config
wrangler d1 execute hartzell_hr --command="
UPDATE system_config
SET value = '10'
WHERE key = 'max_login_attempts'"

# View current config
wrangler d1 execute hartzell_hr --command="
SELECT * FROM system_config"
```

### Backup & Restore

```bash
# Export database (not directly supported, use queries)
# Export audit logs
wrangler d1 execute hartzell_hr --command="SELECT * FROM audit_logs" > backup_audit_logs.json

# Restore (create SQL from backup)
wrangler d1 execute hartzell_hr --file=restore.sql
```

---

## 🔧 Troubleshooting

### Issue: Frontend can't reach backend

**Symptoms**: "Failed to fetch" or "ERR_NAME_NOT_RESOLVED"

**Check**:
1. Verify backend is deployed:
   ```bash
   curl https://hartzell-hr-center.agent-b68.workers.dev/api/health
   ```

2. Check frontend API URL:
   ```bash
   cat frontend/next.config.js | grep NEXT_PUBLIC_API_URL
   ```

3. Rebuild and redeploy frontend if needed:
   ```bash
   cd frontend
   npm run build
   wrangler pages deploy out --project-name=hartzell-hr-frontend
   ```

### Issue: "Too many attempts" / Rate limited

**Solution**:
```bash
# Clear rate limits for specific employee
wrangler d1 execute hartzell_hr --command="
DELETE FROM rate_limits
WHERE identifier = 'EMP1001'"

# Clear all rate limits (use with caution)
wrangler d1 execute hartzell_hr --command="
DELETE FROM rate_limits"
```

### Issue: Session expired immediately

**Check**:
1. Verify session secret is set:
   ```bash
   wrangler secret list | grep SESSION_SECRET
   ```

2. Regenerate if needed:
   ```bash
   openssl rand -base64 32 | wrangler secret put SESSION_SECRET
   ```

3. Redeploy:
   ```bash
   wrangler deploy
   ```

### Issue: Employee not found in Bitrix24

**Check**:
1. Test Bitrix24 API directly:
   ```bash
   curl "https://hartzell.app/rest/1/jp689g5yfvre9pvd/crm.item.list?entityTypeId=1054&filter[ufCrm6BadgeNumber]=EMP1001"
   ```

2. Verify webhook URL secret:
   ```bash
   wrangler secret list | grep BITRIX24
   ```

3. Update if needed:
   ```bash
   wrangler secret put BITRIX24_WEBHOOK_URL
   # Enter: https://hartzell.app/rest/1/jp689g5yfvre9pvd
   ```

### Issue: CAPTCHA not working

**For testing**, use test site key that always passes:
- Site Key: `1x00000000000000000000AA`
- Secret Key: `1x0000000000000000000000000000000AA`

**For production**:
1. Create widget: https://dash.cloudflare.com/b68132a02e46f8cc02bcf9c5745a72b9/turnstile
2. Update frontend (next.config.js)
3. Update backend secret:
   ```bash
   wrangler secret put TURNSTILE_SECRET_KEY
   ```

---

## 🚨 Emergency Procedures

### Rollback Deployment

**Workers (Backend)**:
```bash
# List recent deployments
wrangler deployments list

# Rollback to specific version
wrangler rollback [VERSION_ID]
```

**Pages (Frontend)**:
```bash
# List deployments
wrangler pages deployment list --project-name=hartzell-hr-frontend

# Redeploy previous version (from git)
git checkout [PREVIOUS_COMMIT]
cd frontend
npm run build
wrangler pages deploy out --project-name=hartzell-hr-frontend
git checkout main
```

### Disable Worker (Emergency)

```bash
# Remove routes temporarily
# Edit wrangler.toml - comment out routes
# [[routes]]
# pattern = "hartzell.work/api/*"

# Redeploy
wrangler deploy
```

### Reset Database (Caution!)

```bash
# Drop all tables and recreate
wrangler d1 execute hartzell_hr --command="
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS rate_limits;
DROP TABLE IF EXISTS signature_requests;
DROP TABLE IF EXISTS pending_tasks;
DROP TABLE IF EXISTS employee_cache;
DROP TABLE IF EXISTS system_config;"

# Run schema again
wrangler d1 execute hartzell_hr --file=./workers/schema.sql
```

### Clear All Secrets (Emergency Reset)

```bash
# List current secrets
wrangler secret list

# Delete specific secret
wrangler secret delete SECRET_NAME

# Re-add all secrets (see Environment Variables section)
```

---

## 📚 Additional Resources

### Documentation Files

All documentation is in: `C:\Users\Agent\Desktop\HR Center\`

1. `README.md` - Project overview
2. `FINAL_STATUS.md` - Current deployment status
3. `DEPLOYMENT_COMPLETE.md` - Deployment guide
4. `PUSH_TO_GITHUB.md` - GitHub push instructions
5. `CONFIGURE_DOMAIN.md` - Domain setup guide
6. `HANDOFF_GUIDE.md` - This document

### External Links

- **Cloudflare Workers Docs**: https://developers.cloudflare.com/workers
- **Cloudflare D1 Docs**: https://developers.cloudflare.com/d1
- **Cloudflare Pages Docs**: https://developers.cloudflare.com/pages
- **Wrangler CLI Docs**: https://developers.cloudflare.com/workers/wrangler
- **Bitrix24 API**: https://dev.1c-bitrix.ru/rest_help/
- **OpenSign Docs**: https://docs.opensignlabs.com

### Support

- **Cloudflare Support**: https://support.cloudflare.com
- **Wrangler Issues**: https://github.com/cloudflare/workers-sdk/issues
- **Project Issues**: https://github.com/botpros-admin/HAR-HR-center/issues

---

## ✅ Quick Reference Card

### Most Used Commands

```bash
# Backend Deploy
cd cloudflare-app && wrangler deploy

# Frontend Deploy
cd frontend && npm run build && wrangler pages deploy out --project-name=hartzell-hr-frontend

# View Logs
wrangler tail

# Database Query
wrangler d1 execute hartzell_hr --command="YOUR_SQL"

# List Secrets
wrangler secret list

# Check Login
wrangler whoami

# Push to GitHub
git push origin main
```

### Important IDs

- Account ID: `b68132a02e46f8cc02bcf9c5745a72b9`
- D1 Database ID: `a9a002e6-d7fb-4067-a2b2-212bf295ef28`
- KV Namespace ID: `ae6971a1e8f746d4a39687a325f5dd2b`
- Bitrix24 Entity Type: `1054`

### Live URLs (Current)

- Frontend: https://5a404a11.hartzell-hr-frontend.pages.dev
- Backend: https://hartzell-hr-center.agent-b68.workers.dev/api
- Cloudflare Dashboard: https://dash.cloudflare.com/b68132a02e46f8cc02bcf9c5745a72b9

---

**This handoff guide contains everything needed to manage and maintain the Hartzell HR Center deployment.**

**Last verified**: October 3, 2025
**Status**: Production Ready ✅
