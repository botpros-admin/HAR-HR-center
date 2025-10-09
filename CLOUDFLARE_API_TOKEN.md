# Cloudflare API Token – Ultimate Manager

> **Token Name:** Ultimate Manager – CLAUDE  
> **Created:** October 3, 2025  
> **Account:** Agent@botpros.ai's Account  
> **Account ID:** b68132a02e46f8cc02bcf9c5745a72b9

---

## 🔐 Token Snapshot

- **Token value:** `y0VFmRp2APPYwxvSGFHk3SUCPx-D54bI-4JFXqs4`  
- **Token ID:** `8f1e5ec13edac6b1308ef6a34ff59b3c`  
- **Type:** Account-owned API token (service principal)  
- **Purpose:** Full-stack automation for the Hartzell HR Center platform (Workers, Pages, DNS, D1, KV, R2, security controls)

⚠️ **Security:** Treat the token as production-secret. Store only in encrypted secret managers or CI variables. Rotate immediately if exposed.

---

## ✅ Verification Commands

```bash
# 1. Confirm the token is active (account-level verification)
curl \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/b68132a02e46f8cc02bcf9c5745a72b9/tokens/verify"

# 2. List Workers routes on hartzell.work
curl \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/6a86ac1678ae091047af46a5b3319041/workers/routes"

# 3. Quick health check (requires DNS resolution)
curl https://hartzell.work/api/health
```

---

## 🛠️ Effective Permission Matrix

### Account-wide (Agent@botpros.ai's Account)

Full **Edit** (or better) privileges across almost every Cloudflare product, including:

- Workers Scripts, Workers Routes, Workers KV, R2, Queues, Hyperdrive
- D1, Analytics, Logs, Notifications, Observability, Workers Tail
- DNS Settings, WAF, Bot Mitigation, Magic Firewall, DDoS controls
- Pages, Images, Stream, Turnstile, Email Routing, Bulk Redirects
- Zero Trust (Access apps, device posture, service tokens, seats), Tunnel
- Account governance: Billing, Account Settings, Rulesets, Transform Rules, Secrets Store, etc.

### Zone-specific (`hartzell.work`)

- Workers Routes · Edit (bind workers to `hartzell.work/api/*`)
- DNS / Firewall / WAF / Cache / SSL · Edit
- Page Rules, Load Balancers, Zaraz, Waiting Room, Access Apps · Edit
- Analytics · Read

### Highlights

- Fully empowered for CI/CD (Pages + Workers).
- Can detach/attach worker routes and manage production DNS.
- Manages D1/KV/R2 data stores without additional credentials.

---

## 🚀 Operational Playbook

### 1. Deploy the production worker

```bash
export CLOUDFLARE_API_TOKEN="y0VFmRp2APPYwxvSGFHk3SUCPx-D54bI-4JFXqs4"
export CLOUDFLARE_ACCOUNT_ID="b68132a02e46f8cc02bcf9c5745a72b9"

cd cloudflare-app
npx wrangler deploy --env production
```

### 2. Manage Workers routes

```bash
# List
curl -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/6a86ac1678ae091047af46a5b3319041/workers/routes"

# Assign hartzell.work/api/* to the production worker
curl -X POST \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pattern":"hartzell.work/api/*","script":"hartzell-hr-center-production"}' \
  "https://api.cloudflare.com/client/v4/zones/6a86ac1678ae091047af46a5b3319041/workers/routes"

# Remove a route by ID
curl -X DELETE \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/6a86ac1678ae091047af46a5b3319041/workers/routes/<ROUTE_ID>"
```

### 3. D1 / KV / R2 operations

```bash
# Query D1 (remote)
npx wrangler d1 execute hartzell_hr --remote --command "SELECT COUNT(*) FROM sessions;"

# Read KV
curl -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/storage/kv/namespaces/NAMESPACE_ID/values/KEY"

# Upload to R2 via API
curl -X PUT --data-binary @file.pdf \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/r2/buckets/DOCUMENTS/objects/hr/file.pdf"
```

