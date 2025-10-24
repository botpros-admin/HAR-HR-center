#!/bin/bash

###############################################################################
# Cloudflare Infrastructure Quick Start for New AI Agent
# Account: agent@botpros.ai (b68132a02e46f8cc02bcf9c5745a72b9)
# Created: October 24, 2025
###############################################################################

set -e  # Exit on error

echo "=================================================="
echo "🤖 Cloudflare Infrastructure Quick Start"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Base directory
BASE_DIR="/mnt/c/Users/Agent/Desktop/HR Center"

echo -e "${BLUE}📍 Working Directory:${NC}"
echo "   $BASE_DIR"
echo ""

# Step 1: Check Wrangler Authentication
echo -e "${BLUE}🔐 Step 1: Checking Wrangler Authentication${NC}"
cd "$BASE_DIR/cloudflare-app"

if wrangler whoami &> /dev/null; then
    echo -e "${GREEN}✓${NC} Authenticated as: $(wrangler whoami | grep 'email' | head -1)"
else
    echo -e "${RED}✗${NC} Not authenticated to Cloudflare"
    echo ""
    echo "Run: wrangler login"
    exit 1
fi
echo ""

# Step 2: List Infrastructure
echo -e "${BLUE}🏗️ Step 2: Infrastructure Inventory${NC}"

echo -e "${YELLOW}Workers:${NC}"
wrangler deployments list 2>&1 | head -8 || echo "  (No recent deployments)"
echo ""

echo -e "${YELLOW}D1 Databases:${NC}"
wrangler d1 list 2>&1 | grep -E "hartzell_hr_prod|UUID" | head -2 || echo "  (No databases)"
echo ""

echo -e "${YELLOW}KV Namespaces:${NC}"
wrangler kv namespace list 2>&1 | grep -E "production-CACHE|id" | head -2 || echo "  (No namespaces)"
echo ""

echo -e "${YELLOW}R2 Buckets:${NC}"
wrangler r2 bucket list 2>&1 | grep -E "hartzell-assets-prod|hartzell-hr-templates-prod" || echo "  (No buckets)"
echo ""

echo -e "${YELLOW}Pages Projects:${NC}"
wrangler pages project list 2>&1 | grep -E "hartzell-hr-frontend|Project Name" || echo "  (No projects)"
echo ""

# Step 3: Check Secrets
echo -e "${BLUE}🔑 Step 3: Verifying Secrets${NC}"
SECRET_COUNT=$(wrangler secret list 2>&1 | jq '. | length' 2>/dev/null || echo "0")
echo "   Found $SECRET_COUNT secrets configured"

if [ "$SECRET_COUNT" -ge 5 ]; then
    echo -e "${GREEN}✓${NC} All required secrets present"
else
    echo -e "${YELLOW}⚠${NC} Expected 5 secrets, found $SECRET_COUNT"
    echo "   Run: wrangler secret list"
fi
echo ""

# Step 4: Test Deployments
echo -e "${BLUE}🚀 Step 4: Testing Deployment Capability${NC}"

echo "   Testing backend dry-run..."
if wrangler deploy --dry-run &> /dev/null; then
    echo -e "${GREEN}✓${NC} Backend deployment ready"
else
    echo -e "${RED}✗${NC} Backend deployment check failed"
fi

echo "   Checking frontend build..."
cd "$BASE_DIR/frontend"
if [ -f "package.json" ]; then
    echo -e "${GREEN}✓${NC} Frontend package.json found"
else
    echo -e "${RED}✗${NC} Frontend package.json missing"
fi
echo ""

# Step 5: Check Production URLs
echo -e "${BLUE}🌐 Step 5: Verifying Production URLs${NC}"

echo "   Checking backend API..."
if curl -s -I https://hartzell.work/api/health | grep -q "200\|401"; then
    echo -e "${GREEN}✓${NC} Backend API responding (https://hartzell.work/api/*)"
else
    echo -e "${RED}✗${NC} Backend API not responding"
fi

echo "   Checking frontend..."
if curl -s -I https://app.hartzell.work | grep -q "200"; then
    echo -e "${GREEN}✓${NC} Frontend responding (https://app.hartzell.work)"
else
    echo -e "${RED}✗${NC} Frontend not responding"
fi
echo ""

# Step 6: Usage Stats
echo -e "${BLUE}📊 Step 6: Resource Usage${NC}"

cd "$BASE_DIR/cloudflare-app"

echo "   D1 Database Size:"
wrangler d1 list 2>&1 | grep "hartzell_hr_prod" | awk '{print "     " $0}' || echo "     N/A"

echo ""
echo "   KV Keys (production):"
KV_KEYS=$(wrangler kv key list --namespace-id=54f7714316b14265a8224c255d9a7f80 2>&1 | jq '. | length' 2>/dev/null || echo "0")
echo "     Total keys: $KV_KEYS"

echo ""
echo "   R2 Objects:"
echo "     Assets: $(wrangler r2 object list hartzell-assets-prod 2>&1 | wc -l) files"
echo "     Templates: $(wrangler r2 object list hartzell-hr-templates-prod 2>&1 | wc -l) files"
echo ""

# Step 7: Recent Changes
echo -e "${BLUE}📝 Step 7: Recent Changes${NC}"
echo "   Last deployment:"
wrangler deployments list 2>&1 | grep -A 1 "Created:" | head -2 || echo "     (No recent deployments)"
echo ""

# Summary
echo "=================================================="
echo -e "${GREEN}✅ Quick Start Complete!${NC}"
echo "=================================================="
echo ""
echo "📚 Next Steps:"
echo "   1. Read: CLOUDFLARE_TAKEOVER_GUIDE.md"
echo "   2. Review: SECRETS_REFERENCE.md"
echo "   3. Test deploy backend: cd cloudflare-app && wrangler deploy"
echo "   4. Test deploy frontend: cd frontend && npm run deploy"
echo ""
echo "🔗 Useful Links:"
echo "   Dashboard: https://dash.cloudflare.com/b68132a02e46f8cc02bcf9c5745a72b9"
echo "   Backend API: https://hartzell.work/api/*"
echo "   Frontend: https://app.hartzell.work"
echo ""
echo "💡 For help, check the documentation or run:"
echo "   wrangler --help"
echo ""
