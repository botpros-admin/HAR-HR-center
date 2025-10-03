# 🌐 Configure hartzell.work Domain - Instructions

**Current Status**:
- ✅ Frontend deployed to: https://f7f72fd4.hartzell-hr-frontend.pages.dev
- ✅ Backend deployed to Workers with hartzell.work/api/* routes
- ⏳ Need to configure hartzell.work for frontend

---

## 🎯 Goal

Configure `hartzell.work` to serve the frontend application (employee portal).

**Options**:
1. **hartzell.work** → Frontend (employee portal)
2. **hartzell.work/api/** → Backend (API) ✅ Already configured

---

## 📋 Step-by-Step Configuration

### Step 1: Access Cloudflare Pages Dashboard

1. Go to: https://dash.cloudflare.com/b68132a02e46f8cc02bcf9c5745a72b9/pages
2. Click on **"hartzell-hr-frontend"** project
3. Click **"Custom domains"** tab

### Step 2: Add Custom Domain

1. Click **"Set up a custom domain"**
2. Enter: `hartzell.work`
3. Click **"Continue"**
4. Cloudflare will:
   - Verify you own the domain
   - Automatically configure DNS
   - Issue SSL certificate
   - Set up routing

### Step 3: DNS Configuration (Automatic)

Cloudflare will automatically create a DNS record:
- **Type**: CNAME
- **Name**: @ (root domain)
- **Target**: hartzell-hr-frontend.pages.dev
- **Proxy**: Enabled (orange cloud)

**Note**: This happens automatically when you add the custom domain.

### Step 4: Verify Configuration

Wait 1-2 minutes, then verify:

```bash
# Check DNS
nslookup hartzell.work

# Test frontend
curl https://hartzell.work/

# Test backend API
curl https://hartzell.work/api/health
```

**Expected Result**:
- `https://hartzell.work/` → Frontend (employee portal login page)
- `https://hartzell.work/api/*` → Backend (API endpoints)

---

## 🔧 Alternative: Use Subdomain for Frontend

If you want to keep the backend on the root and frontend on a subdomain:

### Option: app.hartzell.work

1. In Cloudflare Pages → Custom domains
2. Add: `app.hartzell.work`
3. Wait for DNS propagation

**Result**:
- `https://app.hartzell.work/` → Frontend (employee portal)
- `https://hartzell.work/api/*` → Backend (API)
- `https://hartzell.work/` → Can redirect to app subdomain or show landing page

---

## ⚠️ Important Notes

### Routing Conflicts

If both Workers and Pages are on the same domain:
- Workers routes take precedence
- Your current Worker routes: `hartzell.work/api/*` and `hartzell.work/*`

**Solution**: Update Worker routes to be more specific

#### Edit Worker Routes (if needed)

1. Go to: https://dash.cloudflare.com/b68132a02e46f8cc02bcf9c5745a72b9/workers/overview
2. Click on **"hartzell-hr-center"**
3. Click **"Triggers"** tab
4. Edit routes:
   - Keep: `hartzell.work/api/*` (API routes)
   - Remove: `hartzell.work/*` (catch-all)

This allows:
- Pages to handle `hartzell.work/` (frontend)
- Workers to handle `hartzell.work/api/*` (backend)

---

## 🔐 Update Frontend Environment

After configuring the domain, update the frontend API URL if needed:

### If using hartzell.work for frontend:
```bash
cd frontend
# Update .env.local
NEXT_PUBLIC_API_URL=https://hartzell.work/api

# Rebuild and redeploy
npm run build
wrangler pages deploy out --project-name=hartzell-hr-frontend
```

### If using app.hartzell.work:
No changes needed - API URL is already `https://hartzell.work/api`

---

## ✅ Verification Checklist

After configuration:

- [ ] Can access frontend at `https://hartzell.work/` (or `https://app.hartzell.work/`)
- [ ] Login page loads correctly
- [ ] Backend API responds at `https://hartzell.work/api/health`
- [ ] SSL certificate is valid (green padlock in browser)
- [ ] No mixed content warnings
- [ ] DNS propagation complete (check with `nslookup`)

---

## 🚀 Quick Links

- **Cloudflare Pages Dashboard**: https://dash.cloudflare.com/b68132a02e46f8cc02bcf9c5745a72b9/pages/view/hartzell-hr-frontend
- **Add Custom Domain**: https://dash.cloudflare.com/b68132a02e46f8cc02bcf9c5745a72b9/pages/view/hartzell-hr-frontend/domains
- **Workers Routes**: https://dash.cloudflare.com/b68132a02e46f8cc02bcf9c5745a72b9/workers/overview
- **DNS Settings**: https://dash.cloudflare.com/b68132a02e46f8cc02bcf9c5745a72b9/hartzell.work/dns

---

## 📊 Current Deployment Status

| Component | URL | Status |
|-----------|-----|--------|
| Frontend (Pages) | f7f72fd4.hartzell-hr-frontend.pages.dev | ✅ Live |
| Backend (Workers) | hartzell.work/api/* (via routes) | ✅ Live |
| Custom Domain | hartzell.work | ⏳ Pending configuration |

---

## 🎯 Recommended Setup

**Best Practice**: Use subdomain for frontend

- **Frontend**: `https://app.hartzell.work/` or `https://portal.hartzell.work/`
- **Backend**: `https://hartzell.work/api/*`
- **Main Site**: `https://hartzell.work/` (can be marketing/landing page)

This keeps things organized and avoids routing conflicts.

---

**Ready to configure? Follow the steps above and you'll have hartzell.work live in minutes!**
