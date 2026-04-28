#!/bin/bash

# Cloudflare Analytics Dashboard - Logpush Setup Script
# This script guides you through configuring Logpush to collect HTTP request logs

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   Cloudflare Analytics - Logpush Configuration Helper          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Configuration
ACCOUNT_ID="e0914bbf92140660c12e968524e43a8a"
BUCKET_NAME="cf-logs"

echo -e "${YELLOW}Configuration Details:${NC}"
echo "  Account ID: $ACCOUNT_ID"
echo "  R2 Bucket: $BUCKET_NAME"
echo ""

# Check for API token
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo -e "${RED}ERROR: CLOUDFLARE_API_TOKEN not set${NC}"
    echo ""
    echo "Please set your Cloudflare API token:"
    echo "  export CLOUDFLARE_API_TOKEN='your_api_token_here'"
    exit 1
fi

echo -e "${GREEN}✓ API Token found${NC}"
echo ""

# Step 1: Verify R2 bucket exists
echo -e "${YELLOW}Step 1: Verifying R2 bucket...${NC}"
BUCKET_CHECK=$(curl -s "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/r2/buckets/$BUCKET_NAME" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq '.success')

if [ "$BUCKET_CHECK" = "true" ]; then
    echo -e "${GREEN}✓ R2 bucket '$BUCKET_NAME' exists${NC}"
else
    echo -e "${RED}✗ R2 bucket '$BUCKET_NAME' not found${NC}"
    exit 1
fi
echo ""

# Step 2: List existing Logpush jobs
echo -e "${YELLOW}Step 2: Checking existing Logpush jobs...${NC}"
JOBS=$(curl -s "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/logpush/jobs" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq '.result')

HTTP_REQUEST_JOB=$(echo "$JOBS" | jq '.[] | select(.dataset=="http_requests")' | jq '.id' 2>/dev/null || echo "")

if [ -z "$HTTP_REQUEST_JOB" ] || [ "$HTTP_REQUEST_JOB" = "null" ]; then
    echo -e "${YELLOW}✓ No existing HTTP request log job found${NC}"
else
    echo -e "${GREEN}✓ HTTP request log job already exists (ID: $HTTP_REQUEST_JOB)${NC}"
    echo ""
    echo -e "${YELLOW}Job details:${NC}"
    echo "$JOBS" | jq ".[] | select(.dataset==\"http_requests\")" | jq '.'
    exit 0
fi
echo ""

# Step 3: Explain manual setup
echo -e "${YELLOW}Step 3: Setting up Logpush (Manual Configuration Required)${NC}"
echo ""
echo -e "${BLUE}Unfortunately, creating Logpush jobs requires generating R2 credentials${NC}"
echo -e "${BLUE}via the Cloudflare Dashboard. Please follow these steps:${NC}"
echo ""

echo -e "${GREEN}1. Open your browser and go to:${NC}"
echo -e "   ${BLUE}https://dash.cloudflare.com/?to=/:account/analytics/logpush${NC}"
echo ""

echo -e "${GREEN}2. Click 'Create Logpush Job'${NC}"
echo ""

echo -e "${GREEN}3. Configure these settings:${NC}"
echo "   Dataset: HTTP Requests"
echo "   Frequency: Low (Hourly)"
echo "   Destination: R2"
echo "   Bucket: $BUCKET_NAME"
echo ""

echo -e "${GREEN}4. Select these log fields (minimum):${NC}"
echo "   ✓ Timestamp"
echo "   ✓ RayID"
echo "   ✓ Country"
echo "   ✓ EdgeResponseStatus"
echo "   ✓ OriginResponseStatus"
echo "   ✓ RequestHost"
echo "   ✓ RequestMethod"
echo "   ✓ RequestPath"
echo "   ✓ EdgeResponseTime"
echo "   ✓ OriginResponseTime"
echo "   ✓ CacheCacheStatus"
echo ""

echo -e "${GREEN}5. Click 'Enable' or 'Create Job'${NC}"
echo ""

echo -e "${YELLOW}Cloudflare will automatically:${NC}"
echo "  • Create R2 credentials for Logpush"
echo "  • Start collecting HTTP request logs hourly"
echo "  • Export logs to: $BUCKET_NAME/logs/YYYYMMDD/HH/"
echo ""

echo -e "${YELLOW}Timeline:${NC}"
echo "  • Setup takes: < 1 minute"
echo "  • First logs arrive: 1-2 hours"
echo "  • Dashboard updates: Automatically after logs arrive"
echo ""

echo -e "${GREEN}After completing the above steps:${NC}"
echo "  1. Wait 1-2 hours for logs to flow in"
echo "  2. Visit your dashboard:"
echo -e "     ${BLUE}https://86b1a7b3.cf-analytics.pages.dev${NC}"
echo "  3. Refresh the page and data should appear!"
echo ""

echo -e "${GREEN}To verify logs are arriving:${NC}"
echo "  1. Go to R2 in Cloudflare Dashboard"
echo "  2. Open $BUCKET_NAME bucket"
echo "  3. Look for /logs/YYYYMMDD/HH/ folders"
echo ""

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Need help?${NC}"
echo "  • See: LOGPUSH_SETUP.md for detailed instructions"
echo "  • Questions? Check: README.md or DEPLOYMENT.md"
echo ""

read -p "Press Enter to open Cloudflare Dashboard in your browser..."

# Try to open browser
if command -v open &> /dev/null; then
    open "https://dash.cloudflare.com/?to=/:account/analytics/logpush"
elif command -v xdg-open &> /dev/null; then
    xdg-open "https://dash.cloudflare.com/?to=/:account/analytics/logpush"
elif command -v start &> /dev/null; then
    start "https://dash.cloudflare.com/?to=/:account/analytics/logpush"
else
    echo -e "${YELLOW}Please manually visit:${NC}"
    echo "https://dash.cloudflare.com/?to=/:account/analytics/logpush"
fi

echo ""
echo -e "${GREEN}✓ Setup guide complete!${NC}"
echo ""
