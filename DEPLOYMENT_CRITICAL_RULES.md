# 🚨 CRITICAL DEPLOYMENT RULES 🚨

## Frontend Deployment

### ⚠️ ONLY CORRECT METHOD ⚠️

```bash
cd /mnt/c/Users/Agent/Desktop/HR\ Center/frontend
npm run deploy
```

### ❌ NEVER DO THIS ❌

```bash
# WRONG - deploys to wrong branch
wrangler pages deploy out --project-name=hartzell-hr-frontend --branch=production

# WRONG - no cache cleaning
npm run build && wrangler pages deploy out

# WRONG - any manual wrangler command
wrangler pages deploy ...
```

## Why This Matters

- **Custom Domain:** `app.hartzell.work` is ONLY configured for the `main` branch
- **Deployments to other branches** create orphaned Preview URLs that users can't access
- **The deploy script** ensures:
  - ✅ Deploys to `main` branch (serves app.hartzell.work)
  - ✅ Cleans caches (prevents stale JavaScript)
  - ✅ Builds fresh (no old code)
  - ✅ Commits dirty files (no deployment failures)

## Backend Deployment

```bash
cd /mnt/c/Users/Agent/Desktop/HR\ Center/cloudflare-app
wrangler deploy
```

**This is correct.** Backend has no branch issues.

---

## For Future AI Agents

**READ THIS FIRST:**
1. Frontend deployment = **ONLY** `npm run deploy` from `/frontend` directory
2. Backend deployment = `wrangler deploy` from `/cloudflare-app` directory
3. Never deploy frontend to any branch other than `main`
4. Never use raw `wrangler pages deploy` commands
5. Always verify at https://app.hartzell.work after deployment

**If you deploy incorrectly, the user will see old cached JavaScript and nothing will work.**
