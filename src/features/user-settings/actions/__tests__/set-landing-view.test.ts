import { describe, test, expect, vi, beforeEach } from 'vitest'

const { setCookie } = vi.hoisted(() => ({ setCookie: vi.fn() }))
vi.mock('next/headers', () => ({
  // cookies() is async in Next.js 15 — resolve a Promise to match the real contract.
  cookies: vi.fn(() => Promise.resolve({ get: vi.fn(), set: setCookie })),
}))

import { setLandingView } from '../set-landing-view'
import { LANDING_VIEW_COOKIE } from '@/server/preferences/landing-view'

describe('setLandingView action', () => {
  beforeEach(() => vi.clearAllMocks())

  test('sets the cookie for a valid value', async () => {
    const result = await setLandingView('projects')
    expect(result).toEqual({ success: true })
    expect(setCookie).toHaveBeenCalledWith(
      LANDING_VIEW_COOKIE,
      'projects',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' }),
    )
  })

  test('rejects an invalid value without setting a cookie', async () => {
    const result = await setLandingView('hacker')
    expect(result).toEqual({ success: false, error: 'Invalid landing view' })
    expect(setCookie).not.toHaveBeenCalled()
  })
})
