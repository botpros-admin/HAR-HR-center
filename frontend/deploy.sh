#!/bin/bash

# HARTZELL HR CENTER - OFFICIAL DEPLOYMENT SCRIPT
# This is the ONLY method that works for deploying to Cloudflare Pages
# DO NOT use any other deployment method

set -e  # Exit on error

echo "🚀 Starting Hartzell HR Center Deployment..."
echo ""

# Step 1: Clean all build caches
echo "🧹 Step 1/3: Cleaning build caches..."
rm -rf .next out node_modules/.cache
echo "✅ Caches cleaned"
echo ""

# Step 2: Build Next.js app (static export)
echo "🔨 Step 2/3: Building Next.js application..."
npm run build
echo "✅ Build complete"
echo ""

# Step 3: Deploy to Cloudflare Pages
echo "☁️  Step 3/3: Deploying to Cloudflare Pages..."
npx wrangler pages deploy out --project-name=hartzell-hr-frontend --branch=main --commit-dirty=true
echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Your site is live at: https://app.hartzell.work"
echo ""
