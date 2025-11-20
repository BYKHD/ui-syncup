#!/bin/bash
# Reset rate limits for development testing
# Usage: 
#   ./scripts/reset-rate-limit.sh              # Clear all rate limits
#   ./scripts/reset-rate-limit.sh user@example.com  # Clear specific email

echo "🔓 Resetting rate limits..."

if [ -z "$1" ]; then
  # Clear all rate limits
  echo "Clearing ALL rate limits..."
  curl -X POST http://localhost:3000/api/auth/dev/reset-rate-limit \
    -H "Content-Type: application/json" \
    -s | jq '.'
else
  # Clear specific email rate limit
  EMAIL="$1"
  echo "Clearing rate limit for: $EMAIL"
  curl -X POST http://localhost:3000/api/auth/dev/reset-rate-limit \
    -H "Content-Type: application/json" \
    -d "{\"key\": \"signin:email:$EMAIL\"}" \
    -s | jq '.'
fi

echo ""
echo "✅ Done! You can now try signing in again."
