#!/bin/bash

# Setup Monitoring and Alerts for CI/CD Pipeline
# This script helps configure monitoring and alerting

set -e

echo "🔔 CI/CD Monitoring and Alerts Setup"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}✗ GitHub CLI (gh) is not installed${NC}"
    echo "  Install it from: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}✗ Not authenticated with GitHub CLI${NC}"
    echo "  Run: gh auth login"
    exit 1
fi

REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
echo -e "${BLUE}Repository: $REPO${NC}"
echo ""

# Function to check if a secret exists
check_secret() {
    local secret_name=$1
    if gh secret list | grep -q "^$secret_name"; then
        return 0
    else
        return 1
    fi
}

# Main menu
show_menu() {
    echo ""
    echo "What would you like to configure?"
    echo ""
    echo "1) GitHub Actions Email Notifications"
    echo "2) Slack Integration"
    echo "3) Discord Integration"
    echo "4) Vercel Notifications"
    echo "5) Health Check Monitoring"
    echo "6) View Current Configuration"
    echo "7) Test Notifications"
    echo "8) Exit"
    echo ""
    read -p "Enter your choice (1-8): " choice
    
    case $choice in
        1) setup_github_email ;;
        2) setup_slack ;;
        3) setup_discord ;;
        4) setup_vercel ;;
        5) setup_health_check ;;
        6) view_configuration ;;
        7) test_notifications ;;
        8) exit 0 ;;
        *) echo -e "${RED}Invalid choice${NC}"; show_menu ;;
    esac
}

# Setup GitHub Email Notifications
setup_github_email() {
    echo ""
    echo "📧 GitHub Actions Email Notifications"
    echo "------------------------------------"
    echo ""
    echo "To configure email notifications:"
    echo "1. Go to: https://github.com/settings/notifications"
    echo "2. Scroll to 'Actions' section"
    echo "3. Enable:"
    echo "   ✅ Send notifications for failed workflows on branches you're watching"
    echo "   ✅ Send notifications for workflow runs you triggered"
    echo "4. Ensure your email is verified"
    echo "5. Watch this repository for Actions:"
    echo "   - Go to: https://github.com/$REPO"
    echo "   - Click 'Watch' → 'Custom' → Enable 'Actions'"
    echo ""
    read -p "Press Enter to open GitHub notification settings..."
    
    # Open browser to notification settings
    if command -v open &> /dev/null; then
        open "https://github.com/settings/notifications"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "https://github.com/settings/notifications"
    else
        echo "Please open: https://github.com/settings/notifications"
    fi
    
    echo ""
    read -p "Have you configured email notifications? (y/n): " configured
    if [ "$configured" = "y" ]; then
        echo -e "${GREEN}✓ Email notifications configured${NC}"
    fi
    
    show_menu
}

# Setup Slack Integration
setup_slack() {
    echo ""
    echo "💬 Slack Integration Setup"
    echo "-------------------------"
    echo ""
    
    if check_secret "SLACK_WEBHOOK_URL"; then
        echo -e "${GREEN}✓ SLACK_WEBHOOK_URL secret already exists${NC}"
        read -p "Do you want to update it? (y/n): " update
        if [ "$update" != "y" ]; then
            show_menu
            return
        fi
    fi
    
    echo "To set up Slack integration:"
    echo "1. Go to: https://api.slack.com/apps"
    echo "2. Create a new app (or use existing)"
    echo "3. Enable 'Incoming Webhooks'"
    echo "4. Add webhook to workspace"
    echo "5. Copy the webhook URL"
    echo ""
    read -p "Press Enter to open Slack API page..."
    
    if command -v open &> /dev/null; then
        open "https://api.slack.com/apps"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "https://api.slack.com/apps"
    fi
    
    echo ""
    read -p "Enter your Slack webhook URL (or press Enter to skip): " webhook_url
    
    if [ -n "$webhook_url" ]; then
        echo "$webhook_url" | gh secret set SLACK_WEBHOOK_URL
        echo -e "${GREEN}✓ SLACK_WEBHOOK_URL secret added${NC}"
        echo ""
        echo "Next steps:"
        echo "1. Update .github/workflows/ci.yml to add Slack notification steps"
        echo "2. Update .github/workflows/deploy.yml to add Slack notification steps"
        echo "3. See docs/CI_CD_ALERTS_SETUP.md for example configurations"
        echo ""
        read -p "Do you want to view the example configuration? (y/n): " view_example
        if [ "$view_example" = "y" ]; then
            if [ -f "docs/CI_CD_ALERTS_SETUP.md" ]; then
                less docs/CI_CD_ALERTS_SETUP.md
            else
                echo "Documentation file not found"
            fi
        fi
    else
        echo "Skipped Slack setup"
    fi
    
    show_menu
}

