# Hartzell HR Center - Cloudflare Workers App

Employee self-service portal built with Cloudflare Workers, D1, and KV.

## Architecture

```
hartzell.work
    ↓
Cloudflare Workers (API)
    ↓
D1 Database + KV Cache
    ↓
Bitrix24 API + OpenSign API
```

## Prerequisites

- Node.js 20+
- Cloudflare account with hartzell.work domain
- Wrangler CLI (`npm install -g wrangler`)

## Quick Start

### 1. Local Development

```bash
# Clone/navigate to project
cd cloudflare-app

# Install dependencies
npm install

# Setup local environment
chmod +x scripts/setup-local.sh
./scripts/setup-local.sh

# Start dev server
npm run dev

# Open http://localhost:8787
```

### 2. Deploy to Production

```bash
# Login to Cloudflare
wrangler login

# Run deployment script
chmod +x scripts/deploy.sh
./scripts/deploy.sh

# Or deploy manually
wrangler d1 create hartzell_hr
wrangler d1 execute hartzell_hr --file=./workers/schema.sql
wrangler kv:namespace create CACHE
wrangler secret put BITRIX24_WEBHOOK_URL
wrangler secret put OPENSIGN_API_TOKEN
wrangler secret put SESSION_SECRET
wrangler secret put TURNSTILE_SECRET_KEY
wrangler deploy
```

## Authentication Flow

### Step 1: Employee ID + DOB
```
1. Employee enters Employee ID (EMP1001)
2. Employee enters Date of Birth (YYYY-MM-DD)
3. System queries Bitrix24
4. Validates credentials
```

### Step 2: SSN Verification (if required)
```
1. Employee enters last 4 of SSN
2. System verifies against Bitrix24 data
3. Creates session
```

### Security Features
- Rate limiting (5 attempts per 15 minutes)
- CAPTCHA after 3 failed attempts (Cloudflare Turnstile)
- Session timeout (8 hours)
- Auto-logout on inactivity (30 minutes)
- Complete audit logging

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with Employee ID + DOB
- `POST /api/auth/verify-ssn` - Verify last 4 SSN
- `POST /api/auth/logout` - Logout
- `GET /api/auth/session` - Validate session

### Employee
- `GET /api/employee/profile` - Get employee profile
- `GET /api/employee/tasks` - Get pending tasks
- `GET /api/employee/documents` - Get documents

### Signatures
- `GET /api/signatures/pending` - Get pending signatures
- `POST /api/webhooks/opensign` - OpenSign webhook

## Database Schema

### D1 Tables
- `sessions` - Active user sessions
- `audit_logs` - All authentication events
- `rate_limits` - Rate limiting data
- `signature_requests` - OpenSign tracking
- `pending_tasks` - Employee action items
- `employee_cache` - Cached Bitrix24 data
- `system_config` - System configuration

### KV Namespaces
- `CACHE` - Employee data + session cache

## Configuration

### Environment Variables (wrangler.toml)
```toml
BITRIX24_ENTITY_TYPE_ID = "1054"
OPENSIGN_ENV = "sandbox"
SESSION_MAX_AGE = "28800"
RATE_LIMIT_MAX_ATTEMPTS = "5"
RATE_LIMIT_WINDOW = "900"
```

### Secrets (set with `wrangler secret put`)
- `BITRIX24_WEBHOOK_URL`
- `OPENSIGN_API_TOKEN`
- `SESSION_SECRET`
- `OPENSIGN_WEBHOOK_SECRET`
- `TURNSTILE_SECRET_KEY`

## Development Commands

```bash
# Start development server
npm run dev

# Deploy to production
npm run deploy

# Deploy to staging
npm run deploy:staging

# Create D1 database
npm run d1:create

# Run migrations
npm run d1:migrate

# Run migrations locally
npm run d1:migrate:local

# Create KV namespace
npm run kv:create

# List KV keys
npm run kv:list

# Type check
npm run type-check

# Run tests
npm test

# Watch mode
npm run test:watch
```

