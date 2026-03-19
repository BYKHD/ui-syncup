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
#   1. Checks Docker is installed and running
#   2. Downloads docker/compose.yml from the repo
#   3. Downloads .env.example as .env (skipped if .env already exists)
#   4. Runs a 4-question wizard (DB / Cache / Storage / Email)
#   5. Writes completed .env with COMPOSE_PROFILES set
#   6. Runs docker compose up -d with the selected profiles
# =============================================================================

set -euo pipefail

COMPOSE_URL="https://raw.githubusercontent.com/BYKHD/ui-syncup/main/docker/compose.yml"
ENV_EXAMPLE_URL="https://raw.githubusercontent.com/BYKHD/ui-syncup/main/.env.example"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${BLUE}ℹ${NC}  $*"; }
success() { echo -e "${GREEN}✔${NC}  $*"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $*"; }
error()   { echo -e "${RED}✖${NC}  $*" >&2; }

declare -A ENV_VARS=()
set_env() { ENV_VARS["$1"]="$2"; }

write_env_file() {
  local tmpfile
  tmpfile="$(mktemp)"
  for key in "${!ENV_VARS[@]}"; do
    echo "${key}=${ENV_VARS[$key]}"
  done > "$tmpfile"
  mv "$tmpfile" .env
  chmod 600 .env
}

main() {
  echo -e "\n${BLUE}${BOLD}UI SyncUp — Quick-start installer${NC}\n"

  # ── Docker check ───────────────────────────────────────────────────────────
  if ! command -v docker &>/dev/null; then
    error "Docker is not installed."
    error "Install guide: https://docs.docker.com/get-docker/"
    exit 1
  fi
  if ! docker info &>/dev/null 2>&1; then
    error "Docker is not running. Please start Docker and try again."
    exit 1
  fi
  success "Docker $(docker --version | awk '{print $3}' | tr -d ',')"

  # ── Download compose.yml ───────────────────────────────────────────────────
  if [[ -f compose.yml ]]; then
    info "compose.yml already exists — skipping download"
  else
    info "Downloading compose.yml..."
    curl -fsSL "$COMPOSE_URL" -o compose.yml
    success "Downloaded compose.yml"
  fi

  # ── Setup .env ─────────────────────────────────────────────────────────────
  if [[ -f .env ]]; then
    warn ".env already exists — prompting only for values not yet set"
    while IFS='=' read -r key val || [[ -n "$key" ]]; do
      [[ "$key" =~ ^[[:space:]]*# || -z "$key" ]] && continue
      ENV_VARS["$key"]="${val:-}"
    done < .env
  else
    curl -fsSL "$ENV_EXAMPLE_URL" -o .env
    while IFS='=' read -r key val || [[ -n "$key" ]]; do
      [[ "$key" =~ ^[[:space:]]*# || -z "$key" ]] && continue
      ENV_VARS["$key"]="${val:-}"
    done < .env
    success "Downloaded .env template"
  fi

  # ── Wizard ─────────────────────────────────────────────────────────────────
  read -r -p "Public URL of your app (e.g. https://syncup.example.com): " APP_URL
  set_env BETTER_AUTH_URL     "$APP_URL"
  set_env NEXT_PUBLIC_APP_URL "$APP_URL"
  set_env NEXT_PUBLIC_API_URL "${APP_URL}/api"

  if [[ -z "${ENV_VARS[BETTER_AUTH_SECRET]:-}" ]]; then
    set_env BETTER_AUTH_SECRET "$(openssl rand -hex 32)"
    success "Generated BETTER_AUTH_SECRET"
  fi

  PROFILES=()

  # Database
  echo ""
  echo "Database backend:"
  echo "  1) Bundled PostgreSQL (recommended)"
  echo "  2) External (Supabase / Neon / other)"
  read -r -p "Choice [1]: " DB_CHOICE; DB_CHOICE="${DB_CHOICE:-1}"
  if [[ "$DB_CHOICE" == "1" ]]; then
    PROFILES+=(db)
    read -r -p "PostgreSQL password (min 8 chars): " PG_PASS
    set_env POSTGRES_PASSWORD "$PG_PASS"
    set_env DATABASE_URL      "postgresql://syncup:${PG_PASS}@postgres:5432/ui_syncup"
    set_env DIRECT_URL        "postgresql://syncup:${PG_PASS}@postgres:5432/ui_syncup"
  else
    read -r -p "DATABASE_URL (postgresql://...): " DB_URL
    set_env DATABASE_URL "$DB_URL"
    read -r -p "DIRECT_URL (non-pooled, press enter to reuse DATABASE_URL): " D_URL
    set_env DIRECT_URL "${D_URL:-$DB_URL}"
  fi

  # Cache
  echo ""
  echo "Cache backend:"
  echo "  1) Bundled Redis (recommended)"
  echo "  2) External (Upstash / Redis Cloud)"
  read -r -p "Choice [1]: " CACHE_CHOICE; CACHE_CHOICE="${CACHE_CHOICE:-1}"
  if [[ "$CACHE_CHOICE" == "1" ]]; then
    PROFILES+=(cache)
    set_env REDIS_URL "redis://redis:6379"
  else
    read -r -p "REDIS_URL (redis://...): " REDIS_URL
    set_env REDIS_URL "$REDIS_URL"
  fi

  # Storage
  echo ""
  echo "Storage backend:"
  echo "  1) Bundled MinIO (recommended)"
  echo "  2) External S3 (AWS / R2 / Backblaze)"
  read -r -p "Choice [1]: " STORAGE_CHOICE; STORAGE_CHOICE="${STORAGE_CHOICE:-1}"
  if [[ "$STORAGE_CHOICE" == "1" ]]; then
    PROFILES+=(storage)
    MINIO_PASS="$(openssl rand -hex 16)"
    set_env MINIO_ROOT_USER                "minioadmin"
    set_env MINIO_ROOT_PASSWORD            "$MINIO_PASS"
    set_env STORAGE_ENDPOINT               "http://minio:9000"
    set_env STORAGE_REGION                 "us-east-1"
    set_env STORAGE_ACCESS_KEY_ID          "minioadmin"
    set_env STORAGE_SECRET_ACCESS_KEY      "$MINIO_PASS"
    set_env STORAGE_ATTACHMENTS_BUCKET     "ui-syncup-attachments"
    set_env STORAGE_MEDIA_BUCKET           "ui-syncup-media"
    set_env STORAGE_ATTACHMENTS_PUBLIC_URL "${APP_URL}/storage/attachments"
    set_env STORAGE_MEDIA_PUBLIC_URL       "${APP_URL}/storage/media"
  else
    read -r -p "Storage endpoint URL: "      S_EP
    read -r -p "Storage access key ID: "     S_KEY
    read -r -p "Storage secret access key: " S_SECRET
    set_env STORAGE_ENDPOINT          "$S_EP"
    set_env STORAGE_ACCESS_KEY_ID     "$S_KEY"
    set_env STORAGE_SECRET_ACCESS_KEY "$S_SECRET"
  fi

  # Record active profiles so bare `docker compose up -d` works on re-runs
  PROFILES_STR="$(IFS=,; echo "${PROFILES[*]:-}")"
  set_env COMPOSE_PROFILES "$PROFILES_STR"

  # ── Write .env ─────────────────────────────────────────────────────────────
  write_env_file
  success ".env written (permissions: 0600)"

  # ── Start the stack ────────────────────────────────────────────────────────
  info "Starting UI SyncUp..."
  PROFILE_FLAGS=()
  for p in "${PROFILES[@]:-}"; do
    PROFILE_FLAGS+=("--profile" "$p")
  done
  docker compose -f compose.yml "${PROFILE_FLAGS[@]}" up -d

  success "UI SyncUp is running!"
  info "Open: ${APP_URL}"
  [[ ${#PROFILES[@]} -gt 0 ]] && info "Active profiles: ${PROFILES_STR}"
}

main "$@"