### 4. Deploy the frontend (Pages)

```bash
cd frontend
npx wrangler pages deploy out --project-name=hartzell-hr-frontend
```

---

## 📅 Activity Log

| Date (UTC) | Action | Notes |
|------------|--------|-------|
| 2025-10-03 | Cleaned legacy Pages deployments | Removed nine stale builds; kept production `6c2a8c73`. |
| 2025-10-05 | Added Workers Routes permission & bound `hartzell.work/api/*` | Production API now first-party. |
| 2025-10-05 | Verified token via `tokens/verify` | Returned `status: active`. |
| 2025-10-05 | Added BITRIX24 secret + redeployed worker | Fixed Bitrix “Invalid URL” errors. |
| 2025-10-05 | Cleared persistent rate-limit rows after login success | Worker reset logic now in place. |

---

## 🔒 Handling Guidelines

1. Never commit this file or the token to public repos.
2. Use `.env` files or shell exports that are excluded from history.
3. Rotate the token via the dashboard if compromise is suspected.
4. Optional: add IP allow-listing in the dashboard if limiting to CI runners.

```bash
# Recommended shell environment
export CLOUDFLARE_API_TOKEN="y0VFmRp2APPYwxvSGFHk3SUCPx-D54bI-4JFXqs4"
export CLOUDFLARE_ACCOUNT_ID="b68132a02e46f8cc02bcf9c5745a72b9"
export CLOUDFLARE_ZONE_ID="6a86ac1678ae091047af46a5b3319041"
```

---

## 📚 References

- Cloudflare API Docs: https://developers.cloudflare.com/api/
- Account-owned tokens: https://developers.cloudflare.com/fundamentals/api/get-started/account-owned-tokens/
- Workers Routes API: https://developers.cloudflare.com/api/resources/workers/routes/
- Wrangler CLI: https://developers.cloudflare.com/workers/wrangler/

---

**Last Updated:** October 5, 2025  
**Maintainer:** Engineering Automation – Hartzell HR Center

Ultimate Manager - CLAUDE API token summary
This API token will affect the below accounts and zones, along with their respective permissions


