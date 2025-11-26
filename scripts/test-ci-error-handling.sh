#!/bin/bash
# Test CI/CD Error Handling
# This script helps test error handling in the GitHub Actions workflows
# 
# Requirements: 2.5, 3.5, 4.3, 5.4
# - 2.5: WHEN migrations fail on preview THEN the system SHALL halt deployment
# - 3.5: WHEN migrations fail on production THEN the system SHALL halt deployment
# - 4.3: WHEN a migration fails THEN the system SHALL capture the error message, exit with non-zero status
# - 5.4: WHEN environment secrets are missing THEN the system SHALL fail with clear error message

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}CI/CD Error Handling Test Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to print test step
print_step() {
    echo -e "${YELLOW}[STEP]${NC} $1"
}

# Function to print success
print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

# Function to print failure
print_failure() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# Function to print info
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_failure "Please run this script from the project root directory"
    exit 1
fi

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    print_failure "GitHub CLI (gh) is not installed. Please install it first."
    echo "  brew install gh  # macOS"
    echo "  See: https://cli.github.com/manual/installation"
    exit 1
fi

# Check if authenticated with GitHub
if ! gh auth status &> /dev/null; then
    print_failure "Not authenticated with GitHub. Please run: gh auth login"
    exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test 1: Failing Migration Error Handling${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

print_info "This test verifies that:"
print_info "  - Failing migrations halt the deployment workflow"
print_info "  - Error messages are clear and actionable"
print_info "  - The workflow exits with non-zero status code"
echo ""

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
TEST_BRANCH="test/ci-error-handling-$(date +%s)"

print_step "Creating test branch: $TEST_BRANCH"

# Create a test branch
git checkout -b "$TEST_BRANCH"

print_step "Creating a failing migration file..."

# Create a migration file with invalid SQL
MIGRATION_FILE="drizzle/9999_test_failing_migration.sql"
cat > "$MIGRATION_FILE" << 'EOF'
-- Test failing migration for CI/CD error handling verification
-- This migration intentionally contains invalid SQL to test error handling

-- Invalid SQL: referencing a non-existent table
ALTER TABLE "non_existent_table_xyz" ADD COLUMN "test_column" varchar(50);

-- This should cause the migration to fail with a clear error message
EOF

print_success "Created failing migration: $MIGRATION_FILE"

# Update the journal to include the new migration
print_step "Updating migration journal..."

# Read current journal and add new entry
JOURNAL_FILE="drizzle/meta/_journal.json"
TIMESTAMP=$(date +%s)000

# Use node to update the journal JSON
node -e "
const fs = require('fs');
const journal = JSON.parse(fs.readFileSync('$JOURNAL_FILE', 'utf8'));
journal.entries.push({
  idx: journal.entries.length,
  version: '7',
  when: $TIMESTAMP,
  tag: '9999_test_failing_migration',
  breakpoints: true
});
fs.writeFileSync('$JOURNAL_FILE', JSON.stringify(journal, null, 2));
console.log('Journal updated successfully');
"

print_success "Migration journal updated"

# Stage the changes
git add "$MIGRATION_FILE" "$JOURNAL_FILE"
git commit -m "test: add failing migration for CI/CD error handling test"

echo ""
print_step "Ready to push test branch to GitHub"
echo ""
print_info "The following will happen when you push:"
print_info "  1. GitHub Actions will trigger the deploy workflow"
print_info "  2. The migration will fail with an error about 'non_existent_table_xyz'"
print_info "  3. The workflow should exit with a non-zero status code"
print_info "  4. Vercel deployment should NOT proceed"
echo ""

read -p "Push to GitHub and trigger workflow? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_step "Pushing to GitHub..."
    git push origin "$TEST_BRANCH"
    
    echo ""
    print_success "Branch pushed to GitHub"
    echo ""
    print_info "Monitor the workflow at:"
    print_info "  https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/actions"
    echo ""
    print_info "Expected behavior:"
    print_info "  ✓ Workflow should fail at 'Run database migrations' step"
    print_info "  ✓ Error message should mention 'non_existent_table_xyz'"
    print_info "  ✓ Workflow status should be 'failure'"
    print_info "  ✓ No Vercel deployment should occur"
    echo ""
    
    # Wait for workflow to start
    print_step "Waiting for workflow to start..."
    sleep 10
    
    # Get the latest workflow run
    WORKFLOW_RUN=$(gh run list --branch "$TEST_BRANCH" --limit 1 --json databaseId,status,conclusion -q '.[0]')
    
    if [ -n "$WORKFLOW_RUN" ]; then
        RUN_ID=$(echo "$WORKFLOW_RUN" | jq -r '.databaseId')
        print_info "Workflow run ID: $RUN_ID"
        print_info "View at: https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/actions/runs/$RUN_ID"
        
        echo ""
        print_step "Waiting for workflow to complete (this may take a few minutes)..."
        
        # Wait for workflow to complete
        gh run watch "$RUN_ID" --exit-status || true
        
        # Get final status
        FINAL_STATUS=$(gh run view "$RUN_ID" --json conclusion -q '.conclusion')
        
        echo ""
        if [ "$FINAL_STATUS" == "failure" ]; then
            print_success "Workflow failed as expected!"
            print_success "Error handling is working correctly"
        else
            print_failure "Workflow did not fail as expected. Status: $FINAL_STATUS"
            print_info "Please check the workflow logs for details"
        fi
    else
        print_info "Could not find workflow run. Please check GitHub Actions manually."
    fi
else
    print_info "Skipping push. You can push manually with:"
    print_info "  git push origin $TEST_BRANCH"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Cleanup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

read -p "Clean up test branch and migration? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_step "Cleaning up..."
    
    # Switch back to original branch
    git checkout "$CURRENT_BRANCH"
    
    # Delete local test branch
    git branch -D "$TEST_BRANCH" 2>/dev/null || true
    
    # Delete remote test branch
    git push origin --delete "$TEST_BRANCH" 2>/dev/null || true
    
    print_success "Cleanup complete"
else
    print_info "Skipping cleanup. To clean up manually:"
    print_info "  git checkout $CURRENT_BRANCH"
    print_info "  git branch -D $TEST_BRANCH"
    print_info "  git push origin --delete $TEST_BRANCH"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
print_info "Error handling test completed."
print_info "Please verify the following in the GitHub Actions logs:"
echo ""
print_info "  ✓ Migration step failed with clear error message"
print_info "  ✓ Error mentions the invalid table name"
print_info "  ✓ Workflow exited with non-zero status"
print_info "  ✓ No deployment occurred after migration failure"
echo ""
