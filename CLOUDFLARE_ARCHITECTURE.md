# Cloudflare Architecture - Hartzell HR Center

**Domain:** hartzell.work
**Platform:** Cloudflare Pages + Workers + D1
**Authentication:** DOB + Employee ID

---

## System Architecture

```
                        CLOUDFLARE INFRASTRUCTURE

┌─────────────────────────────────────────────────────────────────────┐
│                       hartzell.work (Domain)                         │
│                     (Managed in Cloudflare DNS)                      │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                     Cloudflare Pages (Hosting)                       │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │               Next.js 14 Application (SSR/SSG)                │  │
│  │                                                                │  │
│  │  Routes:                                                       │  │
│  │  - / (Login page)                                             │  │
│  │  - /dashboard (Employee portal)                               │  │
│  │  - /apply (Public application)                                │  │
│  │  - /admin (HR management)                                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    Cloudflare Workers (API Layer)                    │
│                                                                       │
│  Worker Functions:                                                   │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────────────┐  │
│  │ Authentication │  │ Bitrix24 Proxy │  │ OpenSign Webhook    │  │
│  │ /api/auth      │  │ /api/employees │  │ /api/webhooks/*     │  │
│  └────────────────┘  └────────────────┘  └─────────────────────┘  │
│                                                                       │
│  Environment Variables (Worker Secrets):                             │
│  - BITRIX24_WEBHOOK_URL                                              │
│  - OPENSIGN_API_TOKEN                                                │
│  - SESSION_SECRET                                                    │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    Cloudflare D1 (SQL Database)                      │
│                         (Optional - for caching)                     │
│                                                                       │
│  Tables:                                                             │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ sessions            - Active user sessions                      │ │
│  │ audit_logs          - Login attempts, actions                   │ │
│  │ employee_cache      - Cached Bitrix24 data (performance)        │ │
│  │ signature_requests  - OpenSign tracking                         │ │
│  └────────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                  External Integrations                               │
│                                                                       │
│  ┌──────────────────────┐          ┌──────────────────────────┐    │
│  │   Bitrix24 API       │          │   OpenSign API           │    │
│  │   (Employee Data)    │          │   (E-Signatures)         │    │
│  │                      │          │                          │    │
│  │   Entity: 1054       │          │   Token: test.keNN...    │    │
│  │   39 employees       │          │   Sandbox mode           │    │
│  └──────────────────────┘          └──────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## DOB + Employee ID Authentication

### Login Flow

```typescript
// pages/index.tsx (Login Page)
export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8">
          Hartzell HR Center
        </h1>

        <form onSubmit={handleLogin}>
          <div className="space-y-6">
            {/* Employee ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employee ID
              </label>
              <input
                type="text"
                placeholder="EMP1001"
                className="w-full px-4 py-3 border rounded-lg"
                required
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth
              </label>
              <input
                type="date"
                className="w-full px-4 py-3 border rounded-lg"
                required
              />
            </div>

            <button className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700">
              Sign In
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          First time? Your Employee ID and Date of Birth are on your badge.
        </p>
      </div>
    </div>
  );
}
```

### Authentication Worker

```typescript
// workers/auth.ts
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { employeeId, dateOfBirth } = await request.json();

    // 1. Check rate limit
    const rateLimitKey = `rate_limit:${employeeId}`;
    const attempts = await env.KV.get(rateLimitKey);
    if (parseInt(attempts || "0") > 5) {
      return new Response(JSON.stringify({
        error: "Too many attempts. Try again in 15 minutes."
      }), { status: 429 });
    }

    // 2. Query Bitrix24
    const bitrixUrl = `${env.BITRIX24_WEBHOOK_URL}/crm.item.list`;
    const response = await fetch(bitrixUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        entityTypeId: "1054",
        "filter[ufCrm6BadgeNumber]": employeeId
      })
    });

    const data = await response.json();

    // 3. Verify employee exists
    if (!data.result?.items?.length) {
      await incrementRateLimit(env.KV, rateLimitKey);
      return new Response(JSON.stringify({
        error: "Invalid Employee ID or Date of Birth"
      }), { status: 401 });
    }

    const employee = data.result.items[0];

    // 4. Verify DOB matches
    const employeeDOB = new Date(employee.ufCrm6PersonalBirthday).toISOString().split('T')[0];
    if (employeeDOB !== dateOfBirth) {
      await incrementRateLimit(env.KV, rateLimitKey);
      return new Response(JSON.stringify({
        error: "Invalid Employee ID or Date of Birth"
      }), { status: 401 });
    }

    // 5. Create session
    const sessionId = crypto.randomUUID();
    const sessionData = {
      employeeId: employee.id,
      badgeNumber: employee.ufCrm6BadgeNumber,
      name: `${employee.ufCrm6Name} ${employee.ufCrm6LastName}`,
      role: determineRole(employee), // employee, manager, hr_admin
      createdAt: Date.now()
    };

    // Store in D1
    await env.DB.prepare(
      `INSERT INTO sessions (id, employee_id, data, expires_at)
       VALUES (?, ?, ?, datetime('now', '+8 hours'))`
    )
    .bind(sessionId, employee.id, JSON.stringify(sessionData))
    .run();

    // 6. Audit log
    await env.DB.prepare(
      `INSERT INTO audit_logs (employee_id, action, ip_address, timestamp)
       VALUES (?, ?, ?, datetime('now'))`
    )
    .bind(employee.id, 'login_success', request.headers.get('CF-Connecting-IP'))
    .run();

    // 7. Clear rate limit
    await env.KV.delete(rateLimitKey);

    // 8. Return session cookie
    return new Response(JSON.stringify({
      success: true,
      sessionId,
      employee: sessionData
    }), {
      headers: {
        'Set-Cookie': `session=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`,
        'Content-Type': 'application/json'
      }
    });
  }
};

function determineRole(employee: any): string {
  // Logic to determine user role based on position or custom field
  const position = employee.ufCrm6WorkPosition?.toLowerCase() || '';

  if (position.includes('hr') || position.includes('director')) {
    return 'hr_admin';
  } else if (position.includes('manager') || position.includes('supervisor')) {
    return 'manager';
  }
  return 'employee';
}
```

---

## Cloudflare D1 Database Schema

```sql
-- workers/schema.sql

-- Sessions table
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  data TEXT NOT NULL, -- JSON serialized session data
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_employee ON sessions(employee_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- Audit logs
CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  action TEXT NOT NULL, -- 'login_success', 'login_failed', 'data_viewed', etc.
  ip_address TEXT,
  user_agent TEXT,
  metadata TEXT, -- JSON for additional context
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_employee ON audit_logs(employee_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);

-- Employee cache (for performance)
CREATE TABLE employee_cache (
  id INTEGER PRIMARY KEY,
  bitrix_id INTEGER UNIQUE NOT NULL,
  data TEXT NOT NULL, -- Full employee JSON from Bitrix24
  last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cache_sync ON employee_cache(last_sync);

-- Signature request tracking
CREATE TABLE signature_requests (
  id TEXT PRIMARY KEY, -- OpenSign request ID
  employee_id INTEGER NOT NULL,
  document_type TEXT NOT NULL,
  status TEXT NOT NULL, -- 'pending', 'signed', 'declined', 'expired'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  signed_at TIMESTAMP,
  metadata TEXT -- JSON
);

CREATE INDEX idx_signatures_employee ON signature_requests(employee_id);
CREATE INDEX idx_signatures_status ON signature_requests(status);
```

---

## Cloudflare Setup with Wrangler CLI

### Prerequisites

```bash
# Install Wrangler (Cloudflare's CLI)
npm install -g wrangler

# Login to Cloudflare
wrangler login
```

### Project Initialization

```bash
# Navigate to project directory
cd "C:\Users\Agent\Desktop\HR Center"

# Initialize Wrangler config
wrangler init

# Create wrangler.toml configuration
```

### wrangler.toml Configuration

```toml
# wrangler.toml
name = "hartzell-hr-center"
main = "workers/auth.ts"
compatibility_date = "2025-10-03"

# Pages configuration (Next.js)
[build]
command = "npm run build"
directory = ".vercel/output/static"

# D1 Database binding
[[d1_databases]]
binding = "DB"
database_name = "hartzell_hr"
database_id = "<will-be-generated>"

# KV namespace for rate limiting
[[kv_namespaces]]
binding = "KV"
id = "<will-be-generated>"

# Environment variables (secrets)
[vars]
BITRIX24_ENTITY_TYPE_ID = "1054"

# Workers routes
[[routes]]
pattern = "hartzell.work/api/*"
zone_name = "hartzell.work"

# Custom domains
[env.production]
routes = [
  { pattern = "hartzell.work/*", zone_name = "hartzell.work" }
]

[env.staging]
routes = [
  { pattern = "staging.hartzell.work/*", zone_name = "hartzell.work" }
]
```

---

## Deployment Commands

### 1. Create D1 Database

```bash
# Create the database
wrangler d1 create hartzell_hr

# Output will be:
# ✅ Successfully created DB 'hartzell_hr'
#
# [[d1_databases]]
# binding = "DB"
# database_name = "hartzell_hr"
# database_id = "xxxx-xxxx-xxxx-xxxx"

# Copy the database_id to wrangler.toml
```

### 2. Initialize Database Schema

```bash
# Run migrations
wrangler d1 execute hartzell_hr --file=./workers/schema.sql

# Verify tables created
wrangler d1 execute hartzell_hr --command="SELECT name FROM sqlite_master WHERE type='table'"
```

### 3. Create KV Namespace

```bash
# Create KV for rate limiting
wrangler kv:namespace create "RATE_LIMIT"

# Output will give you the ID to add to wrangler.toml
```

### 4. Set Secrets

```bash
# Set Bitrix24 webhook URL
wrangler secret put BITRIX24_WEBHOOK_URL
# Enter: https://hartzell.app/rest/1/jp689g5yfvre9pvd

# Set OpenSign API token
wrangler secret put OPENSIGN_API_TOKEN
# Enter: test.keNN7hbRY40lf9z7GLzd9

# Set session secret
wrangler secret put SESSION_SECRET
# Enter: <generate with: openssl rand -base64 32>

# Set OpenSign webhook secret
wrangler secret put OPENSIGN_WEBHOOK_SECRET
# Enter: <your webhook secret>
```

### 5. Deploy Next.js to Cloudflare Pages

```bash
# Build the Next.js app
npm run build

# Deploy to Cloudflare Pages
wrangler pages deploy .vercel/output/static --project-name=hartzell-hr-center

# Set custom domain
wrangler pages deployment list
wrangler pages deployment create --project-name=hartzell-hr-center
```

### 6. Configure DNS

```bash
# Add DNS records (or use Cloudflare dashboard)
# A record: hartzell.work → <pages-url>
# CNAME: www.hartzell.work → hartzell.work
```

---

## Employee Dashboard (After Login)

```typescript
// app/dashboard/page.tsx
export default async function DashboardPage() {
  const session = await getServerSession();
  const employee = await getEmployeeData(session.employeeId);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">
              Welcome, {employee.ufCrm6Name}!
            </h1>
            <button onClick={logout}>Sign Out</button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Profile Card */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Your Profile</h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-600">Employee ID:</span>
                <span className="ml-2 font-medium">{employee.ufCrm6BadgeNumber}</span>
              </div>
              <div>
                <span className="text-gray-600">Position:</span>
                <span className="ml-2 font-medium">{employee.ufCrm6WorkPosition}</span>
              </div>
              <div>
                <span className="text-gray-600">Department:</span>
                <span className="ml-2 font-medium">{employee.ufCrm6Subsidiary}</span>
              </div>
              <div>
                <span className="text-gray-600">Start Date:</span>
                <span className="ml-2 font-medium">
                  {formatDate(employee.ufCrm6EmploymentStartDate)}
                </span>
              </div>
            </div>
          </div>

          {/* Benefits Card */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Benefits</h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-600">PTO Days:</span>
                <span className="ml-2 font-medium">{employee.ufCrm6PtoDays || 0}</span>
              </div>
              <div>
                <span className="text-gray-600">Health Insurance:</span>
                <span className="ml-2 font-medium">
                  {employee.ufCrm6HealthInsurance ? 'Enrolled' : 'Not Enrolled'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">401(k):</span>
                <span className="ml-2 font-medium">
                  {employee.ufCrm_6_401K_ENROLLMENT ? 'Enrolled' : 'Not Enrolled'}
                </span>
              </div>
            </div>
          </div>

          {/* Documents Card */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">My Documents</h2>
            <div className="space-y-2">
              <button className="w-full text-left text-sm text-blue-600 hover:underline">
                📄 W-4 Form
              </button>
              <button className="w-full text-left text-sm text-blue-600 hover:underline">
                📄 I-9 Form
              </button>
              <button className="w-full text-left text-sm text-blue-600 hover:underline">
                📄 Employee Handbook
              </button>
              <button className="w-full text-left text-sm text-blue-600 hover:underline">
                📄 Direct Deposit Info
              </button>
            </div>
          </div>

          {/* Equipment Card */}
          <div className="bg-white p-6 rounded-lg shadow md:col-span-2">
            <h2 className="text-lg font-semibold mb-4">Assigned Equipment</h2>
            {employee.ufCrm6EquipmentAssigned?.length ? (
              <div className="grid grid-cols-2 gap-4">
                {JSON.parse(employee.ufCrm6EquipmentAssigned).map((item, i) => (
                  <div key={i} className="border p-3 rounded">
                    <div className="font-medium">{item.type}</div>
                    <div className="text-sm text-gray-600">{item.serial || item.model}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No equipment assigned</p>
            )}
          </div>

          {/* Pending Actions */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Action Items</h2>
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <span className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></span>
                Complete performance review
              </div>
              <div className="flex items-center text-sm">
                <span className="w-3 h-3 bg-green-400 rounded-full mr-2"></span>
                Sign handbook acknowledgment
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
```

---

## Security Enhancements

### 1. Rate Limiting

```typescript
// workers/rate-limit.ts
export async function checkRateLimit(
  kv: KVNamespace,
  key: string,
  maxAttempts: number = 5
): Promise<boolean> {
  const attempts = await kv.get(key);
  const count = parseInt(attempts || "0");

  if (count >= maxAttempts) {
    return false; // Rate limited
  }

  await kv.put(key, (count + 1).toString(), { expirationTtl: 900 }); // 15 min
  return true;
}
```

### 2. Session Management

```typescript
// workers/session.ts
export async function validateSession(
  db: D1Database,
  sessionId: string
): Promise<SessionData | null> {
  const result = await db.prepare(
    `SELECT * FROM sessions
     WHERE id = ?
     AND expires_at > datetime('now')
     AND datetime(last_activity, '+30 minutes') > datetime('now')`
  )
  .bind(sessionId)
  .first();

  if (!result) return null;

  // Update last activity
  await db.prepare(
    `UPDATE sessions SET last_activity = datetime('now') WHERE id = ?`
  )
  .bind(sessionId)
  .run();

  return JSON.parse(result.data as string);
}
```

### 3. Audit Logging

```typescript
// Automatically log all actions
export async function auditLog(
  db: D1Database,
  employeeId: number,
  action: string,
  metadata?: any
) {
  await db.prepare(
    `INSERT INTO audit_logs (employee_id, action, metadata, timestamp)
     VALUES (?, ?, ?, datetime('now'))`
  )
  .bind(employeeId, action, JSON.stringify(metadata || {}))
  .run();
}
```

---

## Complete Deployment Checklist

### Phase 1: Cloudflare Setup
- [ ] Install Wrangler CLI: `npm install -g wrangler`
- [ ] Login to Cloudflare: `wrangler login`
- [ ] Create D1 database: `wrangler d1 create hartzell_hr`
- [ ] Run schema migration: `wrangler d1 execute hartzell_hr --file=schema.sql`
- [ ] Create KV namespace for rate limiting
- [ ] Set all secrets (Bitrix24, OpenSign, Session)

### Phase 2: Next.js Build
- [ ] Initialize Next.js project locally
- [ ] Build authentication pages (DOB + Employee ID)
- [ ] Build employee dashboard
- [ ] Integrate Bitrix24 API
- [ ] Test locally with `wrangler dev`

### Phase 3: Deployment
- [ ] Deploy Workers: `wrangler deploy`
- [ ] Deploy Pages: `wrangler pages deploy`
- [ ] Configure DNS for hartzell.work
- [ ] Enable SSL (automatic with Cloudflare)
- [ ] Test production deployment

### Phase 4: Testing
- [ ] Test authentication with real employee data
- [ ] Verify session management
- [ ] Check rate limiting
- [ ] Test on mobile devices
- [ ] Validate audit logs

---

## Cost Estimate (Cloudflare)

**Free Tier Includes:**
- ✅ Cloudflare Pages (unlimited requests)
- ✅ Workers (100,000 requests/day)
- ✅ D1 Database (5GB storage, 5M reads/day)
- ✅ KV (100,000 reads/day, 1,000 writes/day)
- ✅ SSL certificate
- ✅ CDN/DDoS protection

**Paid (if needed - $5/month):**
- Workers: $5/month for 10M requests
- D1: Pay-as-you-go beyond free tier
- Pages: Unlimited (always free)

**Estimated: $0-5/month** (likely FREE for your use case!)

---

## Next Steps

**Want me to:**
1. ✅ Generate the complete Wrangler setup scripts?
2. ✅ Build the authentication worker code?
3. ✅ Create the employee dashboard?
4. ✅ Set up the D1 database schema?
5. ✅ Initialize the Next.js project structure?

**Or would you like to:**
- SSH into your Cloudflare account now and I'll guide you?
- Review the architecture first?
- Discuss any security concerns?

**Let me know and I'll help you get this deployed to hartzell.work!** 🚀
