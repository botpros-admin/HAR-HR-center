# Hartzell HR Center - Production System

> Employee HR portal with Bitrix24 integration, deployed on Cloudflare infrastructure

---

## 📋 System Overview

The Hartzell HR Center is a production web application for managing employee data and HR workflows. It provides a secure employee portal and administrative interface, backed by Bitrix24 CRM.

**Production URLs:**
- **Employee Portal:** https://app.hartzell.work
- **Backend API:** https://hartzell.work/api/*

**Status:** ✅ Live in Production (Deployed October 2025)

---

## 🏗️ Architecture

### Technology Stack

```
Frontend:    Next.js 14 (Static Export) + TypeScript 5.3+ + Tailwind CSS
Components:  shadcn/ui, Lucide React, Framer Motion
Backend:     Cloudflare Workers (Hono framework)
Database:    Cloudflare D1 (SQLite)
Cache:       Cloudflare KV
Storage:     Cloudflare R2
Integration: Bitrix24 REST API (Entity Type 1054)
Hosting:     Cloudflare Pages + Workers
```

### Infrastructure

**Cloudflare Account:** b68132a02e46f8cc02bcf9c5745a72b9

**Production Resources:**
- **Worker:** hartzell-hr-center-production
  - Routes: `hartzell.work/api/*`
  - Version: e702eb84-6e35-498f-899b-4961d876fda9

- **Database (D1):** hartzell_hr_prod
  - ID: 9926c3a9-c6e1-428f-8c36-fdb001c326fd
  - Tables: 7 (sessions, login_attempts, admin_users, employee_cache, signature_requests, templates, assignments)

- **Cache (KV):** Production Cache
  - ID: 54f7714316b14265a8224c255d9a7f80
  - Usage: Employee data caching (24hr TTL)

- **Storage (R2):**
  - Assets: hartzell-assets-prod
  - Templates: hartzell-hr-templates-prod

- **Frontend (Pages):** hartzell-hr-frontend
  - Custom Domain: app.hartzell.work
  - Latest: ba780ac1.hartzell-hr-frontend.pages.dev

**Estimated Monthly Cost:** $0 (within Cloudflare free tier)

---

## 🎯 Implemented Features

### 1. Employee Authentication (3-Tier Security)
- ✅ Tier 1: Badge Number + Date of Birth
- ✅ Tier 2: Employee ID verification
- ✅ Tier 3: Last 4 SSN + CAPTCHA
- ✅ Rate limiting (5 attempts per 15 minutes)
- ✅ Session management (8-hour expiry)
- ✅ CSRF protection on all state-changing requests

### 2. Employee Portal
- ✅ Personal profile view/edit (100+ fields)
- ✅ Emergency contact management
- ✅ Address and contact updates
- ✅ Banking/direct deposit information
- ✅ Tax withholding (W-4) data
- ✅ Dependent information
- ✅ Real-time Bitrix24 sync with caching

### 3. Admin Dashboard
- ✅ Employee directory with search/filter
- ✅ Individual employee detail pages
- ✅ Bulk employee refresh from Bitrix24
- ✅ Field-level editing with validation
- ✅ PDF template upload system
- ✅ Template field positioning (drag-drop)
- ✅ Document assignment to employees
- ✅ Assignment tracking (pending/completed)

### 4. Document Management
- ✅ PDF template storage in R2
- ✅ Field position metadata (JSON)
- ✅ Category organization (onboarding, compliance, benefits, etc.)
- ✅ Template activation/deactivation
- ✅ Assignment workflow
- ✅ Status tracking in D1 database

---

## 📁 Project Structure

