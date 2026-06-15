'use server'

import { cookies } from 'next/headers'
import {
  LANDING_VIEW_COOKIE,
  LANDING_VIEW_COOKIE_OPTIONS,
  landingViewSchema,
} from '@/server/preferences/landing-view'

type SetLandingViewResult = { success: true } | { success: false; error: string }

/** Validates and persists the user's preferred landing view to a cookie. */
export async function setLandingView(value: unknown): Promise<SetLandingViewResult> {
  const parsed = landingViewSchema.safeParse(value)
  if (!parsed.success) {
    return { success: false, error: 'Invalid landing view' }
  }

  const cookieStore = await cookies()
  cookieStore.set(LANDING_VIEW_COOKIE, parsed.data, LANDING_VIEW_COOKIE_OPTIONS)
  return { success: true }
}
