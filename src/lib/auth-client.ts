import { createAuthClient } from "better-auth/react"

// In the browser, use a relative baseURL so auth requests resolve against the
// current origin. NEXT_PUBLIC_APP_URL is baked at build time and defaults to
// http://localhost:3000 in pre-built images, which would break self-hosted
// deployments. On the server side the full URL is still needed.
const baseURL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL

export const authClient = createAuthClient({
    baseURL,
})
