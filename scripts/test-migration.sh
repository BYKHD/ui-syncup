#!/bin/bash

# =============================================================================
# Migration Testing Script
# =============================================================================
# This script helps you test database migrations safely before deploying
# It validates the migration and optionally applies it to your dev database
#
# Usage:
#   bash scripts/test-migration.sh                    # Interactive mode
#   bash scripts/test-migration.sh --auto-approve     # Auto-apply to dev DB
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║     Database Migration Testing Tool           ║"
echo "╔════════════════════════════════════════════════╗"
echo ""

# Check if running in development environment
if [ "$NODE_ENV" = "production" ]; then
  echo -e "${RED}❌ ERROR: Cannot run in production environment!${NC}"
  exit 1
fi

# Check for migration files
MIGRATION_DIR="drizzle"
LATEST_MIGRATION=$(ls -t $MIGRATION_DIR/*.sql 2>/dev/null | head -n 1)

if [ -z "$LATEST_MIGRATION" ]; then
  echo -e "${RED}❌ No migration files found in $MIGRATION_DIR/${NC}"
  echo "Run 'bun run db:generate' first to create a migration"
  exit 1
fi

echo -e "${BLUE}📁 Latest migration file:${NC}"
echo "   $LATEST_MIGRATION"
echo ""

# Display migration content
echo -e "${BLUE}📄 Migration SQL:${NC}"
echo "┌────────────────────────────────────────────────┐"
cat "$LATEST_MIGRATION" | sed 's/^/│ /'
echo "└────────────────────────────────────────────────┘"
echo ""

# Validate migration (basic checks)
echo -e "${YELLOW}🔍 Validating migration...${NC}"

VALIDATION_PASSED=true

# Check for dangerous operations
if grep -qi "DROP TABLE" "$LATEST_MIGRATION"; then
  echo -e "${RED}⚠️  WARNING: Migration contains DROP TABLE${NC}"
  VALIDATION_PASSED=false
fi

if grep -qi "DROP COLUMN" "$LATEST_MIGRATION"; then
  echo -e "${RED}⚠️  WARNING: Migration contains DROP COLUMN${NC}"
  VALIDATION_PASSED=false
fi

if grep -qi "TRUNCATE" "$LATEST_MIGRATION"; then
  echo -e "${RED}⚠️  WARNING: Migration contains TRUNCATE${NC}"
  VALIDATION_PASSED=false
fi

# Check for best practices
if ! grep -qi "IF EXISTS\|IF NOT EXISTS" "$LATEST_MIGRATION"; then
  echo -e "${YELLOW}💡 TIP: Consider using IF EXISTS/IF NOT EXISTS for safer migrations${NC}"
fi

if $VALIDATION_PASSED; then
  echo -e "${GREEN}✅ Basic validation passed${NC}"
else
  echo -e "${YELLOW}⚠️  Migration contains potentially dangerous operations${NC}"
fi
echo ""

# Check if dev database URL is set
if [ -z "$DIRECT_URL" ]; then
  echo -e "${YELLOW}⚠️  DIRECT_URL not set in environment${NC}"
  echo "Loading from .env.local..."

  if [ -f ".env.local" ]; then
    export $(grep DIRECT_URL .env.local | xargs)
  else
    echo -e "${RED}❌ .env.local not found${NC}"
    exit 1
  fi
fi

# Ask for confirmation (unless --auto-approve flag is set)
if [[ "$1" != "--auto-approve" ]]; then
  echo -e "${YELLOW}Do you want to apply this migration to your DEV database?${NC}"
  echo -e "${YELLOW}Database: ${DIRECT_URL:0:50}...${NC}"
  echo ""
  read -p "Apply migration? (y/N): " -n 1 -r
  echo ""

  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Migration not applied. Exiting.${NC}"
    exit 0
  fi
fi

# Apply migration
echo ""
echo -e "${BLUE}🚀 Applying migration to DEV database...${NC}"
echo ""

if bun run db:push; then
  echo ""
  echo -e "${GREEN}✅ Migration applied successfully!${NC}"
  echo ""
  echo -e "${BLUE}📊 Next steps:${NC}"
  echo "   1. Verify changes in Supabase Studio"
  echo "   2. Test your application locally"
  echo "   3. Commit migration file: git add drizzle/ && git commit -m 'feat: migration'"
  echo "   4. Push to develop: git push origin develop"
  echo ""
else
  echo ""
  echo -e "${RED}❌ Migration failed!${NC}"
  echo "Check the error messages above and fix any issues."
  exit 1
fi

# Offer to open Supabase Studio
echo -e "${YELLOW}Open Supabase Studio to verify changes? (y/N):${NC} "
read -p "" -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "Opening Supabase Studio..."
  open "https://supabase.com/dashboard/project/vgmarozegrghrpgopmbs/editor"
fi

echo ""
echo -e "${GREEN}Done! 🎉${NC}"
echo ""
