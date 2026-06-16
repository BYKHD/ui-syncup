import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'system', setTheme: vi.fn() }),
}))
vi.mock('../../actions/set-landing-view', () => ({
  setLandingView: vi.fn(async () => ({ success: true })),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { UserPreferencesComponent } from '../user-preferences'

describe('UserPreferencesComponent', () => {
  test('renders Appearance and Startup, not the cut settings', () => {
    render(<UserPreferencesComponent initialLandingView="dashboard" />)
    expect(screen.getByText('Appearance')).toBeInTheDocument()
    expect(screen.getByText('Default view')).toBeInTheDocument()
    expect(screen.queryByText('Email digest')).not.toBeInTheDocument()
    expect(screen.queryByText('Enable sounds')).not.toBeInTheDocument()
  })
})
