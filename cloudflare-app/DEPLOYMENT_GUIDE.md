# 🚀 Hartzell HR Center - Complete Deployment Guide

**Domain:** hartzell.work
**Platform:** Cloudflare Workers + D1 + KV
**Time to Deploy:** ~15 minutes

---

## ✅ Pre-Deployment Checklist

- [ ] Cloudflare account with hartzell.work domain
- [ ] Node.js 20+ installed
- [ ] Terminal/Command Prompt access
- [ ] Bitrix24 API access (webhook URL ready)
- [ ] OpenSign API token (sandbox: test.keNN7hbRY40lf9z7GLzd9)

---

## 📋 Step-by-Step Deployment

### Step 1: Install Wrangler CLI

```bash
# Install globally
npm install -g wrangler

# Verify installation
wrangler --version
```

### Step 2: Login to Cloudflare

```bash
# Login (opens browser)
wrangler login

# Verify login
wrangler whoami

# Output should show:
# Account Name: Your Account
# Account ID: xxxxxxxxxxxxx
```

**📝 Copy your Account ID** - you'll need it for wrangler.toml

### Step 3: Update wrangler.toml

```bash
cd "C:\Users\Agent\Desktop\HR Center\cloudflare-app"

# Open wrangler.toml and replace:
# account_id = "YOUR_CLOUDFLARE_ACCOUNT_ID"
# with your actual Account ID from Step 2
```

### Step 4: Create D1 Database

```bash
# Create the database
wrangler d1 create hartzell_hr

# Output will show:
# [[d1_databases]]
# binding = "DB"
# database_name = "hartzell_hr"
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# Copy the database_id and update wrangler.toml
# Replace: database_id = "YOUR_D1_DATABASE_ID"
```

### Step 5: Run Database Migrations

```bash
# Create tables
wrangler d1 execute hartzell_hr --file=./workers/schema.sql

# Verify tables created
wrangler d1 execute hartzell_hr --command="SELECT name FROM sqlite_master WHERE type='table'"

# Should show: sessions, audit_logs, rate_limits, etc.
```

### Step 6: Create KV Namespace

```bash
# Create KV for caching
wrangler kv:namespace create CACHE

# Output will show:
# [[kv_namespaces]]
# binding = "CACHE"
# id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Copy the id and update wrangler.toml
# Replace: id = "YOUR_KV_NAMESPACE_ID"
```

### Step 7: Set Secrets

```bash
# Bitrix24 webhook URL
wrangler secret put BITRIX24_WEBHOOK_URL
# Enter: https://hartzell.app/rest/1/jp689g5yfvre9pvd

# OpenSign API token
wrangler secret put OPENSIGN_API_TOKEN
# Enter: test.keNN7hbRY40lf9z7GLzd9

# Generate session secret
openssl rand -base64 32 | wrangler secret put SESSION_SECRET

# Generate OpenSign webhook secret
openssl rand -base64 32 | wrangler secret put OPENSIGN_WEBHOOK_SECRET

# Turnstile (CAPTCHA) - Get from Cloudflare dashboard
wrangler secret put TURNSTILE_SECRET_KEY
# Enter: <your-turnstile-secret-key>
```

### Step 8: Setup Cloudflare Turnstile (CAPTCHA)

1. Go to https://dash.cloudflare.com
2. Navigate to **Turnstile** in left sidebar
3. Click **Create Widget**
4. Enter:
   - **Site name:** Hartzell HR Center
   - **Domain:** hartzell.work
   - **Widget Mode:** Managed
