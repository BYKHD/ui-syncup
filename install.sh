#!/usr/bin/env bash
# =============================================================================
# UI SyncUp Installer
# =============================================================================
#
# Security model:
#   - Fetched over HTTPS only (enforced by curl -fsSL)
#   - The `main "$@"` wrapper at the bottom prevents execution of a partially
#     downloaded script (a curl|bash safety pattern)
#   - This script clones the repo, installs dependencies, and optionally runs
#     `bunx ui-syncup init` to configure the project
#   - Override the repo with UI_SYNCUP_REPO=https://... for forks
#
# Usage:
#   bash install.sh [OPTIONS] [VERSION]
#
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Resolve the latest published GitHub release tag.
# Returns empty string if the GitHub API is unreachable or rate-limited.
# ---------------------------------------------------------------------------
resolve_latest_version() {
  local latest
  latest=$(curl -fsSL "https://api.github.com/repos/BYKHD/ui-syncup/releases/latest" \
    2>/dev/null | grep '"tag_name"' | cut -d'"' -f4)
  echo "${latest:-}"
}

# ---------------------------------------------------------------------------
# Main — wraps everything so a partial download can't execute stray code
# ---------------------------------------------------------------------------
main() {
  # Colors
  local RED='\033[0;31m'
  local GREEN='\033[0;32m'
  local YELLOW='\033[0;33m'
  local BLUE='\033[0;34m'
  local BOLD='\033[1m'
  local NC='\033[0m'

  # -------------------------------------------------------------------------
  # show_help
  # -------------------------------------------------------------------------
  show_help() {
    cat <<EOF

${BOLD}UI SyncUp Installer${NC}

USAGE
  bash install.sh [OPTIONS] [VERSION]

OPTIONS
  -h, --help            Show this help and exit
  --here                Install into the current directory (must be empty)
  --upgrade             Pull latest changes in an existing ui-syncup/ dir
  --skip-bun            Skip bun presence check (you manage bun yourself)
  --install-bun         Auto-install bun without prompting
  --non-interactive     Skip 'bunx ui-syncup init' (useful in CI)
  --log-file <path>     Tee all output to a log file

VERSION
  Optional git tag or branch to install (default: latest release).
  Example: bash install.sh v0.2.2

ENVIRONMENT VARIABLES
  UI_SYNCUP_REPO        Override the repository URL (for forks)
                        Must start with https://
  CI                    Set to any non-empty value to enable non-interactive mode

EXAMPLES
  # Install latest release
  bash install.sh

  # Install a specific version into the current directory
  bash install.sh --here v0.2.2

  # Upgrade an existing installation
  bash install.sh --upgrade

  # CI/automation usage
  CI=1 bash install.sh --here

EOF
  }

  # -------------------------------------------------------------------------
  # cleanup — called by trap on ERR / EXIT
  # -------------------------------------------------------------------------
  local CLEANUP_DIR=""
  cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ] && [ -n "$CLEANUP_DIR" ] && [ -d "$CLEANUP_DIR" ]; then
      echo -e "${YELLOW}⚠️  Cleaning up partial clone at '$CLEANUP_DIR'...${NC}" >&2
      rm -rf "$CLEANUP_DIR"
    fi
  }
  trap cleanup ERR EXIT

  # -------------------------------------------------------------------------
  # Argument parsing
  # -------------------------------------------------------------------------
  local USE_HERE=false
  local DO_UPGRADE=false
  local SKIP_BUN=false
  local INSTALL_BUN=false
  local NON_INTERACTIVE=false
  local LOG_FILE=""
  local VERSION=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      -h|--help)
        show_help
        exit 0
        ;;
      --here)
        USE_HERE=true
        shift
        ;;
      --upgrade)
        DO_UPGRADE=true
        shift
        ;;
      --skip-bun)
        SKIP_BUN=true
        shift
        ;;
      --install-bun)
        INSTALL_BUN=true
        shift
        ;;
      --non-interactive)
        NON_INTERACTIVE=true
        shift
        ;;
      --log-file)
        if [[ -z "${2:-}" ]]; then
          echo -e "${RED}❌ --log-file requires a path argument.${NC}" >&2
          exit 1
        fi
        LOG_FILE="$2"
        shift 2
        ;;
      --*)
        echo -e "${RED}❌ Unknown flag: $1${NC}" >&2
        echo "Run 'bash install.sh --help' for usage." >&2
        exit 1
        ;;
      *)
        if [[ -n "$VERSION" ]]; then
          echo -e "${RED}❌ Unexpected argument: $1${NC}" >&2
          echo "Run 'bash install.sh --help' for usage." >&2
          exit 1
        fi
        VERSION="$1"
        shift
        ;;
    esac
  done

  # Honour CI env var as non-interactive
  if [[ -n "${CI:-}" ]]; then
    NON_INTERACTIVE=true
  fi

  # Tee to log file if requested
  if [[ -n "$LOG_FILE" ]]; then
    exec > >(tee -a "$LOG_FILE") 2>&1
  fi

  # -------------------------------------------------------------------------
  # Version validation
  # -------------------------------------------------------------------------
  if [[ -n "$VERSION" ]]; then
    if [[ ! "$VERSION" =~ ^[a-zA-Z0-9._-]+$ ]]; then
      echo -e "${RED}❌ Invalid version string: '$VERSION'${NC}" >&2
      echo "Version must match [a-zA-Z0-9._-]+" >&2
      exit 1
    fi
  fi

  # -------------------------------------------------------------------------
  # REPO_URL validation
  # -------------------------------------------------------------------------
  local REPO_URL="${UI_SYNCUP_REPO:-https://github.com/BYKHD/ui-syncup.git}"
  if [[ "$REPO_URL" != https://* ]]; then
    echo -e "${RED}❌ UI_SYNCUP_REPO must start with 'https://'. Got: $REPO_URL${NC}" >&2
    exit 1
  fi

  echo -e "${BLUE}${BOLD}🚀 Starting UI SyncUp installation...${NC}"

  # -------------------------------------------------------------------------
  # --upgrade path
  # -------------------------------------------------------------------------
  if $DO_UPGRADE; then
    local UPGRADE_DIR="ui-syncup"
    if [[ ! -d "$UPGRADE_DIR/.git" ]]; then
      echo -e "${RED}❌ No existing 'ui-syncup' git repository found in the current directory.${NC}" >&2
      echo "Run without --upgrade to perform a fresh install." >&2
      exit 1
    fi
    echo -e "${BLUE}🔄 Upgrading existing installation in '$UPGRADE_DIR'...${NC}"
    local OLD_VERSION
    OLD_VERSION=$(git -C "$UPGRADE_DIR" describe --tags --always 2>/dev/null || echo "unknown")
    if ! git -C "$UPGRADE_DIR" pull --ff-only; then
      echo -e "${RED}❌ 'git pull --ff-only' failed. Resolve diverging history manually.${NC}" >&2
      exit 1
    fi
    local NEW_VERSION
    NEW_VERSION=$(git -C "$UPGRADE_DIR" describe --tags --always 2>/dev/null || echo "unknown")
    (cd "$UPGRADE_DIR" && bun install)
    echo ""
    echo -e "${GREEN}${BOLD}✅ Upgrade complete!${NC}"
    echo -e "  ${BOLD}Previous version:${NC} $OLD_VERSION"
    echo -e "  ${BOLD}Current version: ${NC} $NEW_VERSION"
    echo ""
    echo -e "To start: ${BLUE}cd $UPGRADE_DIR && bunx ui-syncup up${NC}"
    return 0
  fi

  # -------------------------------------------------------------------------
  # Dependency checks
  # -------------------------------------------------------------------------

  # git
  if ! command -v git &>/dev/null; then
    echo -e "${RED}❌ git is required but not installed.${NC}" >&2
    exit 1
  fi

  # bun
  if ! $SKIP_BUN; then
    if ! command -v bun &>/dev/null; then
      if $INSTALL_BUN; then
        echo -e "${YELLOW}⚠️  bun not found — installing bun automatically (--install-bun)...${NC}"
        curl -fsSL https://bun.sh/install | bash
        export BUN_INSTALL="$HOME/.bun"
        export PATH="$BUN_INSTALL/bin:$PATH"

        # Persist to the user's shell rc file
        local RC_FILE=""
        case "${SHELL:-}" in
          */zsh)  RC_FILE="$HOME/.zshrc" ;;
          */bash) RC_FILE="$HOME/.bashrc" ;;
          *)      RC_FILE="$HOME/.profile" ;;
        esac
        if [[ -n "$RC_FILE" ]]; then
          local BUN_PATH_SNIPPET='export BUN_INSTALL="$HOME/.bun"; export PATH="$BUN_INSTALL/bin:$PATH"'
          if ! grep -qF 'BUN_INSTALL' "$RC_FILE" 2>/dev/null; then
            echo "" >> "$RC_FILE"
            echo "# Added by UI SyncUp installer" >> "$RC_FILE"
            echo "$BUN_PATH_SNIPPET" >> "$RC_FILE"
            echo -e "${GREEN}✔ Added bun to PATH in $RC_FILE${NC}"
          fi
        fi
      else
        echo -e "${RED}❌ bun is not installed.${NC}" >&2
        echo "" >&2
        echo "To install bun automatically, re-run with --install-bun:" >&2
        echo "  bash install.sh --install-bun" >&2
        echo "" >&2
        echo "Or install bun manually first: https://bun.sh/docs/installation" >&2
        exit 1
      fi
    else
      # bun exists — check minimum version (>= 1.0)
      local BUN_VERSION
      BUN_VERSION=$(bun --version 2>/dev/null | head -1)
      local BUN_MAJOR
      BUN_MAJOR=$(echo "$BUN_VERSION" | cut -d. -f1)
      if [[ -n "$BUN_MAJOR" ]] && [[ "$BUN_MAJOR" =~ ^[0-9]+$ ]] && (( BUN_MAJOR < 1 )); then
        echo -e "${YELLOW}⚠️  bun version $BUN_VERSION detected. UI SyncUp requires bun >= 1.0.${NC}"
        echo "    Upgrade: bun upgrade" >&2
      fi
    fi
  fi

  # Docker (non-fatal warning)
  if ! docker info &>/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Docker does not appear to be running or installed.${NC}"
    echo "    Docker is required by 'bunx ui-syncup up'. Start Docker before running the stack."
    echo ""
  fi

  # -------------------------------------------------------------------------
  # Resolve version
  # -------------------------------------------------------------------------
  if [[ -z "$VERSION" ]]; then
    echo -e "${BLUE}🔍 Resolving latest release...${NC}"
    VERSION=$(resolve_latest_version)
    if [[ -z "$VERSION" ]]; then
      echo -e "${YELLOW}⚠️  Could not fetch latest release from GitHub API (rate limited?).${NC}"
      echo "    Falling back to 'main'. To pin a version, pass it explicitly:"
      echo "      bash install.sh v0.2.2"
      VERSION="main"
    fi
  fi

  # -------------------------------------------------------------------------
  # Determine install directory
  # -------------------------------------------------------------------------
  local INSTALL_DIR

  if $USE_HERE; then
    INSTALL_DIR="."
    # POSIX-portable non-empty check (avoids ls -A BSD/GNU differences)
    if [ -n "$(find . -maxdepth 1 ! -name . | head -1)" ]; then
      echo -e "${RED}❌ Current directory is not empty. Run this from an empty directory.${NC}" >&2
      exit 1
    fi
    echo -e "${BLUE}📦 Cloning into current directory (version: ${BOLD}$VERSION${NC}${BLUE})...${NC}"
  else
    INSTALL_DIR="ui-syncup"
    if [ -d "$INSTALL_DIR" ]; then
      echo -e "${RED}❌ Directory '$INSTALL_DIR' already exists.${NC}" >&2
      echo "Remove it, or use --upgrade to update an existing installation." >&2
      exit 1
    fi
    echo -e "${BLUE}📦 Cloning into $INSTALL_DIR (version: ${BOLD}$VERSION${NC}${BLUE})...${NC}"
  fi

  # -------------------------------------------------------------------------
  # Clone
  # -------------------------------------------------------------------------
  # Mark dir for cleanup only after we start (so cleanup() knows what to remove)
  if ! $USE_HERE; then
    CLEANUP_DIR="$INSTALL_DIR"
  fi

  if ! git clone --branch "$VERSION" "$REPO_URL" "$INSTALL_DIR"; then
    echo -e "${RED}❌ Failed to clone version '$VERSION'. Make sure the tag or branch exists.${NC}" >&2
    exit 1
  fi

  # Integrity check: verify package.json is present
  if [[ ! -f "$INSTALL_DIR/package.json" ]]; then
    echo -e "${RED}❌ Clone appears incomplete — package.json not found in '$INSTALL_DIR'.${NC}" >&2
    exit 1
  fi

  # Clone succeeded — don't auto-clean on EXIT 0
  CLEANUP_DIR=""

  if ! $USE_HERE; then
    cd "$INSTALL_DIR"
  fi

  # -------------------------------------------------------------------------
  # Install dependencies
  # -------------------------------------------------------------------------
  echo -e "${BLUE}📥 Installing dependencies...${NC}"
  bun install

  # -------------------------------------------------------------------------
  # Init
  # -------------------------------------------------------------------------
  if $NON_INTERACTIVE; then
    echo -e "${YELLOW}⚠️  Non-interactive mode — skipping 'bunx ui-syncup init'.${NC}"
    echo "    Run it manually when ready:  bunx ui-syncup init"
  else
    echo -e "${BLUE}⚙️  Initializing project...${NC}"
    if [ -t 0 ]; then
      bunx ui-syncup init
    elif [ -c /dev/tty ]; then
      bunx ui-syncup init < /dev/tty
    else
      echo -e "${YELLOW}⚠️  Cannot open /dev/tty for interactive prompts.${NC}"
      echo "    Run 'bunx ui-syncup init' manually to complete setup."
    fi
  fi

  # -------------------------------------------------------------------------
  # Summary
  # -------------------------------------------------------------------------
  local FINAL_BUN_VER
  FINAL_BUN_VER=$(bun --version 2>/dev/null | head -1 || echo "unavailable")
  local FINAL_DIR
  if $USE_HERE; then
    FINAL_DIR="$(pwd)"
  else
    FINAL_DIR="$(pwd)"
  fi

  echo ""
  echo -e "${GREEN}${BOLD}╔══════════════════════════════════════╗${NC}"
  echo -e "${GREEN}${BOLD}║   UI SyncUp — Installation Summary   ║${NC}"
  echo -e "${GREEN}${BOLD}╚══════════════════════════════════════╝${NC}"
  echo -e "  ${BOLD}Version installed:${NC} $VERSION"
  echo -e "  ${BOLD}Directory:        ${NC} $FINAL_DIR"
  echo -e "  ${BOLD}Bun version:      ${NC} $FINAL_BUN_VER"
  echo -e "  ${BOLD}Init run:         ${NC} $( $NON_INTERACTIVE && echo "no (non-interactive)" || echo "yes" )"
  echo ""
  echo -e "Next steps:"
  if ! $USE_HERE; then
    echo -e "  ${BLUE}cd ui-syncup${NC}"
  fi
  echo -e "  ${BLUE}bunx ui-syncup up${NC}"
  echo -e "  ${BLUE}bun dev${NC}"
  echo ""
  echo -e "${YELLOW}Note: Supabase requires Docker to be running.${NC}"
}

# Execute main, passing all arguments
main "$@"
