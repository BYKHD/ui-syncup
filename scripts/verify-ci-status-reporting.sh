#!/bin/bash

# Verify CI/CD Status Reporting
# This script checks that workflow status reporting is configured correctly

set -e

echo "🔍 Verifying CI/CD Status Reporting Configuration"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}✗ GitHub CLI (gh) is not installed${NC}"
    echo "  Install it from: https://cli.github.com/"
    exit 1
fi
echo -e "${GREEN}✓ GitHub CLI is installed${NC}"

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}✗ Not authenticated with GitHub CLI${NC}"
    echo "  Run: gh auth login"
    exit 1
fi
echo -e "${GREEN}✓ Authenticated with GitHub CLI${NC}"
echo ""

# Get repository information
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
echo "Repository: $REPO"
echo ""

# Check workflow files exist
echo "📄 Checking Workflow Files"
echo "-------------------------"

if [ -f ".github/workflows/ci.yml" ]; then
    echo -e "${GREEN}✓ CI workflow file exists${NC}"
else
    echo -e "${RED}✗ CI workflow file not found${NC}"
    exit 1
fi

if [ -f ".github/workflows/deploy.yml" ]; then
    echo -e "${GREEN}✓ Deploy workflow file exists${NC}"
else
    echo -e "${RED}✗ Deploy workflow file not found${NC}"
    exit 1
fi
echo ""

# Validate workflow syntax
echo "🔧 Validating Workflow Syntax"
echo "----------------------------"

if gh workflow view "CI Quality Checks" &> /dev/null; then
    echo -e "${GREEN}✓ CI Quality Checks workflow is valid${NC}"
else
    echo -e "${RED}✗ CI Quality Checks workflow has syntax errors${NC}"
    exit 1
fi

if gh workflow view "Deploy" &> /dev/null; then
    echo -e "${GREEN}✓ Deploy workflow is valid${NC}"
else
    echo -e "${RED}✗ Deploy workflow has syntax errors${NC}"
    exit 1
fi
echo ""

# Check recent workflow runs
echo "📊 Checking Recent Workflow Runs"
echo "--------------------------------"

CI_RUNS=$(gh run list --workflow="CI Quality Checks" --limit 5 --json status,conclusion,createdAt,headBranch)
DEPLOY_RUNS=$(gh run list --workflow="Deploy" --limit 5 --json status,conclusion,createdAt,headBranch)

if [ -n "$CI_RUNS" ] && [ "$CI_RUNS" != "[]" ]; then
    echo -e "${GREEN}✓ CI Quality Checks workflow has run history${NC}"
    echo "  Recent runs:"
    echo "$CI_RUNS" | jq -r '.[] | "  - \(.createdAt | split("T")[0]) [\(.headBranch)]: \(.conclusion // .status)"' | head -3
else
    echo -e "${YELLOW}⚠ No CI Quality Checks workflow runs found${NC}"
    echo "  This is expected for new repositories"
fi
echo ""

if [ -n "$DEPLOY_RUNS" ] && [ "$DEPLOY_RUNS" != "[]" ]; then
    echo -e "${GREEN}✓ Deploy workflow has run history${NC}"
    echo "  Recent runs:"
    echo "$DEPLOY_RUNS" | jq -r '.[] | "  - \(.createdAt | split("T")[0]) [\(.headBranch)]: \(.conclusion // .status)"' | head -3
else
    echo -e "${YELLOW}⚠ No Deploy workflow runs found${NC}"
    echo "  This is expected for new repositories"
fi
echo ""

# Check branch protection
echo "🛡️  Checking Branch Protection"
echo "-----------------------------"

MAIN_PROTECTION=$(gh api repos/$REPO/branches/main/protection 2>/dev/null || echo "")

