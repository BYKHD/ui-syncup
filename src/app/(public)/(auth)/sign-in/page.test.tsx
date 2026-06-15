import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'
import { redirect } from 'next/navigation'

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/server/auth/cookies', () => ({ getSessionCookie: vi.fn() }))
vi.mock('@/server/auth/session', () => ({ getSession: vi.fn() }))
vi.mock('@/server/preferences/landing-view', () => ({
  getLandingView: vi.fn(),
  resolveLandingPath: (v: string) => (v === 'projects' ? '/projects' : '/dashboard'),
}))
vi.mock('@/features/auth/screens/sign-in-screen', () => ({ default: () => null }))

import { getSessionCookie } from '@/server/auth/cookies'
import { getSession } from '@/server/auth/session'
import { getLandingView } from '@/server/preferences/landing-view'

async function importPage() {
  const mod = await import('./page')
  return mod.default
}

const emptyProps = () => ({ searchParams: Promise.resolve({}) })

describe('SignInPage already-authenticated guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(getSessionCookie as Mock).mockResolvedValue('token')
    ;(getSession as Mock).mockResolvedValue({ user: { id: 'u1' } })
  })

  it('redirects an authenticated user to their preferred landing view', async () => {
    ;(getLandingView as Mock).mockResolvedValue('dashboard')
    const SignInPage = await importPage()
    await SignInPage(emptyProps())
    // Pin the FIRST redirect: the mock is non-throwing, so execution continues
    // past the guard and renders the screen — assert the guard redirect fired first.
    expect(redirect).toHaveBeenNthCalledWith(1, '/dashboard')
  })

  it('honors the projects preference', async () => {
    ;(getLandingView as Mock).mockResolvedValue('projects')
    const SignInPage = await importPage()
    await SignInPage(emptyProps())
    expect(redirect).toHaveBeenNthCalledWith(1, '/projects')
  })

  it('does not redirect when there is no session', async () => {
    ;(getSessionCookie as Mock).mockResolvedValue(undefined)
    const SignInPage = await importPage()
    await SignInPage(emptyProps())
    expect(redirect).not.toHaveBeenCalled()
  })
})
