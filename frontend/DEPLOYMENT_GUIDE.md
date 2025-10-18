# 🚀 Hartzell HR Center - Official Deployment Guide

## ⚠️ CRITICAL: ONLY Use This Method

This is the **ONLY** deployment method that works correctly for this project.

**DO NOT:**
- ❌ Use `@cloudflare/next-on-pages` (uses Vercel CLI internally)
- ❌ Use `vercel` CLI or any Vercel tools
- ❌ Push to GitHub and use Git integration
- ❌ Use any other Cloudflare adapter tools

**DO:**
- ✅ Use the deployment script: `npm run deploy`
- ✅ Or manually follow the 3-step process below

---

## 📋 Deployment Methods

### Method 1: Automated Script (Recommended)

```bash
npm run deploy
```

This runs `deploy.sh` which handles everything automatically.

### Method 2: Quick Deploy

```bash
npm run deploy:quick
```

Same as Method 1 but inline command.

### Method 3: Manual (Step-by-Step)

```bash
# Step 1: Clean all caches
rm -rf .next out node_modules/.cache

# Step 2: Build Next.js app
npm run build

# Step 3: Deploy to Cloudflare Pages
npx wrangler pages deploy out --project-name=hartzell-hr-frontend --branch=main --commit-dirty=true
```

---

## 🔧 How It Works

1. **Clean Caches**: Removes `.next`, `out`, and `node_modules/.cache` to prevent stale builds
2. **Build**: `next build` creates a static export in the `out/` directory
3. **Deploy**: `wrangler pages deploy` uploads the `out/` directory directly to Cloudflare Pages

### Configuration Files

- `next.config.js`: Must have `output: 'export'` for static builds
- No `wrangler.toml` needed (using direct upload mode)
- No Git integration configured (direct upload to Cloudflare)

---

## 🌐 Live URLs

- **Production**: https://app.hartzell.work
- **Cloudflare Pages**: https://hartzell-hr-frontend.pages.dev

---

## 📝 Deployment Checklist

Before deploying:
- [ ] Test changes locally with `npm run dev`
- [ ] Verify build works with `npm run build`
- [ ] Check for TypeScript errors with `npm run type-check`
- [ ] Deploy with `npm run deploy`
- [ ] Hard refresh browser (Ctrl+Shift+R) to see changes

---

## 🚫 Why Other Methods Don't Work

### @cloudflare/next-on-pages
- Uses Vercel CLI internally (`vercel build`)
- Adds unnecessary complexity
- Not needed for static exports

### Vercel CLI
- Not using Vercel platform
- Cloudflare Pages only

### Git Integration
- Project uses "Direct Upload" mode
- No GitHub connection needed
- Changes deploy immediately without git commits

---

## 💡 Troubleshooting

### Changes not appearing on live site?
1. Hard refresh: **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)
2. Clear browser cache
3. Check deployment succeeded: `npx wrangler pages deployment list --project-name=hartzell-hr-frontend`

### Build caching issues?
Always run the full clean before building:
```bash
rm -rf .next out node_modules/.cache
npm run build
```

### Deployment failed?
Check Cloudflare credentials:
```bash
npx wrangler whoami
```

---

## 📦 Project Structure

```
frontend/
├── src/              # Source code
├── public/           # Static assets
├── out/              # Build output (generated)
├── .next/            # Next.js cache (generated)
├── deploy.sh         # Official deployment script
└── package.json      # npm scripts including "deploy"
```

---

## 🔐 Environment Setup

Required environment variables in Cloudflare Pages dashboard:
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` - Cloudflare Turnstile key
- Other Next.js public env vars

---

**Last Updated**: October 13, 2025
**Deployment Method**: Direct Upload via Wrangler CLI
**Platform**: Cloudflare Pages