if [ -n "$MAIN_PROTECTION" ]; then
    echo -e "${GREEN}✓ Branch protection is enabled for main${NC}"
    
    # Check if status checks are required
    REQUIRED_CHECKS=$(echo "$MAIN_PROTECTION" | jq -r '.required_status_checks.contexts[]' 2>/dev/null || echo "")
    if [ -n "$REQUIRED_CHECKS" ]; then
        echo "  Required status checks:"
        echo "$REQUIRED_CHECKS" | while read -r check; do
            echo "    - $check"
        done
    else
        echo -e "${YELLOW}  ⚠ No required status checks configured${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Branch protection not enabled for main${NC}"
    echo "  Consider enabling it in: Settings → Branches"
fi
echo ""

# Check GitHub environments
echo "🌍 Checking GitHub Environments"
echo "------------------------------"

ENVIRONMENTS=$(gh api repos/$REPO/environments 2>/dev/null | jq -r '.environments[].name' || echo "")

if echo "$ENVIRONMENTS" | grep -q "Preview"; then
    echo -e "${GREEN}✓ Preview environment exists${NC}"
else
    echo -e "${YELLOW}⚠ Preview environment not found${NC}"
    echo "  Create it in: Settings → Environments → New environment"
fi

if echo "$ENVIRONMENTS" | grep -q "Production"; then
    echo -e "${GREEN}✓ Production environment exists${NC}"
else
    echo -e "${YELLOW}⚠ Production environment not found${NC}"
    echo "  Create it in: Settings → Environments → New environment"
fi
echo ""

# Check for recent commits with status checks
echo "✅ Checking Commit Status Checks"
echo "-------------------------------"

RECENT_COMMIT=$(gh api repos/$REPO/commits?per_page=1 | jq -r '.[0].sha')
if [ -n "$RECENT_COMMIT" ]; then
    echo "Most recent commit: ${RECENT_COMMIT:0:7}"
    
    COMMIT_STATUSES=$(gh api repos/$REPO/commits/$RECENT_COMMIT/status 2>/dev/null || echo "")
    if [ -n "$COMMIT_STATUSES" ]; then
        STATE=$(echo "$COMMIT_STATUSES" | jq -r '.state')
        TOTAL=$(echo "$COMMIT_STATUSES" | jq -r '.total_count')
        
        if [ "$TOTAL" -gt 0 ]; then
            echo -e "${GREEN}✓ Commit has $TOTAL status check(s)${NC}"
            echo "  Overall state: $STATE"
            echo "$COMMIT_STATUSES" | jq -r '.statuses[] | "  - \(.context): \(.state)"' | head -5
        else
            echo -e "${YELLOW}⚠ No status checks found on recent commit${NC}"
            echo "  Status checks will appear after workflows run"
        fi
    fi
fi
echo ""

# Check Actions permissions
echo "🔐 Checking Actions Permissions"
echo "------------------------------"

ACTIONS_PERMS=$(gh api repos/$REPO/actions/permissions 2>/dev/null || echo "")
if [ -n "$ACTIONS_PERMS" ]; then
    ENABLED=$(echo "$ACTIONS_PERMS" | jq -r '.enabled')
    if [ "$ENABLED" = "true" ]; then
        echo -e "${GREEN}✓ GitHub Actions is enabled${NC}"
    else
        echo -e "${RED}✗ GitHub Actions is disabled${NC}"
        echo "  Enable it in: Settings → Actions → General"
    fi
else
    echo -e "${YELLOW}⚠ Could not check Actions permissions${NC}"
fi
echo ""

# Summary
echo "📋 Summary"
echo "========="
echo ""
echo "Workflow Status Reporting Verification Complete!"
echo ""
echo "Next Steps:"
echo "1. Push code to a branch to trigger workflows"
echo "2. Create a pull request to verify status checks appear"
echo "3. Check that Vercel posts deployment comments (if integrated)"
echo "4. Review workflow logs in the Actions tab"
echo ""
echo "For detailed monitoring procedures, see: docs/CI_CD_MONITORING.md"
