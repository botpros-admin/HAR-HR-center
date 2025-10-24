# 👋 Welcome, New AI Agent!

You're taking over management of the **Cloudflare infrastructure** for the Hartzell HR Center and future botpros.ai projects.

---

## 🚀 Quick Start (5 minutes)

### Step 1: Run the Quick Start Script

```bash
bash "/mnt/c/Users/Agent/Desktop/HR Center/NEW_AI_QUICKSTART.sh"
```

This will verify:
- ✅ Wrangler authentication
- ✅ Access to all infrastructure
- ✅ Production systems are online
- ✅ Deployment readiness

### Step 2: Read the Documentation

**Start here:**
1. **`CLOUDFLARE_TAKEOVER_GUIDE.md`** - Complete infrastructure guide (READ THIS FIRST!)
2. **`SECRETS_REFERENCE.md`** - All secrets and credentials
3. **`KV_LIMIT_FIX.md`** - Recent issue and fix (context)
4. **`DEPLOYMENT_GUIDE.md`** - Detailed deployment procedures

### Step 3: Test a Deployment

**Backend:**
```bash
cd "/mnt/c/Users/Agent/Desktop/HR Center/cloudflare-app"
wrangler deploy --dry-run  # Test without deploying
wrangler deploy            # Actually deploy
```

**Frontend:**
```bash
cd "/mnt/c/Users/Agent/Desktop/HR Center/frontend"
npm run deploy  # ALWAYS use this command
```

---

## 📋 What You're Managing

### Current Infrastructure

**Production System:** Hartzell HR Center
- **Domain:** hartzell.work
- **Frontend:** https://app.hartzell.work (Cloudflare Pages)
- **Backend:** https://hartzell.work/api/* (Cloudflare Workers)
- **Status:** ✅ LIVE in production

**Resources:**
- **1 Worker** - Backend API (Node.js/Hono framework)
- **3 D1 Databases** - SQLite databases (prod/staging/dev)
- **5 KV Namespaces** - Key-value caches
- **8 R2 Buckets** - Object storage (PDF templates, assets)
- **1 Pages Project** - Frontend hosting (Next.js static export)

**Monthly Cost:** $0 (within free tier)

---

## 🔑 Critical Information

### Account Details

```
Email:       agent@botpros.ai
Account ID:  b68132a02e46f8cc02bcf9c5745a72b9
Plan:        Free Tier
Dashboard:   https://dash.cloudflare.com/b68132a02e46f8cc02bcf9c5745a72b9
```

### Secrets (5 total)

All secrets are managed via `wrangler secret put`. See `SECRETS_REFERENCE.md` for:
- `BITRIX24_WEBHOOK_URL` - Bitrix24 API access
- `SESSION_SECRET` - Session encryption
- `RESEND_API_KEY` - Email delivery
- `TURNSTILE_SECRET_KEY` - CAPTCHA verification

**How to view secrets:**
```bash
cd "/mnt/c/Users/Agent/Desktop/HR Center/cloudflare-app"
wrangler secret list
```

---

## ⚠️ Important Things to Know

### 1. Frontend Deployment - CRITICAL

**ALWAYS use this command:**
```bash
cd frontend
npm run deploy
```

**NEVER use manual wrangler commands** like:
```bash
wrangler pages deploy out  # ❌ WRONG - will deploy to wrong branch
```

**Why?** The custom domain `app.hartzell.work` is ONLY configured for the `main` branch. The `npm run deploy` script ensures deployment to `main`.

### 2. Recent Issue Fixed (Oct 24, 2025)

**Problem:** KV write limit exceeded (56,000 writes/day)

**Cause:** Cron job running every minute polling Bitrix24

**Solution:** Removed every-minute cron trigger

**Result:** System back within free tier ($0/month)

**Details:** See `KV_LIMIT_FIX.md`

### 3. Monitoring

Check logs anytime:
```bash
cd cloudflare-app
wrangler tail              # Live logs
wrangler tail --status error  # Errors only
```

Check usage:
- Dashboard → Workers & Pages → Analytics
- Dashboard → D1 / KV / R2 → Usage

---

## 🆕 Creating New Projects (botpros.ai)

### Recommended Structure

