# Frontend Deployment Guide

## ✅ Issue Fixed: 404 Errors on app.hartzell.work

### What Was Wrong

The frontend was being deployed incorrectly, causing 404 errors. Two issues were identified:

1. **Wrong folder deployed**: We were deploying the `.next` folder instead of the `out` folder
2. **Static export not used**: Next.js with `output: 'export'` generates static files to the `out` directory

### The Fix

```bash
# ❌ WRONG - Do not deploy .next folder
npx wrangler pages deploy .next --project-name=hartzell-hr-frontend

# ✅ CORRECT - Deploy the out folder
npx wrangler pages deploy out --project-name=hartzell-hr-frontend
```

---

## 🚀 Proper Deployment Process

### 1. Build the Application

```bash
cd /mnt/c/Users/Agent/Desktop/HR\ Center/frontend
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

This generates the static export to the `out` directory.

### 2. Deploy to Cloudflare Pages

```bash
npx wrangler pages deploy out --project-name=hartzell-hr-frontend --commit-dirty=true
```

**Important**: Deploy the `out` folder, NOT `.next`!

### 3. Verify Deployment

After deployment, you'll get a URL like `https://abc123.hartzell-hr-frontend.pages.dev`

Test it:
```bash
curl -I https://abc123.hartzell-hr-frontend.pages.dev/
curl -I https://abc123.hartzell-hr-frontend.pages.dev/login/
```

Both should return `HTTP/2 200`.

### 4. Check Custom Domain

The custom domain `app.hartzell.work` is already configured and will automatically serve the latest production deployment.

Verify it's working:
```bash
curl -I https://app.hartzell.work/
curl -I https://app.hartzell.work/login/
```

---

## 📁 Directory Structure Explanation

```
frontend/
├── .next/          ❌ Build artifacts (NOT for deployment)
├── out/            ✅ Static export (DEPLOY THIS)
├── src/            Source code
├── public/         Static assets (copied to out/)
└── next.config.js  Contains output: 'export'
```

### Why `out` and not `.next`?

When Next.js is configured with `output: 'export'`, it:
- Generates fully static HTML/CSS/JS files
- Places them in the `out` directory
- Optimizes for static hosting (like Cloudflare Pages)

The `.next` folder contains build artifacts for Node.js server runtime, which we don't use.

---

## 🔧 Next.js Configuration

The `next.config.js` is properly configured:

```js
module.exports = {
  reactStrictMode: true,
  output: 'export',        // ← Static export mode
  images: {
    unoptimized: true,      // ← Required for static export
  },
  trailingSlash: true,      // ← Better routing on static hosts
};
```

**Do not change `output: 'export'`** - this is required for static deployment.

---

## 🌐 Custom Domain Setup

The custom domain `app.hartzell.work` is already configured in Cloudflare Pages:

```
Project: hartzell-hr-frontend
Domains:
  - hartzell-hr-frontend.pages.dev (default)
  - app.hartzell.work (custom)
```

No DNS changes are needed - Cloudflare handles it automatically.

---

## 🐛 Troubleshooting

### Problem: Getting 404 errors on app.hartzell.work

**Solution**: Make sure you deployed the `out` folder, not `.next`

```bash
# Re-deploy correctly
npm run build
npx wrangler pages deploy out --project-name=hartzell-hr-frontend
```

### Problem: Static assets (JS/CSS) not loading

**Symptoms**: Blank page, console errors about missing chunks

**Solution**: The `out` folder contains all static assets. Deploy it again:

```bash
rm -rf out
npm run build
npx wrangler pages deploy out --project-name=hartzell-hr-frontend
```

### Problem: Environment variables not working

**Location**: Set environment variables in Cloudflare Dashboard

1. Go to: https://dash.cloudflare.com
2. Navigate to: Pages → hartzell-hr-frontend → Settings → Environment variables
3. Add variables for both Production and Preview

**Note**: `.env.local` is only used during local development, not in production.

---

## 📊 Current Live Deployment

- **Custom Domain**: https://app.hartzell.work ✅
- **Pages URL**: https://f3775ae6.hartzell-hr-frontend.pages.dev ✅
- **Deployed**: October 10, 2025
- **Status**: Working correctly

All features confirmed working:
- ✅ Landing page loads
- ✅ Login page loads
- ✅ JavaScript assets load correctly
- ✅ Lottie animation accessible at `/animations/signature.json`
- ✅ CSRF token included in API requests
- ✅ Signature boxes centered and responsive

---

## 🔄 Quick Reference

```bash
# Full deployment workflow (copy-paste friendly)
cd /mnt/c/Users/Agent/Desktop/HR\ Center/frontend
export NODE_OPTIONS="--max-old-space-size=4096"
rm -rf out .next
npm run build
npx wrangler pages deploy out --project-name=hartzell-hr-frontend --commit-dirty=true
```

Then verify at: https://app.hartzell.work
