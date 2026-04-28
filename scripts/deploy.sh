#!/bin/bash

# Deployment script for Cloudflare Analytics
# Usage: bash scripts/deploy.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Cloudflare Analytics Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo -e "${GREEN}✅ Loaded .env configuration${NC}"
else
    echo -e "${RED}❌ .env file not found${NC}"
    echo "Please create .env file using .env.example as template"
    exit 1
fi

echo ""

# Step 1: Check dependencies
echo -e "${YELLOW}Step 1: Checking dependencies${NC}"
npm list &>/dev/null && echo -e "${GREEN}✅ Dependencies installed${NC}" || npm install

echo ""

# Step 2: Type checking
echo -e "${YELLOW}Step 2: Type checking${NC}"
npm run type-check

echo ""

# Step 3: Build
echo -e "${YELLOW}Step 3: Building project${NC}"
npm run build
echo -e "${GREEN}✅ Build completed${NC}"

echo ""

# Step 4: Deploy Workers
echo -e "${YELLOW}Step 4: Deploying Workers${NC}"
wrangler publish --env production
WORKERS_URL=$(wrangler deployments list 2>/dev/null | head -1 || echo "https://cf-analytics.workers.dev")
echo -e "${GREEN}✅ Workers deployed${NC}"
echo "Workers URL: $WORKERS_URL"

echo ""

# Step 5: Deploy Pages
echo -e "${YELLOW}Step 5: Deploying Pages${NC}"
wrangler pages deploy dist/pages --project-name="cf-analytics"
echo -e "${GREEN}✅ Pages deployed${NC}"

echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Visit https://dash.cloudflare.com to configure custom domain"
echo "2. Set up Logpush: https://dash.cloudflare.com/?to=/:account/analytics/logpush"
echo "3. Configure alert notifications"
echo ""
