#!/usr/bin/env bash
# =============================================================================
# UI SyncUp — Quick-start installer
# =============================================================================
#
# Usage:
#   bash install.sh
#   curl -fsSL https://raw.githubusercontent.com/BYKHD/ui-syncup/main/install.sh | bash
#
# What it does:
#   1. Checks that bun is installed (installs it automatically if not found)
#   2. Runs `bunx ui-syncup init` to set up your UI SyncUp instance
#
# =============================================================================

set -euo pipefail

main() {
  local RED='\033[0;31m'
  local GREEN='\033[0;32m'
  local YELLOW='\033[0;33m'
  local BLUE='\033[0;34m'
  local BOLD='\033[1m'
  local NC='\033[0m'

  echo -e "${BLUE}${BOLD}UI SyncUp — Quick-start installer${NC}"
  echo ""

  # ---------------------------------------------------------------------------
  # Check / install bun
  # ---------------------------------------------------------------------------
  if ! command -v bun &>/dev/null; then
    echo -e "${YELLOW}bun not found — installing...${NC}"
    curl -fsSL https://bun.sh/install | bash

    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"

    # Persist to shell rc
    local RC_FILE=""
    case "${SHELL:-}" in
      */zsh)  RC_FILE="$HOME/.zshrc" ;;
      */bash) RC_FILE="$HOME/.bashrc" ;;
      *)      RC_FILE="$HOME/.profile" ;;
    esac
    if [[ -n "$RC_FILE" ]] && ! grep -qF 'BUN_INSTALL' "$RC_FILE" 2>/dev/null; then
      printf '\nexport BUN_INSTALL="$HOME/.bun"\nexport PATH="$BUN_INSTALL/bin:$PATH"\n' >> "$RC_FILE"
      echo -e "${GREEN}✔ Added bun to PATH in $RC_FILE${NC}"
    fi

    echo -e "${GREEN}✔ bun installed${NC}"
  else
    echo -e "${GREEN}✔ bun $(bun --version)${NC}"
  fi

  # ---------------------------------------------------------------------------
  # Check Docker (non-fatal warning)
  # ---------------------------------------------------------------------------
  if ! docker info &>/dev/null 2>&1; then
    echo -e "${YELLOW}⚠  Docker does not appear to be running. Start Docker before running 'bunx ui-syncup up'.${NC}"
    echo ""
  fi

  # ---------------------------------------------------------------------------
  # Run init
  # ---------------------------------------------------------------------------
  echo -e "${BLUE}Running bunx ui-syncup init...${NC}"
  echo ""

  if [ -t 0 ]; then
    bunx ui-syncup init
  elif [ -c /dev/tty ]; then
    bunx ui-syncup init < /dev/tty
  else
    echo -e "${YELLOW}⚠  No interactive terminal available.${NC}"
    echo "Run manually: bunx ui-syncup init"
  fi
}

main "$@"
