#!/bin/bash

# Load environment variables from .env.local
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
else
  echo "❌ .env.local file not found"
  exit 1
fi

# Configuration
# REMOTE_DB_URL should be your DIRECT_URL (Session mode, port 5432)
REMOTE_DB_URL="$DIRECT_URL"

# LOCAL_DB_URL defaults to standard local supabase/postgres port if not set
# You can set LOCAL_DB_URL in .env.local if yours is different
LOCAL_DB_URL="${LOCAL_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"

if [ -z "$REMOTE_DB_URL" ]; then
  echo "❌ DIRECT_URL is not set in .env.local"
  echo "Please set DIRECT_URL to your remote Supabase connection string (port 5432)"
  exit 1
fi

echo "🔄 Syncing data from Remote to Local..."
echo "📤 Source: Remote Supabase (via DIRECT_URL)"
echo "📥 Destination: $LOCAL_DB_URL"

# Create a temporary file for the dump
DUMP_FILE="temp_dump.sql"

# 1. Dump data from Remote (Data only, no schema)
# We assume schema is already synced via migrations/push
echo "📦 Dumping data from remote..."
pg_dump "$REMOTE_DB_URL" \
  --schema=public \
  --data-only \
  --no-owner \
  --no-acl \
  --exclude-table=migrations \
  --file="$DUMP_FILE"

if [ $? -ne 0 ]; then
  echo "❌ Failed to dump data from remote"
  rm -f "$DUMP_FILE"
  exit 1
fi

# 2. Clear Local Data (Truncate all tables)
echo "🧹 Clearing local database..."
psql "$LOCAL_DB_URL" -q -c "
DO \$\$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'TRUNCATE TABLE \"' || r.tablename || '\" CASCADE';
    END LOOP;
END \$\$;"

# 3. Restore data to Local
echo "💾 Restoring data to local..."
psql "$LOCAL_DB_URL" -f "$DUMP_FILE"

if [ $? -ne 0 ]; then
  echo "❌ Failed to restore data to local"
  rm -f "$DUMP_FILE"
  exit 1
else
  echo "✅ Data sync completed successfully!"
fi

# Cleanup
rm -f "$DUMP_FILE"
