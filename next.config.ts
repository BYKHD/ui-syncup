import type { NextConfig } from "next"

// Validate environment variables at build time
// This will throw an error and stop the build if validation fails
import "./src/lib/env"

const nextConfig: NextConfig = {
  /* config options here */
}

export default nextConfig
