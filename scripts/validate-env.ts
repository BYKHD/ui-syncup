#!/usr/bin/env node
/**
 * Standalone environment variable validation script
 * Can be run independently to verify environment configuration
 * Usage: bun run scripts/validate-env.ts
 */

import "../src/lib/env"

console.log("✅ Environment variables validated successfully!")
console.log("\nValidated configuration:")
console.log(`  • NODE_ENV: ${process.env.NODE_ENV}`)
console.log(`  • NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL}`)
console.log(`  • Database: ${process.env.DATABASE_URL ? "✓ configured" : "✗ missing"}`)
console.log(`  • Storage (R2): ${process.env.R2_BUCKET_NAME ? "✓ configured" : "✗ missing"}`)
console.log(`  • Auth (Google): ${process.env.GOOGLE_CLIENT_ID ? "✓ configured" : "✗ missing"}`)
console.log(`  • better-auth: ${process.env.BETTER_AUTH_SECRET ? "✓ configured" : "✗ missing"}`)

if (process.env.VERCEL_ENV) {
  console.log(`\nVercel deployment detected:`)
  console.log(`  • Environment: ${process.env.VERCEL_ENV}`)
  console.log(`  • Branch: ${process.env.VERCEL_GIT_COMMIT_REF || "unknown"}`)
  console.log(`  • Commit: ${process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || "unknown"}`)
}