5. Click **Create**
6. **Copy Site Key** (you'll need this for frontend)
7. **Copy Secret Key** and paste when running `wrangler secret put TURNSTILE_SECRET_KEY`

### Step 9: Deploy Workers

```bash
# Deploy to Cloudflare
wrangler deploy

# Output will show:
# ✨ Success! Deployed to https://hartzell-hr-center.xxxxx.workers.dev
# ✨ Custom domain: https://hartzell.work
```

### Step 10: Configure DNS (If Not Already)

```bash
# Option A: Use Wrangler
wrangler deploy --route="hartzell.work/*"

# Option B: In Cloudflare Dashboard
# 1. Go to hartzell.work domain
# 2. Click "Workers Routes"
# 3. Add Route: hartzell.work/* → hartzell-hr-center
```

---

## 🧪 Testing

### Test 1: Health Check

```bash
curl https://hartzell.work/api/health

# Expected:
# {"status":"healthy","timestamp":"2025-10-03T...","version":"1.0.0"}
```

### Test 2: Login with Real Employee

```bash
curl -X POST https://hartzell.work/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "EMP1001",
    "dateOfBirth": "1980-07-05"
  }'

# Expected (if no SSN required):
# {"success":true,"session":{...},"requiresSSN":false}

# Or (if SSN required):
# {"success":true,"requiresSSN":true,"preAuthSession":"..."}
```

### Test 3: Rate Limiting

```bash
# Make 6 invalid attempts
for i in {1..6}; do
  curl -X POST https://hartzell.work/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"employeeId":"INVALID","dateOfBirth":"2000-01-01"}'
  echo ""
done

# 6th request should return:
# {"error":"Too many attempts. Try again later.","blockedUntil":"..."}
```

### Test 4: Check Audit Logs

```bash
wrangler d1 execute hartzell_hr --command="SELECT action, status, badge_number, timestamp FROM audit_logs ORDER BY timestamp DESC LIMIT 5"

# Should show your login attempts
```

---

## 📊 Monitoring

### Real-Time Logs

```bash
# Watch all requests
wrangler tail

# Filter errors only
wrangler tail --status error

# Filter by method
wrangler tail --method POST
```

### Analytics

```bash
# View analytics
wrangler analytics

# D1 stats
wrangler d1 info hartzell_hr

# KV stats
wrangler kv:key list --binding=CACHE
```

### Database Queries

```bash
# Count active sessions
wrangler d1 execute hartzell_hr --command="SELECT COUNT(*) FROM sessions WHERE expires_at > datetime('now')"

# Recent audit logs
wrangler d1 execute hartzell_hr --command="SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 10"

# Check employee cache
wrangler d1 execute hartzell_hr --command="SELECT badge_number, full_name, last_sync FROM employee_cache LIMIT 10"
```

---

## 🔧 Configuration

### Update Configuration

```bash
# Update system config
wrangler d1 execute hartzell_hr --command="UPDATE system_config SET value='10' WHERE key='max_login_attempts'"

# View current config
wrangler d1 execute hartzell_hr --command="SELECT * FROM system_config"
```

### Update Secrets

```bash
# Rotate session secret
openssl rand -base64 32 | wrangler secret put SESSION_SECRET

# Update Bitrix24 URL (if changed)
wrangler secret put BITRIX24_WEBHOOK_URL
```

---

## 🐛 Troubleshooting

### Issue: "Database not found"

**Solution:**
```bash
# Check database exists
wrangler d1 list

# If not, create it
wrangler d1 create hartzell_hr

# Run migrations
wrangler d1 execute hartzell_hr --file=./workers/schema.sql
```

### Issue: "KV namespace not found"

**Solution:**
```bash
# Check namespaces
wrangler kv:namespace list

# Create if missing
wrangler kv:namespace create CACHE

# Update wrangler.toml with the id
```

### Issue: "Unauthorized" errors

**Solution:**
```bash
# Re-login
wrangler logout
wrangler login

# Verify
wrangler whoami
```

### Issue: Rate limited in testing

**Solution:**
```bash
# Clear rate limits
wrangler d1 execute hartzell_hr --command="DELETE FROM rate_limits"

# Or clear specific employee
wrangler d1 execute hartzell_hr --command="DELETE FROM rate_limits WHERE identifier='EMP1001'"
```

### Issue: Employee not found

**Solution:**
```bash
# Verify Bitrix24 connection
curl "https://hartzell.app/rest/1/jp689g5yfvre9pvd/crm.item.list?entityTypeId=1054&filter[ufCrm6BadgeNumber]=EMP1001"

# Check secret
wrangler secret list

# Re-set if needed
wrangler secret put BITRIX24_WEBHOOK_URL
```

---

## 🔄 Updates & Maintenance

### Deploy Updates

```bash
# Pull latest code
git pull

# Deploy changes
wrangler deploy

# Deploy to staging first
wrangler deploy --env staging
```

### Database Migrations

```bash
# Create new migration file
# workers/migrations/001_add_column.sql

# Run migration
wrangler d1 execute hartzell_hr --file=./workers/migrations/001_add_column.sql
```

### Clear Cache

```bash
# Clear all KV cache
wrangler kv:key list --binding=CACHE | jq -r '.[].name' | xargs -I {} wrangler kv:key delete --binding=CACHE {}

# Clear employee cache in D1
wrangler d1 execute hartzell_hr --command="DELETE FROM employee_cache"
```

---

## 📈 Performance Optimization

### KV Cache Strategy

```bash
# Check cache hit rate
wrangler d1 execute hartzell_hr --command="
  SELECT
    COUNT(*) as total_logins,
    COUNT(DISTINCT badge_number) as unique_employees
  FROM audit_logs
  WHERE action='login_success'
    AND timestamp > datetime('now', '-24 hours')
"
```

### D1 Query Optimization

```bash
# Analyze slow queries
wrangler tail | grep "D1" | grep -i "slow"

# Check indexes
wrangler d1 execute hartzell_hr --command="SELECT * FROM sqlite_master WHERE type='index'"
```

---

## 🎯 Next Steps

### 1. Build Frontend (Next.js/React)

```bash
# Create frontend app
npx create-next-app@latest frontend --typescript --tailwind --app

# Configure API calls to hartzell.work/api/*
```

### 2. Add More Features

- [ ] Document upload
- [ ] Signature requests
- [ ] Benefits management
- [ ] Time-off requests

### 3. Production Hardening

- [ ] Add more comprehensive tests
- [ ] Set up monitoring alerts
- [ ] Configure WAF rules
- [ ] Enable DDoS protection
- [ ] Add backup strategy

---

## 📞 Support

### View Documentation

- Cloudflare Workers: https://developers.cloudflare.com/workers
- D1 Database: https://developers.cloudflare.com/d1
- KV: https://developers.cloudflare.com/kv
- Wrangler CLI: https://developers.cloudflare.com/workers/wrangler

### Get Help

```bash
# Wrangler help
wrangler help

# Command-specific help
wrangler d1 help
wrangler kv help
```

---

## ✅ Deployment Complete!

Your Hartzell HR Center is now live at **https://hartzell.work** 🎉

**What's Working:**
- ✅ Employee authentication (DOB + ID + SSN)
- ✅ Rate limiting (5 attempts max)
- ✅ CAPTCHA after 3 failed attempts
- ✅ Session management (8-hour expiry)
- ✅ Complete audit logging
- ✅ Bitrix24 integration
- ✅ KV caching for performance

**Next:** Build the frontend UI and connect to the API!
