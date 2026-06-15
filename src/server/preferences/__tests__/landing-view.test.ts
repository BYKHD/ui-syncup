import { describe, test, expect, vi, beforeEach } from 'vitest'

// vi.mock is hoisted; use vi.hoisted so the factory can reference the mock fn.
const { getCookie } = vi.hoisted(() => ({ getCookie: vi.fn() }))
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: getCookie, set: vi.fn() })),
}))

import {
  getLandingView,
  resolveLandingPath,
  DEFAULT_LANDING_VIEW,
} from '../landing-view'

describe('landing-view preference', () => {
  beforeEach(() => vi.clearAllMocks())

  test('returns the cookie value when valid', async () => {
    getCookie.mockReturnValue({ value: 'projects' })
    expect(await getLandingView()).toBe('projects')
  })

  test('falls back to the default when the cookie is missing', async () => {
    getCookie.mockReturnValue(undefined)
    expect(await getLandingView()).toBe(DEFAULT_LANDING_VIEW)
  })

  test('falls back to the default when the cookie is garbage', async () => {
    getCookie.mockReturnValue({ value: 'not-a-view' })
    expect(await getLandingView()).toBe('dashboard')
  })

  test('resolveLandingPath maps each view to its route', () => {
    expect(resolveLandingPath('dashboard')).toBe('/dashboard')
    expect(resolveLandingPath('projects')).toBe('/projects')
  })
})
