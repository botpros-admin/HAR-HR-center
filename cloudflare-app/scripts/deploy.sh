#!/bin/bash
# Deployment script for Hartzell HR Center

set -e

echo "🚀 Hartzell HR Center - Cloudflare Deployment"
echo "=============================================="
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

# Login check
echo "📝 Checking Cloudflare authentication..."
wrangler whoami || {
    echo "🔐 Please login to Cloudflare:"
    wrangler login
}

# Get account ID
ACCOUNT_ID=$(wrangler whoami | grep "Account ID" | awk '{print $3}')
echo "✅ Account ID: $ACCOUNT_ID"

# Step 1: Create D1 Database (if not exists)
echo ""
echo "📊 Step 1: Creating D1 Database..."
if wrangler d1 list | grep -q "hartzell_hr"; then
    echo "✅ Database 'hartzell_hr' already exists"
else
    echo "Creating database..."
    wrangler d1 create hartzell_hr
    echo ""
    echo "⚠️  IMPORTANT: Copy the database_id from above and update wrangler.toml"
    echo "Press Enter after updating wrangler.toml..."
    read
fi

# Step 2: Run migrations
echo ""
echo "📝 Step 2: Running database migrations..."
wrangler d1 execute hartzell_hr --file=./workers/schema.sql
echo "✅ Database schema created"

# Step 3: Create KV namespace (if not exists)
echo ""
echo "🗄️  Step 3: Creating KV namespace..."
if wrangler kv:namespace list | grep -q "CACHE"; then
    echo "✅ KV namespace 'CACHE' already exists"
else
    echo "Creating KV namespace..."
    wrangler kv:namespace create CACHE
    echo ""
    echo "⚠️  IMPORTANT: Copy the id from above and update wrangler.toml"
    echo "Press Enter after updating wrangler.toml..."
    read
fi

# Step 4: Set secrets
echo ""
echo "🔐 Step 4: Setting secrets..."
echo "Do you want to set/update secrets? (y/n)"
read -r SET_SECRETS

if [ "$SET_SECRETS" = "y" ]; then
    echo "Setting BITRIX24_WEBHOOK_URL..."
    echo "https://hartzell.app/rest/1/jp689g5yfvre9pvd" | wrangler secret put BITRIX24_WEBHOOK_URL

    echo "Setting OPENSIGN_API_TOKEN..."
    echo "test.keNN7hbRY40lf9z7GLzd9" | wrangler secret put OPENSIGN_API_TOKEN

    echo "Setting SESSION_SECRET (generating random)..."
    openssl rand -base64 32 | wrangler secret put SESSION_SECRET

    echo "Setting OPENSIGN_WEBHOOK_SECRET (generating random)..."
    openssl rand -base64 32 | wrangler secret put OPENSIGN_WEBHOOK_SECRET

    echo "Setting TURNSTILE_SECRET_KEY..."
    echo "Get your Turnstile secret from: https://dash.cloudflare.com/?to=/:account/turnstile"
    read -p "Enter Turnstile Secret Key: " TURNSTILE_KEY
    echo "$TURNSTILE_KEY" | wrangler secret put TURNSTILE_SECRET_KEY

    echo "✅ All secrets set"
fi

# Step 5: Deploy Workers
echo ""
echo "🚀 Step 5: Deploying Workers..."
wrangler deploy

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Configure DNS for hartzell.work to point to Workers"
echo "2. Enable Cloudflare Turnstile (CAPTCHA) in dashboard"
echo "3. Test authentication at https://hartzell.work"
echo ""
echo "Deployment URL will be shown above ⬆️"