# Setup Discord Integration
setup_discord() {
    echo ""
    echo "💬 Discord Integration Setup"
    echo "---------------------------"
    echo ""
    
    if check_secret "DISCORD_WEBHOOK_URL"; then
        echo -e "${GREEN}✓ DISCORD_WEBHOOK_URL secret already exists${NC}"
        read -p "Do you want to update it? (y/n): " update
        if [ "$update" != "y" ]; then
            show_menu
            return
        fi
    fi
    
    echo "To set up Discord integration:"
    echo "1. Open your Discord server"
    echo "2. Go to channel settings (e.g., #deployments)"
    echo "3. Navigate to Integrations → Webhooks"
    echo "4. Click 'New Webhook'"
    echo "5. Name it 'GitHub Actions'"
    echo "6. Copy the webhook URL"
    echo ""
    read -p "Enter your Discord webhook URL (or press Enter to skip): " webhook_url
    
    if [ -n "$webhook_url" ]; then
        echo "$webhook_url" | gh secret set DISCORD_WEBHOOK_URL
        echo -e "${GREEN}✓ DISCORD_WEBHOOK_URL secret added${NC}"
        echo ""
        echo "Next steps:"
        echo "1. Update .github/workflows/ci.yml to add Discord notification steps"
        echo "2. Update .github/workflows/deploy.yml to add Discord notification steps"
        echo "3. See docs/CI_CD_ALERTS_SETUP.md for example configurations"
    else
        echo "Skipped Discord setup"
    fi
    
    show_menu
}

# Setup Vercel Notifications
setup_vercel() {
    echo ""
    echo "▲ Vercel Notifications Setup"
    echo "---------------------------"
    echo ""
    echo "To configure Vercel notifications:"
    echo ""
    echo "Email Notifications:"
    echo "1. Go to Vercel Dashboard → Your Project → Settings → Notifications"
    echo "2. Enable notifications for:"
    echo "   ✅ Deployment Started"
    echo "   ✅ Deployment Ready"
    echo "   ✅ Deployment Failed"
    echo ""
    echo "Slack Integration:"
    echo "1. Go to Vercel Dashboard → Settings → Integrations"
    echo "2. Search for 'Slack'"
    echo "3. Click 'Add Integration'"
    echo "4. Authorize and configure"
    echo ""
    read -p "Press Enter to open Vercel dashboard..."
    
    if command -v open &> /dev/null; then
        open "https://vercel.com/dashboard"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "https://vercel.com/dashboard"
    fi
    
    echo ""
    read -p "Have you configured Vercel notifications? (y/n): " configured
    if [ "$configured" = "y" ]; then
        echo -e "${GREEN}✓ Vercel notifications configured${NC}"
    fi
    
    show_menu
}

# Setup Health Check Monitoring
setup_health_check() {
    echo ""
    echo "🏥 Health Check Monitoring Setup"
    echo "-------------------------------"
    echo ""
    echo "Recommended uptime monitoring services:"
    echo ""
    echo "1. UptimeRobot (https://uptimerobot.com/) - Free tier available"
    echo "2. Pingdom (https://www.pingdom.com/)"
    echo "3. StatusCake (https://www.statuscake.com/)"
    echo "4. Better Uptime (https://betteruptime.com/)"
    echo ""
    echo "Configuration:"
    echo "- URL: https://ui-syncup.com/api/health"
    echo "- Interval: 5 minutes"
    echo "- Alert on: HTTP status != 200"
    echo ""
    read -p "Which service would you like to use? (1-4 or press Enter to skip): " service
    
    case $service in
        1)
            if command -v open &> /dev/null; then
                open "https://uptimerobot.com/"
            elif command -v xdg-open &> /dev/null; then
                xdg-open "https://uptimerobot.com/"
            fi
            ;;
        2)
            if command -v open &> /dev/null; then
                open "https://www.pingdom.com/"
            elif command -v xdg-open &> /dev/null; then
                xdg-open "https://www.pingdom.com/"
            fi
            ;;
        3)
            if command -v open &> /dev/null; then
                open "https://www.statuscake.com/"
            elif command -v xdg-open &> /dev/null; then
                xdg-open "https://www.statuscake.com/"
            fi
            ;;
        4)
            if command -v open &> /dev/null; then
                open "https://betteruptime.com/"
            elif command -v xdg-open &> /dev/null; then
                xdg-open "https://betteruptime.com/"
            fi
            ;;
        *)
            echo "Skipped health check monitoring setup"
            ;;
    esac
    
    show_menu
}