Agent@botpros.ai's Account - SSO Connector:Edit, Connectivity Directory:Admin, Workers R2 SQL:Read, Workers Agents Configuration:Edit, Realtime:Admin, Agents Gateway:Edit, Containers:Edit, Workers Observability:Edit, Workers R2 Data Catalog:Edit, Zero Trust Resilience:Edit, Secrets Store:Edit, Account Waiting Room:Read, Magic WAN:Edit, AI Search:Edit, Trust and Safety:Edit, Browser Rendering:Edit, DNS Views:Edit, SCIM Provisioning:Edit, Radar:Read, Load Balancing: Account Load Balancers:Edit, Cloudflare CDS Compute Account:Edit, DNS Settings:Edit, Workers Builds Configuration:Edit, Workers Pipelines:Edit, Cloudforce One:Edit, Zero Trust: PII:Read, Email Security:Edit, AI Gateway:Edit, DDoS Botnet Feed:Edit, Workers AI:Edit, Queues:Edit, Cloudflare Calls:Edit, Address Maps:Edit, Vectorize:Edit, Cloudflare One Networks:Edit, Cloudflare One Connectors:Edit, Cloudflare One Connector: WARP:Edit, Cloudflare One Connector: cloudflared:Edit, Hyperdrive:Edit, Cloudchamber:Edit, API Gateway:Edit, Notifications:Edit, URL Scanner:Edit, Access: SSH Auditing:Edit, Access: Custom Pages:Edit, Constellation:Edit, Zero Trust: Seats:Edit, Cloudflare DEX:Edit, IOT:Edit, Account: SSL and Certificates:Edit, Allow Request Tracer:Read, Disable ESC:Edit, Account Custom Pages:Edit, Magic Network Monitoring:Admin, HTTP Applications:Edit, China Network Steering:Edit, D1:Edit, Intel:Edit, Pub/Sub:Edit, Turnstile:Edit, Email Routing Addresses:Edit, Cloudflare Pages:Edit, Bulk URL Redirects:Edit, Magic Firewall:Edit, L3/4 DDoS Managed Ruleset:Edit, Transform Rules:Edit, Select Configuration:Edit, Account WAF:Edit, Magic Firewall Packet Captures:Edit, Workers R2 Storage:Edit, Magic Transit:Edit, Cloudflare Images:Edit, DDoS Protection:Edit, Account Rulesets:Edit, IP Prefixes:Edit, Workers Tail:Read, Account Analytics:Read, Cloudflare Tunnel:Edit, Access: Mutual TLS Certificates:Edit, Access: Device Posture:Edit, Access: Service Tokens:Edit, Access: Audit Logs:Read, Logs:Edit, Rule Policies:Edit, Account Filter Lists:Edit, IP Prefixes: BGP On Demand:Edit, Zero Trust:Edit, Access: Organizations, Identity Providers, and Groups:Edit, Workers KV Storage:Edit, Workers Scripts:Edit, Load Balancing: Monitors And Pools:Edit, Account Firewall Access Rules:Edit, DNS Firewall:Edit, Stream:Edit, Billing:Edit, Account Settings:Edit, Access: Apps and Policies:Edit
All zones - Firewall for AI:Edit, AI Crawl Control:Edit, DNS Settings:Edit, Cloud Connector:Edit, Fraud Detection:Edit, Response Compression:Edit, Bot Management Feedback:Edit, Snippets:Edit, Dmarc Management:Edit, Page Shield:Edit, Zone Versioning:Edit, Disable ESC:Edit, Custom Pages:Edit, Config Rules:Edit, Single Redirect:Edit, API Gateway:Read, Cache Rules:Edit, Custom Error Rules:Edit, Zaraz:Edit and Publish, Email Routing Rules:Edit, Origin Rules:Edit, Managed Headers:Edit, Web3 Hostnames:Edit, Transform Rules:Edit, HTTP DDoS Managed Ruleset:Edit, Sanitize:Edit, Bot Management:Edit, Zone WAF:Edit, Health Checks:Edit, Waiting Room:Edit, Access: Apps and Policies:Edit, Zone Settings:Edit, Zone:Edit, Workers Routes:Edit, SSL and Certificates:Edit, Logs:Edit, Cache Purge:Purge, Page Rules:Edit, Load Balancers:Edit, Firewall Services:Edit, DNS:Edit, Apps:Edit, Analytics:Read
hartzell.work - Firewall for AI:Edit, AI Crawl Control:Edit, DNS Settings:Edit, Cloud Connector:Edit, Fraud Detection:Edit, Response Compression:Edit, Bot Management Feedback:Edit, Snippets:Edit, Dmarc Management:Edit, Page Shield:Edit, Zone Versioning:Edit, Disable ESC:Edit, Custom Pages:Edit, Config Rules:Edit, Single Redirect:Edit, API Gateway:Read, Cache Rules:Edit, Custom Error Rules:Edit, Zaraz:Edit and Publish, Email Routing Rules:Edit, Origin Rules:Edit, Managed Headers:Edit, Web3 Hostnames:Edit, Transform Rules:Edit, HTTP DDoS Managed Ruleset:Edit, Sanitize:Edit, Bot Management:Edit, Zone WAF:Edit, Health Checks:Edit, Waiting Room:Edit, Access: Apps and Policies:Edit, Zone Settings:Edit, Zone:Edit, Workers Routes:Edit, SSL and Certificates:Edit, Logs:Edit, Cache Purge:Purge, Page Rules:Edit, Load Balancers:Edit, Firewall Services:Edit, DNS:Edit, Apps:Edit, Analytics:Read