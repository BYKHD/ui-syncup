import { cookies } from 'next/headers'
import { z } from 'zod'
import { isProduction } from '@/lib/env'

/** Cookie that stores the user's preferred post-login landing view. */
export const LANDING_VIEW_COOKIE = 'landing_view'

const LANDING_VIEW_MAX_AGE = 60 * 60 * 24 * 365 // 1 year in seconds

export const landingViewSchema = z.enum(['dashboard', 'projects'])
export type LandingView = z.infer<typeof landingViewSchema>

export const DEFAULT_LANDING_VIEW: LandingView = 'dashboard'

/** Security attributes for the landing-view cookie (mirrors the session cookie). */
export const LANDING_VIEW_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction(),
  sameSite: 'lax' as const,
  maxAge: LANDING_VIEW_MAX_AGE,
  path: '/',
} as const

/**
 * Reads and validates the landing-view cookie.
 * A cookie is untrusted input, so an invalid or missing value falls back to the default.
 * Server-only (uses next/headers) — never import from a client component.
 */
export async function getLandingView(): Promise<LandingView> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(LANDING_VIEW_COOKIE)?.value
  const parsed = landingViewSchema.safeParse(raw)
  return parsed.success ? parsed.data : DEFAULT_LANDING_VIEW
}

/**
 * Route path for each landing view. `satisfies Record<LandingView, …>` makes the
 * compiler flag this if a new view is added to the schema without a path.
 */
const LANDING_PATHS = {
  dashboard: '/dashboard',
  projects: '/projects',
} satisfies Record<LandingView, string>

/** Maps a landing-view preference to its route path. */
export function resolveLandingPath(view: LandingView): string {
  return LANDING_PATHS[view]
}
