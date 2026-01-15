/**
 * NOTIFICATION BELL COMPONENT TESTS
 *
 * Tests that NotificationBell displays badge correctly and handles interactions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NotificationBell } from '../notification-bell-button'

// Mock the useUnreadCount hook
const mockUseUnreadCount = vi.fn()
vi.mock('@/features/notifications/hooks', () => ({
  useUnreadCount: (params: unknown) => {
    mockUseUnreadCount(params)
    return mockUseUnreadCount()
  },
}))

// Mock the NotificationDropdown to simplify testing
vi.mock('../notification-dropdown', () => ({
  NotificationDropdown: ({ teamId }: { teamId: string | null }) => (
    <div data-testid="notification-dropdown">Dropdown for {teamId}</div>
  ),
}))

describe('NotificationBell', () => {
  const teamId = 'team-123'

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseUnreadCount.mockReturnValue({
      count: 0,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })
  })

  // ============================================================================
  // BADGE DISPLAY TESTS
  // ============================================================================

  describe('badge display', () => {
    it('does not show badge when count is 0', () => {
      mockUseUnreadCount.mockReturnValue({
        count: 0,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<NotificationBell teamId={teamId} />)

      // Badge should not be present
      expect(screen.queryByText('0')).not.toBeInTheDocument()
    })

    it('shows badge with count when there are unread notifications', () => {
      mockUseUnreadCount.mockReturnValue({
        count: 5,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<NotificationBell teamId={teamId} />)

      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('shows 99+ when count exceeds 99', () => {
      mockUseUnreadCount.mockReturnValue({
        count: 150,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<NotificationBell teamId={teamId} />)

      expect(screen.getByText('99+')).toBeInTheDocument()
    })

    it('does not show badge while loading', () => {
      mockUseUnreadCount.mockReturnValue({
        count: 5,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      })

      render(<NotificationBell teamId={teamId} />)

      // Badge should not be visible during loading
      expect(screen.queryByText('5')).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // ACCESSIBILITY TESTS
  // ============================================================================

  describe('accessibility', () => {
    it('has accessible label with unread count', () => {
      mockUseUnreadCount.mockReturnValue({
        count: 3,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<NotificationBell teamId={teamId} />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Notifications (3 unread)')
    })

    it('has accessible label without count when no unread', () => {
      mockUseUnreadCount.mockReturnValue({
        count: 0,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<NotificationBell teamId={teamId} />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Notifications')
    })
  })

  // ============================================================================
  // HOOK PARAMETER TESTS
  // ============================================================================

  describe('hook parameters', () => {
    it('passes enabled: true when teamId is provided', () => {
      render(<NotificationBell teamId={teamId} />)

      // Check that the hook was called with enabled: true
      expect(mockUseUnreadCount).toHaveBeenCalled()
      const calls = mockUseUnreadCount.mock.calls
      const lastCallParams = calls.find((call) => call[0] && typeof call[0] === 'object')
      expect(lastCallParams?.[0]).toMatchObject({ enabled: true })
    })

    it('passes enabled: false when teamId is null', () => {
      render(<NotificationBell teamId={null} />)

      // Check that the hook was called with enabled: false
      expect(mockUseUnreadCount).toHaveBeenCalled()
      const calls = mockUseUnreadCount.mock.calls
      const lastCallParams = calls.find((call) => call[0] && typeof call[0] === 'object')
      expect(lastCallParams?.[0]).toMatchObject({ enabled: false })
    })
  })
})