## Cloudflare Dashboard Tasks

### 1. Setup Turnstile (CAPTCHA)
1. Go to https://dash.cloudflare.com
2. Navigate to Turnstile
3. Create new site: `hartzell.work`
4. Copy Site Key → Add to frontend
5. Copy Secret Key → `wrangler secret put TURNSTILE_SECRET_KEY`

### 2. Configure DNS
1. Go to DNS settings for hartzell.work
2. Add Worker route: `hartzell.work/*`
3. Enable proxy (orange cloud)

### 3. Monitor Workers
- Analytics: https://dash.cloudflare.com/?to=/:account/workers/analytics
- Logs: `wrangler tail`
- D1 Console: https://dash.cloudflare.com/?to=/:account/d1

## Security Checklist

- [x] Rate limiting implemented
- [x] CAPTCHA after 3 attempts
- [x] SSN verification for sensitive actions
- [x] Session timeout
- [x] HTTPOnly + Secure cookies
- [x] CSRF protection
- [x] Audit logging
- [x] Data encryption in transit (HTTPS)
- [x] KV/D1 data at rest encryption (automatic)

## Testing

### Test Login Flow
```bash
# Test with real employee data
curl -X POST https://hartzell.work/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "EMP1001",
    "dateOfBirth": "1980-07-05"
  }'
```

### Test Rate Limiting
```bash
# Make 6 requests quickly
for i in {1..6}; do
  curl -X POST https://hartzell.work/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"employeeId":"INVALID","dateOfBirth":"2000-01-01"}'
  echo ""
done
```

## Monitoring

### View Logs
```bash
# Real-time logs
wrangler tail

# Filter by status
wrangler tail --status error

# Filter by method
wrangler tail --method POST
```

### Query Analytics
```bash
# View analytics
wrangler analytics

# D1 queries
wrangler d1 execute hartzell_hr --command="SELECT COUNT(*) FROM sessions"
wrangler d1 execute hartzell_hr --command="SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 10"
```

## Troubleshooting

### Issue: Rate limited
**Solution:** Wait 15 minutes or clear rate limits:
```bash
wrangler d1 execute hartzell_hr --command="DELETE FROM rate_limits WHERE identifier='EMP1001'"
```

### Issue: Session expired
**Solution:** Login again. Sessions expire after 8 hours or 30 min inactivity.

### Issue: Can't access Bitrix24
**Solution:** Check webhook URL:
```bash
wrangler secret put BITRIX24_WEBHOOK_URL
# Enter: https://hartzell.app/rest/1/jp689g5yfvre9pvd
```

## Project Structure

```
cloudflare-app/
├── workers/
│   ├── index.ts          # Main Worker entry
│   ├── types.ts          # TypeScript types
│   ├── schema.sql        # D1 database schema
│   ├── routes/
│   │   ├── auth.ts       # Authentication routes
│   │   ├── employee.ts   # Employee routes
│   │   ├── signatures.ts # Signature routes
│   │   └── admin.ts      # Admin routes
│   └── lib/
│       ├── auth.ts       # Auth utilities
│       ├── bitrix.ts     # Bitrix24 client
│       └── opensign.ts   # OpenSign client
├── app/                  # Frontend (Next.js - TBD)
├── scripts/
│   ├── deploy.sh         # Deployment script
│   └── setup-local.sh    # Local setup script
├── wrangler.toml         # Cloudflare config
├── package.json
└── README.md
```

## Cost Estimate

**Cloudflare Free Tier:**
- Workers: 100,000 requests/day (FREE)
- D1: 5GB storage, 5M reads/day (FREE)
- KV: 100K reads/day, 1K writes/day (FREE)
- Pages: Unlimited (FREE)

**Expected for 39 employees:**
- ~500 requests/day
- ~10MB D1 storage
- ~1,000 KV reads/day

**Total Cost: $0/month** ✅

---

**Ready to deploy!** 🚀

Run `./scripts/deploy.sh` to get started.