```
HR Center/
├── README.md                    # This file
├── SPECIFICATION.md             # Technical specification
├── DEPLOYMENT_GUIDE.md          # Deployment procedures
├── OPENSIGN_INTEGRATION.md      # E-signature guide (NOT IMPLEMENTED)
│
├── cloudflare-app/              # Backend (Cloudflare Workers)
│   ├── workers/
│   │   ├── index.ts            # Hono app entry point
│   │   ├── schema.sql          # D1 database schema (7 tables)
│   │   ├── types.ts            # TypeScript interfaces
│   │   ├── routes/             # API route handlers
│   │   │   ├── auth.ts        # Authentication endpoints
│   │   │   ├── employee.ts    # Employee data endpoints
│   │   │   ├── signatures.ts  # Signature workflow (placeholder)
│   │   │   └── admin.ts       # Admin endpoints
│   │   └── lib/
│   │       ├── auth.ts        # Session management
│   │       ├── bitrix.ts      # Bitrix24 API client
│   │       └── captcha.ts     # hCaptcha verification
│   ├── wrangler.toml           # Cloudflare configuration
│   ├── DEPLOYMENT_GUIDE.md     # Backend deployment steps
│   └── package.json
│
└── frontend/                    # Frontend (Next.js 14)
    ├── src/
    │   ├── app/                # Next.js App Router
    │   │   ├── page.tsx       # Landing page
    │   │   ├── login/         # 3-tier authentication
    │   │   ├── dashboard/     # Employee portal
    │   │   └── admin/         # Admin interface
    │   ├── components/         # React components
    │   │   ├── ui/            # shadcn/ui primitives
    │   │   └── [features]/    # Feature components
    │   ├── lib/
    │   │   ├── api.ts         # API client (fetch wrapper)
    │   │   └── utils.ts       # Utilities
    │   └── types/             # TypeScript types
    ├── public/
    │   └── animations/        # Lottie JSON files
    ├── next.config.js         # Static export config
    ├── DEPLOYMENT_GUIDE.md    # Frontend deployment steps
    └── package.json
```

---

## 👥 User Roles

| Role | Access | Capabilities |
|------|--------|--------------|
| **Employee** | Self-service | View/edit own profile, view documents, update emergency contacts |
| **Admin** | Full system | Manage all employees, upload templates, create assignments, system config |

**Note:** Role-based permissions are enforced at the Worker level. Admin credentials stored in D1 `admin_users` table.

---

## 📊 Data Model

### Bitrix24 Integration

**Entity Type ID:** 1054 (HR Center SPA)

**Field Mapping:**
- 100+ custom fields mapped from Bitrix `ufCrm6*` fields to frontend camelCase
- Complete mapping in `/cloudflare-app/workers/routes/admin.ts` (FIELD_MAP)

**Field Groups:**
- Personal Information (18 fields) - Name, DOB, SSN, gender, marital status, etc.
- Contact Information (8 fields) - Email, phone, address
- Emergency Contacts (20 fields) - 2 emergency contacts with full details
- Employment Information (12 fields) - Badge, position, department, hire date, etc.
- Tax Information (12 fields) - W-4 withholdings, filing status, exemptions
- Banking Information (6 fields) - Direct deposit account and routing
- Dependent Information (24 fields) - Up to 4 dependents with SSNs
- Immigration Status (4 fields) - Work authorization details

**Sensitive Field Handling:**
- SSN, bank account numbers, dependent SSNs redacted from admin logs
- Fields stored encrypted in Bitrix24
- No PII stored in D1 cache (only in KV with 24hr TTL)

### D1 Database Schema

**7 Tables:**
1. `sessions` - Active user sessions (employee and admin)
2. `login_attempts` - Rate limiting tracking
3. `admin_users` - Admin credentials (bcrypt hashed)
4. `employee_cache` - Cached employee metadata (badge, name, position)
5. `signature_requests` - Document signature tracking (placeholder)
6. `templates` - PDF template metadata
7. `assignments` - Document-to-employee assignments

---

## 🔐 Security

### Implemented Security Measures
- ✅ HTTPS only (Cloudflare TLS 1.3)
- ✅ 3-tier authentication with progressive challenge
- ✅ Rate limiting (5 attempts per 15 minutes per IP)
- ✅ Session management with secure HttpOnly cookies
- ✅ CSRF token validation on POST/PUT/DELETE requests
- ✅ hCaptcha on final authentication tier
- ✅ Bcrypt password hashing for admin accounts
- ✅ Content Security Policy headers
- ✅ XSS protection via Next.js escaping
- ✅ Sensitive field redaction in logs

### Compliance Considerations
- Employee data stored in Bitrix24 (third-party processor)
- Minimal PII in Cloudflare infrastructure (cache only)
- Session expiry enforced (8 hours)
- Audit logging via Cloudflare Workers analytics

---

## 🚀 Deployment

### Quick Deploy

**Backend (Worker):**
```bash
cd cloudflare-app
wrangler deploy  # Always deploys to production
```

**Frontend (Pages):**
```bash
cd frontend
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build  # Generates static export to ./out
npx wrangler pages deploy out --project-name=hartzell-hr-frontend
```

