# Claude Agent Instructions - Hartzell HR Center

## 🚨 READ THIS FIRST - CRITICAL DEPLOYMENT RULES 🚨

### Frontend Deployment - THE ONLY CORRECT METHOD

**ALWAYS use this command:**
```bash
cd /mnt/c/Users/Agent/Desktop/HR\ Center/frontend
npm run deploy
```

**WHY THIS MATTERS:**
- The custom domain `app.hartzell.work` is ONLY configured for the `main` branch
- Deploying to any other branch (like `production`, `preview`, etc.) creates orphaned deployments that users CANNOT access
- Users will see OLD CACHED JAVASCRIPT if you deploy incorrectly
- The `npm run deploy` script AUTOMATICALLY:
  - Cleans all caches (prevents stale builds)
  - Deploys to `main` branch (the ONLY branch that serves the custom domain)
  - Commits dirty files (prevents deployment failures)

**NEVER DO:**
- ❌ `wrangler pages deploy out --branch=production`
- ❌ `wrangler pages deploy out --project-name=hartzell-hr-frontend --branch=production`
- ❌ Any manual `wrangler pages deploy` command
- ❌ Deploying to any branch other than `main`

### Backend Deployment

**This is correct:**
```bash
cd /mnt/c/Users/Agent/Desktop/HR\ Center/cloudflare-app
wrangler deploy
```

Backend has no branch issues. This is the correct method.

---

## Quick Reference

### Project Structure
- **Frontend:** `/mnt/c/Users/Agent/Desktop/HR Center/frontend` (Next.js 14 static export)
- **Backend:** `/mnt/c/Users/Agent/Desktop/HR Center/cloudflare-app` (Cloudflare Workers + Hono)

### Production URLs
- **Frontend:** https://app.hartzell.work (custom domain, ONLY serves `main` branch)
- **Backend API:** https://hartzell.work/api/*
- **Bitrix24 Webhook:** https://hartzell.app/rest/1/jp689g5yfvre9pvd

### Common Tasks

**Deploy Frontend:**
```bash
cd /mnt/c/Users/Agent/Desktop/HR\ Center/frontend && npm run deploy
```

**Deploy Backend:**
```bash
cd /mnt/c/Users/Agent/Desktop/HR\ Center/cloudflare-app && wrangler deploy
```

**Verify Deployments:**
- Frontend: Visit https://app.hartzell.work and do hard refresh (Ctrl+Shift+R)
- Backend: `curl -I https://hartzell.work/api/auth/session` (should return 401 or 200)

**View Logs:**
```bash
cd /mnt/c/Users/Agent/Desktop/HR\ Center/cloudflare-app && wrangler tail --format pretty
```

---

## Architecture Notes

### Database (D1)
- **Name:** `hartzell_hr_prod`
- **ID:** `9926c3a9-c6e1-428f-8c36-fdb001c326fd`
- **Tables:** 7 (sessions, login_attempts, admin_users, employee_cache, etc.)

### Cache (KV)
- **Namespace ID:** `54f7714316b14265a8224c255d9a7f80`
- **Purpose:** Employee data caching (24hr TTL)

### Storage (R2)
- **Assets:** `hartzell-assets-prod`
- **Templates:** `hartzell-hr-templates-prod`

### Bitrix24 Integration
- **Entity Type ID:** `1054` (HR Center SPA)
- **Field Mapping:** See `cloudflare-app/workers/routes/admin.ts` FIELD_MAP

---

## Important Files

**Deployment:**
- `DEPLOYMENT_GUIDE.md` - Complete deployment documentation
- `DEPLOYMENT_CRITICAL_RULES.md` - Critical rules summary
- `frontend/deploy.sh` - Frontend deployment script (used by `npm run deploy`)
- `cloudflare-app/wrangler.toml` - Backend configuration

**Documentation:**
- `README.md` - Project overview
- `SPECIFICATION.md` - Technical specification
- `COMPREHENSIVE_BITRIX24_FIELD_IMPLEMENTATION_GUIDE.md` - Field mapping guide

**Code:**
- `cloudflare-app/workers/routes/admin.ts` - Admin API routes (employee CRUD, file uploads, etc.)
- `cloudflare-app/workers/lib/bitrix.ts` - Bitrix24 API client
- `frontend/src/app/admin/employees/` - Admin employee management pages
- `frontend/src/components/FileField.tsx` - File upload/download component

---

## Common Mistakes to Avoid

1. **❌ Deploying frontend with manual wrangler commands** → Use `npm run deploy`
2. **❌ Deploying to branches other than `main`** → Always use `npm run deploy`
3. **❌ Forgetting to hard refresh browser** → Users will see old cached JS
4. **❌ Modifying deployment script** → It's correct, don't change it
5. **❌ Using `z.string().optional().nullable()` for file fields** → Use `z.any().optional().nullable()`

---

## File Field Handling

File fields in Bitrix24 return different formats:
- Single file: `{ id, url, urlMachine, name, size }`
- Multiple files: Array of file objects
- Legacy: File ID as number

**Backend handles this with:**
- `z.any().optional().nullable()` for validation
- Download proxy at `/admin/employee/:id/file/:fieldName`
- Upload endpoint at `/admin/employee/:id/file/:fieldName` (POST)
- Delete endpoint at `/admin/employee/:id/file/:fieldName` (DELETE)

---

## Remember

**When in doubt about deployment:**
1. Frontend = `cd frontend && npm run deploy`
2. Backend = `cd cloudflare-app && wrangler deploy`
3. Never use manual wrangler pages commands for frontend
4. Always verify at https://app.hartzell.work after deployment
5. Tell user to hard refresh if they see old content
