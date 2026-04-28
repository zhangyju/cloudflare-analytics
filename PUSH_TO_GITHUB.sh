#!/bin/bash

# Cloudflare Analytics Dashboard - GitHub Push Script
# This script will push your project to GitHub

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     Cloudflare Analytics Dashboard - GitHub Push Script        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if git is configured
if ! git config user.email &> /dev/null; then
    echo -e "${YELLOW}⚠️  Git user not configured globally${NC}"
    echo "Setting up git user..."
    git config user.name "Zhangyju"
    git config user.email "your-email@example.com"
fi

echo ""
echo -e "${YELLOW}Step 1: Verify current git status${NC}"
git status

echo ""
echo -e "${YELLOW}Step 2: Create GitHub repository${NC}"
echo -e "${BLUE}Please follow these steps:${NC}"
echo "1. Go to https://github.com/new"
echo "2. Repository name: cloudflare-analytics"
echo "3. Description: Cloudflare日志分析和性能监控仪表板"
echo "4. Choose Public or Private"
echo "5. DON'T initialize with README/license/gitignore"
echo ""
read -p "Press Enter once you've created the GitHub repository..."

echo ""
echo -e "${YELLOW}Step 3: Add remote origin${NC}"
git remote add origin https://github.com/Zhangyju/cloudflare-analytics.git 2>/dev/null || {
    echo -e "${BLUE}Remote already exists, skipping...${NC}"
}

echo ""
echo -e "${YELLOW}Step 4: Set main as default branch${NC}"
git branch -M main

echo ""
echo -e "${YELLOW}Step 5: Push to GitHub${NC}"
echo -e "${BLUE}Pushing code to GitHub...${NC}"
git push -u origin main

echo ""
echo -e "${GREEN}✅ Successfully pushed to GitHub!${NC}"
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 Your project is now on GitHub!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Visit: https://github.com/Zhangyju/cloudflare-analytics"
echo "2. Configure GitHub Actions (optional): See GITHUB_DEPLOYMENT.md"
echo "3. Deploy to Cloudflare (manual):"
echo "   wrangler publish --env production"
echo "   wrangler pages deploy dist/pages --project-name cf-analytics"
echo "4. Configure Logpush at:"
echo "   https://dash.cloudflare.com/?to=/:account/analytics/logpush"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo "  • GITHUB_DEPLOYMENT.md - GitHub setup guide"
echo "  • DEPLOYMENT.md - Full deployment guide"
echo "  • QUICK_START.md - Quick start guide"
echo ""
