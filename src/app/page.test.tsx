import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'
import { redirect } from 'next/navigation'

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/server/setup', () => ({ isSetupComplete: vi.fn() }))
vi.mock('@/server/auth/cookies', () => ({ getSessionCookie: vi.fn() }))
vi.mock('@/server/auth/session', () => ({ getSession: vi.fn() }))
vi.mock('@/server/preferences/landing-view', () => ({
  getLandingView: vi.fn(),
  resolveLandingPath: (v: string) => (v === 'projects' ? '/projects' : '/dashboard'),
}))

import { isSetupComplete } from '@/server/setup'
import { getSessionCookie } from '@/server/auth/cookies'
import { getSession } from '@/server/auth/session'
import { getLandingView } from '@/server/preferences/landing-view'

async function importPage() {
  const mod = await import('./page')
  return mod.default
}

describe('HomePage landing redirect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(isSetupComplete as Mock).mockResolvedValue(true)
    ;(getSessionCookie as Mock).mockResolvedValue('token')
    ;(getSession as Mock).mockResolvedValue({ user: { id: 'u1' } })
  })

  it('redirects to the preferred view for an authenticated user', async () => {
    ;(getLandingView as Mock).mockResolvedValue('projects')
    const HomePage = await importPage()
    await HomePage()
    // Pin the FIRST redirect: the mock is non-throwing, so execution falls
    // through to redirect('/sign-in'); assert the landing redirect fired first.
    expect(redirect).toHaveBeenNthCalledWith(1, '/projects')
  })

  it('redirects to /dashboard by default', async () => {
    ;(getLandingView as Mock).mockResolvedValue('dashboard')
    const HomePage = await importPage()
    await HomePage()
    expect(redirect).toHaveBeenNthCalledWith(1, '/dashboard')
  })
})