# View Current Configuration
view_configuration() {
    echo ""
    echo "📋 Current Monitoring Configuration"
    echo "===================================="
    echo ""
    
    echo "GitHub Secrets:"
    echo "---------------"
    if check_secret "SLACK_WEBHOOK_URL"; then
        echo -e "${GREEN}✓ SLACK_WEBHOOK_URL configured${NC}"
    else
        echo -e "${YELLOW}⚠ SLACK_WEBHOOK_URL not configured${NC}"
    fi
    
    if check_secret "DISCORD_WEBHOOK_URL"; then
        echo -e "${GREEN}✓ DISCORD_WEBHOOK_URL configured${NC}"
    else
        echo -e "${YELLOW}⚠ DISCORD_WEBHOOK_URL not configured${NC}"
    fi
    echo ""
    
    echo "Workflow Files:"
    echo "---------------"
    if [ -f ".github/workflows/ci.yml" ]; then
        echo -e "${GREEN}✓ CI workflow exists${NC}"
        if grep -q "slack" ".github/workflows/ci.yml"; then
            echo "  - Slack notifications: Configured"
        else
            echo "  - Slack notifications: Not configured"
        fi
        if grep -q "discord" ".github/workflows/ci.yml"; then
            echo "  - Discord notifications: Configured"
        else
            echo "  - Discord notifications: Not configured"
        fi
    else
        echo -e "${RED}✗ CI workflow not found${NC}"
    fi
    
    if [ -f ".github/workflows/deploy.yml" ]; then
        echo -e "${GREEN}✓ Deploy workflow exists${NC}"
        if grep -q "slack" ".github/workflows/deploy.yml"; then
            echo "  - Slack notifications: Configured"
        else
            echo "  - Slack notifications: Not configured"
        fi
        if grep -q "discord" ".github/workflows/deploy.yml"; then
            echo "  - Discord notifications: Configured"
        else
            echo "  - Discord notifications: Not configured"
        fi
    else
        echo -e "${RED}✗ Deploy workflow not found${NC}"
    fi
    echo ""
    
    echo "Documentation:"
    echo "--------------"
    if [ -f "docs/CI_CD_MONITORING.md" ]; then
        echo -e "${GREEN}✓ Monitoring guide exists${NC}"
    else
        echo -e "${YELLOW}⚠ Monitoring guide not found${NC}"
    fi
    
    if [ -f "docs/CI_CD_ALERTS_SETUP.md" ]; then
        echo -e "${GREEN}✓ Alerts setup guide exists${NC}"
    else
        echo -e "${YELLOW}⚠ Alerts setup guide not found${NC}"
    fi
    echo ""
    
    show_menu
}

# Test Notifications
test_notifications() {
    echo ""
    echo "🧪 Test Notifications"
    echo "--------------------"
    echo ""
    echo "This will trigger a test workflow to verify notifications."
    echo ""
    read -p "Do you want to proceed? (y/n): " proceed
    
    if [ "$proceed" != "y" ]; then
        show_menu
        return
    fi
    
    echo ""
    echo "Creating test branch..."
    git checkout -b test-notifications-$(date +%s) 2>/dev/null || true
    
    echo "Creating test commit..."
    git commit --allow-empty -m "test: trigger notification test"
    
    echo "Pushing to remote..."
    git push origin HEAD
    
    echo ""
    echo -e "${GREEN}✓ Test workflow triggered${NC}"
    echo ""
    echo "Check the following for notifications:"
    echo "1. Your email inbox"
    echo "2. Slack channel (if configured)"
    echo "3. Discord channel (if configured)"
    echo "4. GitHub Actions tab: https://github.com/$REPO/actions"
    echo ""
    read -p "Press Enter to view workflow runs..."
    
    gh run list --limit 5
    
    echo ""
    read -p "Do you want to clean up the test branch? (y/n): " cleanup
    if [ "$cleanup" = "y" ]; then
        git checkout develop 2>/dev/null || git checkout main 2>/dev/null || true
        git branch -D test-notifications-* 2>/dev/null || true
        echo -e "${GREEN}✓ Test branch cleaned up${NC}"
    fi
    
    show_menu
}

# Start the script
echo "This script will help you configure monitoring and alerts for your CI/CD pipeline."
echo ""
echo "Prerequisites:"
echo "- GitHub CLI (gh) installed and authenticated"
echo "- Repository access"
echo "- Admin access to configure integrations"
echo ""

show_menu
