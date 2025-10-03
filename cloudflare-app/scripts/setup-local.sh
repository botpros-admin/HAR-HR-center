#!/bin/bash
# Local development setup script

set -e

echo "🛠️  Hartzell HR Center - Local Development Setup"
echo "================================================"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create local D1 database
echo ""
echo "📊 Creating local D1 database..."
wrangler d1 execute hartzell_hr --local --file=./workers/schema.sql

# Create .dev.vars for local secrets
echo ""
echo "🔐 Creating .dev.vars for local development..."
cat > .dev.vars << EOF
BITRIX24_WEBHOOK_URL=https://hartzell.app/rest/1/jp689g5yfvre9pvd
BITRIX24_ENTITY_TYPE_ID=1054
OPENSIGN_API_TOKEN=test.keNN7hbRY40lf9z7GLzd9
OPENSIGN_ENV=sandbox
SESSION_SECRET=$(openssl rand -base64 32)
OPENSIGN_WEBHOOK_SECRET=$(openssl rand -base64 32)
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
SESSION_MAX_AGE=28800
RATE_LIMIT_MAX_ATTEMPTS=5
RATE_LIMIT_WINDOW=900
EOF

echo "✅ .dev.vars created"

echo ""
echo "✅ Local setup complete!"
echo ""
echo "📋 To start development server:"
echo "   npm run dev"
echo ""
echo "🌐 Server will be available at:"
echo "   http://localhost:8787"
