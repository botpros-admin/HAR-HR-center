# Quick Deployment Guide

## ✅ Safe Deployment (RECOMMENDED)

```bash
cd frontend
npm run deploy
```

This command:
1. Builds the app
2. **Verifies responsive design is correct**
3. Deploys to Cloudflare Pages
4. **Blocks deployment if verification fails**

---

## ⚡ What to Check After Deployment

Open: `https://app.hartzell.work/admin/employees/detail/?id=58`

**Using Chrome DevTools:**
1. Press `F12`
2. Click device toolbar (📱 icon) or press `Ctrl+Shift+M`
3. Set to `iPhone 12 Pro` or any mobile device
4. **Expected**: All form fields show **1 per row** (single column)

**On Real Phone:**
- Open URL on your phone
- **Expected**: All fields are stacked vertically (not side-by-side)

---

## 🚨 If Something Goes Wrong

```bash
# Check what's deployed
npx wrangler pages deployment list --project-name=hartzell-hr-frontend

# Verify responsive classes in production
curl -s "https://app.hartzell.work/_next/static/chunks/app/admin/employees/detail/page-94ba048cdd21eb76.js" | grep "md:grid-cols-2"
```

If no results, the responsive design is missing → redeploy with `npm run deploy`

---

## 📋 Emergency Override

**ONLY IF** verification script has a false positive:

```bash
npm run deploy:force
```

⚠️ **This skips verification** - use with extreme caution!

---

## 🛠️ Troubleshooting

### Problem: "Verification failed"
**Solution**: Run verification manually to see what failed:
```bash
npm run verify:responsive
```

### Problem: "Build timeout"
**Solution**: The build is slow. Wait 3-5 minutes or increase timeout.

### Problem: "Mobile still shows 2 columns"
**Solution**:
1. Hard refresh browser (`Ctrl+Shift+R`)
2. Clear browser cache
3. Open in incognito/private window
4. Wait 2-3 minutes for Cloudflare cache to update

---

## 📚 Full Documentation

See `DEPLOYMENT_SAFEGUARDS.md` for complete details.
