#!/usr/bin/env bash
# Strict bash settings for safety
set -euo pipefail

# Resolve the latest published GitHub release tag.
# Falls back to 'main' if the GitHub API is unreachable.
resolve_latest_version() {
  local latest
  latest=$(curl -fsSL "https://api.github.com/repos/BYKHD/ui-syncup/releases/latest" \
    2>/dev/null | grep '"tag_name"' | cut -d'"' -f4)
  echo "${latest:-main}"
}

# Wrap the entire script to prevent execution of a partially downloaded script
main() {
    # Colors for output
    local RED='\033[0;31m'
    local GREEN='\033[0;32m'
    local YELLOW='\033[0;33m'
    local BLUE='\033[0;34m'
    local NC='\033[0m' # No Color

    echo -e "${BLUE}🚀 Starting UI-Syncup installation...${NC}"

    # Check for git
    if ! command -v git &> /dev/null; then
        echo -e "${RED}❌ Error: git is required but not installed.${NC}"
        exit 1
    fi

    # Check for bun
    if ! command -v bun &> /dev/null; then
        echo -e "${YELLOW}⚠️ bun is not installed. Installing bun...${NC}"
        # Note: This pipes bun's install script directly into bash.
        # You can verify the script first at: https://bun.sh/install
        # Alternatively, install bun manually: https://bun.sh/docs/installation
        curl -fsSL https://bun.sh/install | bash
        export BUN_INSTALL="$HOME/.bun"
        export PATH="$BUN_INSTALL/bin:$PATH"
    fi

    local VERSION=${1:-$(resolve_latest_version)}
    # Allow repo override for forks: UI_SYNCUP_REPO=https://github.com/your-org/ui-syncup.git
    local REPO_URL="${UI_SYNCUP_REPO:-https://github.com/BYKHD/ui-syncup.git}"
    local INSTALL_DIR="ui-syncup"

    if [ -d "$INSTALL_DIR" ]; then
        echo -e "${RED}❌ Error: Directory '$INSTALL_DIR' already exists.${NC}"
        echo "Please remove it or run this script in a different directory."
        exit 1
    fi

    echo -e "${BLUE}📦 Cloning repository into $INSTALL_DIR (version: $VERSION)...${NC}"
    if ! git clone --branch "$VERSION" "$REPO_URL" "$INSTALL_DIR"; then
        echo -e "${RED}❌ Error: Failed to clone version '$VERSION'. Make sure the tag or branch exists.${NC}"
        exit 1
    fi

    cd "$INSTALL_DIR"

    echo -e "${BLUE}📥 Installing dependencies...${NC}"
    bun install

    echo -e "${BLUE}⚙️ Initializing project...${NC}"
    # Redirect stdin from /dev/tty so interactive prompts work even when piped
    if [ -t 0 ]; then
        bunx ui-syncup init
    else
        # Try to connect to terminal for interactive prompts during curl | bash
        if [ -c /dev/tty ]; then
            bunx ui-syncup init < /dev/tty
        else
            echo -e "${YELLOW}⚠️ Cannot open /dev/tty for interactive prompts. Using default values.${NC}"
            bunx ui-syncup init
        fi
    fi

    echo ""
    echo -e "${GREEN}✅ Installation complete!${NC}"
    echo ""
    echo -e "To start the development server, run:"
    echo -e "  ${BLUE}cd $INSTALL_DIR${NC}"
    echo -e "  ${BLUE}bunx ui-syncup up${NC}"
    echo -e "  ${BLUE}bun dev${NC}"
    echo ""
    echo -e "${YELLOW}Note: Supabase requires Docker to be running.${NC}"
}

# Execute the main function, passing all arguments
main "$@"