```
/mnt/c/Users/Agent/Desktop/
├── HR Center/              (Existing - hartzell.work)
└── BotPros Projects/
    ├── project-1/
    │   ├── backend/        (Worker)
    │   └── frontend/       (Pages)
    └── project-2/
        ├── backend/
        └── frontend/
```

### Quick Project Setup

**1. Create Worker:**
```bash
mkdir -p "/mnt/c/Users/Agent/Desktop/BotPros Projects/my-app/backend"
cd "/mnt/c/Users/Agent/Desktop/BotPros Projects/my-app/backend"
npm create cloudflare@latest

# Configure wrangler.toml:
# - name: "my-app-backend"
# - account_id: "b68132a02e46f8cc02bcf9c5745a72b9"
# - routes: [{ pattern = "api.botpros.ai/my-app/*", zone_name = "botpros.ai" }]
```

**2. Create Pages Project:**
```bash
cd "/mnt/c/Users/Agent/Desktop/BotPros Projects/my-app"
npx create-next-app@latest frontend

# Deploy:
cd frontend
npm run build
npx wrangler pages deploy out --project-name=my-app-frontend --branch=main
```

**3. Add Custom Domain:**
- Dashboard → Pages → my-app-frontend → Settings → Custom domains
- Add: `my-app.botpros.ai`

**Full details in `CLOUDFLARE_TAKEOVER_GUIDE.md` → "Creating New Projects"**

---

## 🔧 Common Tasks

### Deploy Backend
```bash
cd cloudflare-app
wrangler deploy
```

### Deploy Frontend
```bash
cd frontend
npm run deploy  # ← Use this!
```

### View Logs
```bash
cd cloudflare-app
wrangler tail
```

### Query Database
```bash
wrangler d1 execute hartzell_hr_prod --command="SELECT COUNT(*) FROM sessions"
```

### List KV Keys
```bash
wrangler kv key list --namespace-id=54f7714316b14265a8224c255d9a7f80
```

### List R2 Objects
```bash
wrangler r2 object list hartzell-assets-prod
```

### Update Secret
```bash
wrangler secret put SECRET_NAME  # Will prompt for value
```

---

## 📞 Getting Help

### Documentation Files (in this directory)

| File | Purpose |
|------|---------|
| `CLOUDFLARE_TAKEOVER_GUIDE.md` | Complete infrastructure guide |
| `SECRETS_REFERENCE.md` | All secrets and how to manage them |
| `DEPLOYMENT_GUIDE.md` | Detailed deployment procedures |
| `KV_LIMIT_FIX.md` | Recent fix context |
| `README.md` | Project overview |
| `SPECIFICATION.md` | Technical specification |
| `NEW_AI_QUICKSTART.sh` | Automated setup verification |

### External Resources

- **Cloudflare Docs:** https://developers.cloudflare.com
- **Wrangler CLI:** https://developers.cloudflare.com/workers/wrangler/commands
- **Support:** https://dash.cloudflare.com/support

### Emergency Contacts

- **Account Owner:** agent@botpros.ai
- **Cloudflare Support:** support@cloudflare.com

---

## ✅ Your First Day Checklist

- [ ] Run `NEW_AI_QUICKSTART.sh` and verify all checks pass
- [ ] Read `CLOUDFLARE_TAKEOVER_GUIDE.md` in full
- [ ] Review `SECRETS_REFERENCE.md`
- [ ] Test backend deployment: `cd cloudflare-app && wrangler deploy --dry-run`
- [ ] Test frontend deployment: `cd frontend && npm run deploy` (or skip if not needed)
- [ ] Verify production URLs are accessible
- [ ] Check logs: `wrangler tail` for 1 minute
- [ ] Review usage in Cloudflare Dashboard
- [ ] Confirm no KV limit exceeded emails (should be fixed)

---

## 🎉 You're Ready!

You now have complete control of the Cloudflare infrastructure. The system is:

- ✅ Deployed and operational
- ✅ Within free tier ($0/month)
- ✅ Documented and ready for expansion
- ✅ Ready for new botpros.ai projects

**Questions?** Check the documentation files or run:
```bash
wrangler --help
```

**Good luck!** 🚀

---

*Last Updated: October 24, 2025*
*Created by: Previous AI Agent*
*For: New AI Agent taking over infrastructure*
