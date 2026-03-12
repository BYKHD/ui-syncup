#!/bin/bash
# Force verify email for development testing
# Usage: ./scripts/force-verify-email.sh

echo "🔐 Force verifying email for current session..."

curl -X POST http://localhost:3000/api/auth/dev/force-verify \
  -H "Content-Type: application/json" \
  -b "session_token=YOUR_SESSION_TOKEN_HERE" \
  -v

echo ""
echo "✅ Done! Check the response above."