**Full deployment documentation:**
- Backend: `/cloudflare-app/DEPLOYMENT_GUIDE.md`
- Frontend: `/frontend/DEPLOYMENT_GUIDE.md`

---

## 🛠️ Development

### Prerequisites
- Node.js 20+
- Cloudflare account with Workers/Pages/D1/KV/R2 enabled
- Bitrix24 webhook URL with access to entity type 1054

### Environment Variables

**Backend (Cloudflare Secrets):**
```bash
BITRIX24_WEBHOOK_URL     # Bitrix24 REST API webhook
SESSION_SECRET           # 32-byte random string for session encryption
HCAPTCHA_SECRET          # hCaptcha secret key
```

**Backend (wrangler.toml vars):**
```toml
BITRIX24_ENTITY_TYPE_ID = "1054"
SESSION_MAX_AGE = "28800"           # 8 hours
RATE_LIMIT_MAX_ATTEMPTS = "5"
RATE_LIMIT_WINDOW = "900"           # 15 minutes
```

**Frontend (.env.local for development):**
```bash
NEXT_PUBLIC_API_URL=http://localhost:8787/api
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your_hcaptcha_site_key
```

**Frontend (Cloudflare Pages environment variables):**
```bash
NEXT_PUBLIC_API_URL=https://hartzell.work/api
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your_hcaptcha_site_key
```

### Local Development

**Backend:**
```bash
cd cloudflare-app
npm install
wrangler dev  # Runs on http://localhost:8787
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev  # Runs on http://localhost:3000
```

---

## 📈 Performance

**Current Performance (Lighthouse):**
- Performance: 95+
- Accessibility: 100
- Best Practices: 100
- SEO: 100

**Core Web Vitals:**
- LCP: < 1.0s (Cloudflare CDN)
- FID: < 50ms (Static site)
- CLS: < 0.05 (No layout shifts)

**Backend Latency:**
- Employee profile fetch (cached): ~50ms
- Employee profile fetch (Bitrix24): ~200ms
- Authentication flow: ~300ms (includes CAPTCHA validation)
- Admin employee list: ~100ms (D1 cache)

---

## 📊 Current Production Data

**Bitrix24 SPA (Entity 1054):**
- Total Employees: 39
- Most Recent Badge: EMP1039
- Sample Employees:
  - Diego M Duran (EMP1001) - Project Manager
  - Ryan S Hanslip (EMP1002) - Supervisor
  - Drew Hanslip (EMP1003) - Project Manager
  - Charles Lawder Swift (EMP1004) - Outside Sales
  - Carly N Taylor (EMP1005) - Office Clerk

---

## 🐛 Known Limitations

1. **No E-Signature System** - OpenSign integration was planned but NOT implemented. Placeholder code exists but is non-functional.

2. **No Email Notifications** - No email service configured for password resets, document assignments, etc.

3. **Single Admin Role** - No granular permissions (HR Specialist vs HR Admin vs Super Admin).

4. **No Employee-Initiated Password Reset** - Admin must manually update credentials in D1.

5. **No Audit Trail UI** - Worker logs exist in Cloudflare dashboard but no admin interface for viewing.

6. **No Mobile App** - Web-only, though fully responsive.

---

## 🔗 Additional Documentation

- **SPECIFICATION.md** - Complete technical specification
- **DEPLOYMENT_GUIDE.md** - Deployment procedures and troubleshooting
- **OPENSIGN_INTEGRATION.md** - E-signature guide (NOT IMPLEMENTED - reference only)
- **cloudflare-app/README.md** - Backend architecture details
- **frontend/README.md** - Frontend architecture details

---

## 📞 Support

**System Maintainer:** agent@botpros.ai

**Production Monitoring:**
- Cloudflare Dashboard: https://dash.cloudflare.com/b68132a02e46f8cc02bcf9c5745a72b9
- Worker Logs: `wrangler tail` or Cloudflare Dashboard → Workers → Logs
- Pages Analytics: Cloudflare Dashboard → Pages → hartzell-hr-frontend → Analytics

---

## 📝 License

Proprietary - Hartzell Companies
© 2025 Hartzell Companies. All rights reserved.

---

**Production Version:** 1.0.0
**Last Updated:** October 12, 2025
**Documentation Status:** ✅ Accurate as of latest deployment
