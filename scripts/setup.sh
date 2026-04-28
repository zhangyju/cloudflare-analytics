#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Cloudflare Analytics Setup Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ wrangler is not installed${NC}"
    echo "Please install it first:"
    echo "npm install -g wrangler"
    exit 1
fi

echo -e "${GREEN}✅ wrangler is installed${NC}"
echo ""

# Step 1: Get Cloudflare Account Information
echo -e "${YELLOW}Step 1: Cloudflare Authentication${NC}"
echo "Checking Cloudflare authentication..."

if wrangler whoami &> /dev/null; then
    ACCOUNT_ID=$(wrangler whoami 2>/dev/null | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)
    echo -e "${GREEN}✅ Authenticated with Cloudflare${NC}"
    echo "Account ID: $ACCOUNT_ID"
else
    echo -e "${YELLOW}⚠️  Not authenticated with Cloudflare${NC}"
    echo "Please run: wrangler login"
    exit 1
fi

echo ""

# Step 2: Create R2 Bucket
echo -e "${YELLOW}Step 2: Setting up R2 Storage${NC}"

R2_BUCKET_NAME="cf-logs"
echo "Creating R2 bucket: $R2_BUCKET_NAME"

if wrangler r2 bucket list | grep -q "cf-logs"; then
    echo -e "${GREEN}✅ R2 bucket 'cf-logs' already exists${NC}"
else
    echo "Creating R2 bucket..."
    wrangler r2 bucket create cf-logs
    echo -e "${GREEN}✅ R2 bucket created successfully${NC}"
fi

echo ""

# Step 3: Create KV Namespace
echo -e "${YELLOW}Step 3: Setting up KV Namespace${NC}"

echo "Creating KV namespace: CACHE"

# Get existing KV namespace ID if it exists
KV_RESULT=$(wrangler kv:namespace list 2>/dev/null | grep -A 1 "CACHE" | tail -1 | tr -d ' ' || echo "")

if [ ! -z "$KV_RESULT" ]; then
    KV_ID=$(echo "$KV_RESULT" | grep -oP '"id":"?\K[^"]*')
    echo -e "${GREEN}✅ KV namespace 'CACHE' already exists${NC}"
    echo "KV ID: $KV_ID"
else
    echo "Creating new KV namespace..."
    KV_RESPONSE=$(wrangler kv:namespace create CACHE --preview false 2>&1)
    KV_ID=$(echo "$KV_RESPONSE" | grep -oP 'id = "\K[^"]*' || echo "")
    
    if [ ! -z "$KV_ID" ]; then
        echo -e "${GREEN}✅ KV namespace created successfully${NC}"
        echo "KV ID: $KV_ID"
    else
        echo -e "${RED}❌ Failed to create KV namespace${NC}"
        echo "Please create it manually and update wrangler.toml"
    fi
fi

echo ""

# Step 4: Update wrangler.toml
echo -e "${YELLOW}Step 4: Updating configuration files${NC}"

if [ ! -z "$ACCOUNT_ID" ]; then
    # Update wrangler.toml with account_id
    if grep -q "account_id = " wrangler.toml; then
        sed -i '' "s/account_id = .*/account_id = \"$ACCOUNT_ID\"/" wrangler.toml
    else
        sed -i '' "1s/^/account_id = \"$ACCOUNT_ID\"\n/" wrangler.toml
    fi
    echo -e "${GREEN}✅ Updated account_id in wrangler.toml${NC}"
fi

if [ ! -z "$KV_ID" ]; then
    # Update wrangler.toml with KV ID
    sed -i '' "s/id = \"YOUR_KV_ID\"/id = \"$KV_ID\"/" wrangler.toml
    echo -e "${GREEN}✅ Updated KV ID in wrangler.toml${NC}"
fi

echo ""

# Step 5: Verify configuration
echo -e "${YELLOW}Step 5: Verifying configuration${NC}"

echo "Configuration Summary:"
echo "  Account ID: $ACCOUNT_ID"
echo "  R2 Bucket: cf-logs"
echo "  KV Namespace: CACHE"
echo "  KV ID: ${KV_ID:-pending}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Update .env file with your Cloudflare credentials"
echo "2. Run: npm run build"
echo "3. Run: npm run deploy"
echo ""
echo "For Logpush setup, visit:"
echo "https://dash.cloudflare.com/?to=/:account/analytics/logpush"
echo ""
