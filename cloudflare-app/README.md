# Hartzell HR Center - Backend (Cloudflare Workers)

Production HR portal backend built with Cloudflare Workers, D1, KV, and R2.

## Architecture

```
Employee Portal (app.hartzell.work)
    ↓ HTTPS requests
Cloudflare Workers (hartzell.work/api/*)
    ↓ Store/retrieve data
D1 Database + KV Cache + R2 Storage
    ↓ Fetch/update employee data
Bitrix24 CRM (Entity Type 1054)
```

## Production Status

**✅ Deployed and Operational**

- **Worker:** hartzell-hr-center-production
- **Routes:** hartzell.work/api/*
- **Database:** hartzell_hr_prod (9926c3a9-c6e1-428f-8c36-fdb001c326fd)
- **KV Namespace:** 54f7714316b14265a8224c255d9a7f80
- **R2 Buckets:** hartzell-assets-prod, hartzell-hr-templates-prod

## Quick Start

### Prerequisites

- Node.js 20+
- Wrangler CLI: `npm install -g wrangler`
- Cloudflare account access

### Local Development

```bash
cd cloudflare-app

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:8787
```

### Deploy to Production

```bash
# Deploy Worker
wrangler deploy

# View logs
wrangler tail
```

## Authentication Flow

### 3-Tier Security

**Tier 1: Badge Number + Date of Birth**
- Employee enters badge number (e.g., EMP1001)
- Employee enters date of birth (MM/DD/YYYY)
- System queries Bitrix24 for employee
- Creates session with authLevel: 1

**Tier 2: ID Verification**
- Display employee ID on screen
- Employee verifies it matches their badge
- UI-only verification (no API call)

**Tier 3: SSN + CAPTCHA**
- Employee enters last 4 digits of SSN
- Employee completes hCaptcha
- System verifies SSN against Bitrix24
- Upgrades session to authLevel: 3
- Generates CSRF token

### Security Features

- ✅ Rate limiting (5 attempts per 15 minutes)
- ✅ hCaptcha verification (Tier 3)
- ✅ Session timeout (8 hours)
- ✅ HttpOnly + Secure cookies
- ✅ CSRF protection on mutations
- ✅ Audit logging (via Cloudflare Analytics)
- ✅ Sensitive field redaction in logs

## API Endpoints

### Authentication (`/api/auth/*`)

- `POST /auth/login` - Tier 1 auth (badge + DOB)
- `POST /auth/verify-ssn` - Tier 3 auth (SSN + CAPTCHA)
- `POST /auth/logout` - Terminate session
- `GET /auth/session` - Validate current session

### Employee Portal (`/api/employee/*`)

- `GET /employee/profile` - Get employee profile (100+ fields)
- `PUT /employee/profile` - Update employee field
- `GET /employee/dashboard` - Dashboard summary
- `GET /employee/tasks` - Pending tasks (placeholder)
- `GET /employee/documents` - Assigned documents (placeholder)

### Admin (`/api/admin/*`)

- `GET /admin/employees` - List all employees
- `POST /admin/employees/refresh` - Sync from Bitrix24
- `GET /admin/employee/:id` - Get employee detail
- `PATCH /admin/employee/:id` - Update employee
- `GET /admin/templates` - List PDF templates
- `POST /admin/templates` - Upload template
- `DELETE /admin/templates/:id` - Delete template
- `PUT /admin/templates/:id/fields` - Update field positions
- `GET /admin/assignments` - List assignments
- `POST /admin/assignments` - Create assignment
- `DELETE /admin/assignments/:id` - Delete assignment

### Signatures (`/api/signatures/*`) - Placeholder

- `GET /signatures/pending` - Placeholder endpoint
- `GET /signatures/:id/url` - Placeholder endpoint

## Database Schema (D1)

### Tables

```sql
-- Session management (8-hour expiry)
sessions (id, employee_id, bitrix_id, full_name, badge_number, auth_level, created_at, expires_at, last_activity)

-- Rate limiting (15-minute window)
login_attempts (ip_address, attempt_time, success)

-- Admin authentication (bcrypt hashed)
admin_users (id, username, password_hash, full_name, created_at, last_login)

-- Employee data cache (for quick lookups)
employee_cache (bitrix_id, badge_number, full_name, position, department, email, phone, data, last_sync)

-- Signature tracking (placeholder for future)
signature_requests (id, employee_id, document_type, document_title, status, signature_url, created_at, completed_at)

-- PDF templates (stored in R2)
templates (id, filename, category, description, field_positions, active, r2_key, created_at, updated_at)

-- Document assignments
assignments (id, template_id, employee_bitrix_id, assigned_by, status, priority, due_date, notes, created_at, completed_at)
```

### Indexes

- `sessions.expires_at` - Fast session cleanup
- `login_attempts.ip_address + attempt_time` - Rate limiting
- `employee_cache.badge_number` - Badge lookups

## Configuration

### Environment Variables (wrangler.toml)

```toml
[vars]
BITRIX24_ENTITY_TYPE_ID = "1054"
SESSION_MAX_AGE = "28800"          # 8 hours in seconds
RATE_LIMIT_MAX_ATTEMPTS = "5"
RATE_LIMIT_WINDOW = "900"          # 15 minutes in seconds
```

### Secrets (set with `wrangler secret put`)

```bash
# Bitrix24 API
wrangler secret put BITRIX24_WEBHOOK_URL
# Value: https://hartzell.app/rest/1/jp689g5yfvre9pvd

# Session encryption
wrangler secret put SESSION_SECRET
# Value: 32-byte random hex string

# hCaptcha verification
wrangler secret put HCAPTCHA_SECRET
# Value: hCaptcha secret key
```

### Bindings (wrangler.toml)

```toml
# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "hartzell_hr_prod"
database_id = "9926c3a9-c6e1-428f-8c36-fdb001c326fd"

# KV Cache
[[kv_namespaces]]
binding = "CACHE"
id = "54f7714316b14265a8224c255d9a7f80"

# R2 Storage
[[r2_buckets]]
binding = "ASSETS"
bucket_name = "hartzell-assets-prod"

[[r2_buckets]]
binding = "DOCUMENTS"
bucket_name = "hartzell-hr-templates-prod"
```

## Development Commands

```bash
# Start development server (localhost:8787)
npm run dev

# Deploy to production
npm run deploy
# Shorthand for: wrangler deploy

# View real-time logs
wrangler tail

# Database operations
wrangler d1 list
wrangler d1 execute hartzell_hr_prod --command="SELECT COUNT(*) FROM sessions"

# KV operations
wrangler kv key list --namespace-id=54f7714316b14265a8224c255d9a7f80
wrangler kv key get "employee:badge:EMP1001" --namespace-id=54f7714316b14265a8224c255d9a7f80

# R2 operations
wrangler r2 object list hartzell-hr-templates-prod
```

## Testing

### Test Authentication Flow

```bash
# Tier 1: Login with badge + DOB
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "badgeNumber": "EMP1001",
    "dateOfBirth": "1990-01-15"
  }'

# Expected response:
# {"success":true,"authLevel":1,"employeeId":123,"fullName":"John Doe"}
```

### Test Rate Limiting

```bash
# Make 6 requests quickly (should rate limit after 5)
for i in {1..6}; do
  curl -X POST http://localhost:8787/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"badgeNumber":"INVALID","dateOfBirth":"2000-01-01"}'
  echo ""
done
```

## Monitoring

### Worker Logs

```bash
# Live tail all requests
wrangler tail

# Filter by status code
wrangler tail --status error

# Filter by HTTP method
wrangler tail --method POST

# Pretty format
wrangler tail --format pretty

# Limited duration
timeout 60 wrangler tail
```

### Database Queries

```bash
# Count active sessions
wrangler d1 execute hartzell_hr_prod --command="
SELECT COUNT(*) FROM sessions
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
SELECT COUNT(*) as total, COUNT(DISTINCT department) as departments
FROM employee_cache
"
```

### KV Cache

```bash
# List all cached employees
wrangler kv key list --namespace-id=54f7714316b14265a8224c255d9a7f80

# Get specific employee
wrangler kv key get "employee:badge:EMP1001" --namespace-id=54f7714316b14265a8224c255d9a7f80

# Delete cache entry
wrangler kv key delete "employee:badge:EMP1001" --namespace-id=54f7714316b14265a8224c255d9a7f80
```

## Troubleshooting

### Issue: Rate Limited

**Solution:** Clear rate limits
```bash
wrangler d1 execute hartzell_hr_prod --command="DELETE FROM login_attempts WHERE ip_address='YOUR_IP'"
```

### Issue: Session Expired

**Solution:** Sessions expire after 8 hours. Login again.

### Issue: Can't Fetch Employee

**Symptoms:** "Employee not found" error

**Solution:**
1. Test Bitrix24 API directly:
   ```bash
   curl "https://hartzell.app/rest/1/jp689g5yfvre9pvd/crm.item.list?entityTypeId=1054&filter[ufCrm6BadgeNumber]=EMP1001"
   ```

2. Check webhook secret:
   ```bash
   wrangler secret list | grep BITRIX24
   ```

### Issue: hCaptcha Not Working

**Solution:**
1. Check frontend has correct site key
2. Verify backend secret:
   ```bash
   wrangler secret list | grep HCAPTCHA
   ```

## Project Structure

```
cloudflare-app/
├── workers/
│   ├── index.ts              # Hono app entry point
│   ├── types.ts              # TypeScript interfaces
│   ├── schema.sql            # D1 database schema
│   ├── routes/
│   │   ├── auth.ts          # Authentication endpoints
│   │   ├── employee.ts      # Employee portal endpoints
│   │   ├── admin.ts         # Admin dashboard endpoints
│   │   └── signatures.ts    # Signature endpoints (placeholder)
│   └── lib/
│       ├── auth.ts          # Session management utilities
│       ├── bitrix.ts        # Bitrix24 API client
│       └── captcha.ts       # hCaptcha verification
├── wrangler.toml            # Cloudflare configuration
├── package.json
├── tsconfig.json
├── DEPLOYMENT_GUIDE.md      # Detailed deployment guide
└── README.md                # This file
```

## Cost Estimate

**Cloudflare Free Tier Limits:**
- Workers: 100,000 requests/day
- D1: 5GB storage, 5M reads/day
- KV: 100K reads/day, 1K writes/day
- R2: 10GB storage, 1M Class A ops/month

**Expected Usage (39 Employees):**
- ~500 Worker requests/day (0.5% of limit)
- ~10MB D1 storage (0.2% of limit)
- ~1,000 KV reads/day (1% of limit)
- ~5MB R2 storage (0.05% of limit)

**Monthly Cost: $0** ✅ (within free tier)

## Production URLs

- **API:** https://hartzell.work/api/*
- **Dashboard:** https://dash.cloudflare.com/b68132a02e46f8cc02bcf9c5745a72b9
- **Frontend:** https://app.hartzell.work

## Security Checklist

- [x] Rate limiting enforced
- [x] hCaptcha on Tier 3 auth
- [x] SSN verification for sensitive access
- [x] Session timeout (8 hours)
- [x] HttpOnly + Secure cookies
- [x] CSRF protection on POST/PUT/DELETE
- [x] Sensitive field redaction in logs
- [x] HTTPS only (enforced by Cloudflare)
- [x] Bcrypt password hashing (admin accounts)

---

**Status:** ✅ **PRODUCTION**

**Deployed:** October 12, 2025

For detailed deployment instructions, see `DEPLOYMENT_GUIDE.md`.
