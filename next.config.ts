import type { NextConfig } from "next"

// Validate environment variables at build time
// This will throw an error and stop the build if validation fails
import "./src/lib/env"

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // Enable automatic tree-shaking for common libraries
    // This helps reduce bundle size by only including used exports
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "@radix-ui/react-icons",
      "lodash-es",
      "framer-motion",
    ],
  },
  async headers() {
    // Use BETTER_AUTH_URL (server-side runtime env var) — NOT NEXT_PUBLIC_APP_URL, which is
    // inlined by Next.js/webpack at build time with the Docker ARG dummy value.
    const appUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000"
    const allowedOrigins = [
      appUrl,
      // Allow Vercel preview deployments
      ...(process.env.VERCEL_ENV === "preview" ? ["https://*.vercel.app"] : []),
    ]

    return [
      {
        // Apply security headers to all routes
        source: "/:path*",
        headers: [
          // Prevent clickjacking attacks
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          // Prevent MIME type sniffing
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // Enable browser XSS protection
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          // Control referrer information
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Permissions policy (formerly Feature-Policy)
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        // CORS headers for API routes
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Credentials",
            value: "true",
          },
          {
            key: "Access-Control-Allow-Origin",
            value: appUrl,
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,POST,PUT,PATCH,DELETE,OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization, X-Requested-With",
          },
          {
            key: "Access-Control-Max-Age",
            value: "86400", // 24 hours
          },
        ],
      },
    ]
  },
}

export default nextConfig
