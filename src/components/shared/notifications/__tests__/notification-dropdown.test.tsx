/**
 * NOTIFICATION DROPDOWN COMPONENT TESTS
 *
 * Tests that NotificationDropdown handles pagination, grouping, and mark all as read.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NotificationDropdown } from '../notification-dropdown'
import type { Notification } from '@/features/notifications/api'

// Mock the hooks
const mockUseNotifications = vi.fn()
const mockMarkAllAsRead = vi.fn()

vi.mock('@/features/notifications/hooks', () => ({
  useNotifications: () => mockUseNotifications(),
  useMarkAllAsRead: () => ({
    mutate: mockMarkAllAsRead,
    isPending: false,
  }),
}))

// Mock the groupNotifications utility
vi.mock('@/features/notifications/utils/group-notifications', () => ({
  groupNotifications: (notifications: Notification[]) =>
    notifications.map((n) => ({
      key: n.id,
      type: n.type,
      entityType: n.entityType,
      entityId: n.entityId,
      notifications: [n],
      latest: n,
      latestAt: new Date(n.createdAt),
      actorNames: [n.metadata.actor_name || 'Someone'],
      hasUnread: !n.readAt,
    })),
}))

// Mock child components
vi.mock('../notification-item', () => ({
  NotificationItem: ({ notification }: { notification: Notification }) => (
    <div data-testid={`notification-${notification.id}`}>
      {notification.metadata.actor_name}
    </div>
  ),
}))

vi.mock('../notification-group-item', () => ({
  NotificationGroupItem: () => <div data-testid="group-item">Group</div>,
}))

describe('NotificationDropdown', () => {
  const teamId = 'team-123'

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseNotifications.mockReturnValue({
      data: {
        notifications: [],
        totalUnread: 0,
        hasMore: false,
        nextCursor: null,
      },
      isLoading: false,
      isFetching: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
    })
  })

  // ============================================================================
  // EMPTY STATE TESTS
  // ============================================================================

  describe('empty states', () => {
    it('shows message when no team is selected', () => {
      render(<NotificationDropdown teamId={null} />)

      expect(screen.getByText('Select a team to view notifications')).toBeInTheDocument()
    })

    it('shows empty message when no notifications', () => {
      render(<NotificationDropdown teamId={teamId} />)

      expect(screen.getByText('No notifications')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // LOADING STATE TESTS
  // ============================================================================

  describe('loading states', () => {
    it('shows skeleton while loading', () => {
      mockUseNotifications.mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
        hasNextPage: false,
        fetchNextPage: vi.fn(),
      })

      render(<NotificationDropdown teamId={teamId} />)

      // Should show skeleton elements (they have specific classes)
      const container = screen.getByRole('list')
      expect(container).toBeInTheDocument()
    })
  })

  // ============================================================================
  // NOTIFICATION LIST TESTS
  // ============================================================================

  describe('notification list', () => {
    it('renders notifications', () => {
      const notifications = [
        createNotification({ id: 'n1', metadata: { target_url: '/test', actor_name: 'Alice' } }),
        createNotification({ id: 'n2', metadata: { target_url: '/test', actor_name: 'Bob' } }),
      ]

      mockUseNotifications.mockReturnValue({
        data: {
          notifications,
          totalUnread: 2,
          hasMore: false,
          nextCursor: null,
        },
        isLoading: false,
        isFetching: false,
        hasNextPage: false,
        fetchNextPage: vi.fn(),
      })

      render(<NotificationDropdown teamId={teamId} />)

      expect(screen.getByTestId('notification-n1')).toBeInTheDocument()
      expect(screen.getByTestId('notification-n2')).toBeInTheDocument()
    })

    it('shows unread count in header', () => {
      mockUseNotifications.mockReturnValue({
        data: {
          notifications: [createNotification({ metadata: { target_url: '/test' } })],
          totalUnread: 5,
          hasMore: false,
          nextCursor: null,
        },
        isLoading: false,
        isFetching: false,
        hasNextPage: false,
        fetchNextPage: vi.fn(),
      })

      render(<NotificationDropdown teamId={teamId} />)

      expect(screen.getByText('5 unread')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // MARK ALL AS READ TESTS
  // ============================================================================

  describe('mark all as read', () => {
    it('shows mark all read button when there are unread notifications', () => {
      mockUseNotifications.mockReturnValue({
        data: {
          notifications: [createNotification({ metadata: { target_url: '/test' } })],
          totalUnread: 3,
          hasMore: false,
          nextCursor: null,
        },
        isLoading: false,
        isFetching: false,
        hasNextPage: false,
        fetchNextPage: vi.fn(),
      })

      render(<NotificationDropdown teamId={teamId} />)

      expect(screen.getByRole('button', { name: /Mark all read/i })).toBeInTheDocument()
    })

    it('does not show mark all read button when no unread', () => {
      mockUseNotifications.mockReturnValue({
        data: {
          notifications: [createNotification({ readAt: '2024-01-15T10:00:00Z', metadata: { target_url: '/test' } })],
          totalUnread: 0,
          hasMore: false,
          nextCursor: null,
        },
        isLoading: false,
        isFetching: false,
        hasNextPage: false,
        fetchNextPage: vi.fn(),
      })

      render(<NotificationDropdown teamId={teamId} />)

      expect(screen.queryByRole('button', { name: /Mark all read/i })).not.toBeInTheDocument()
    })

    it('calls markAllAsRead when button is clicked', () => {
      mockUseNotifications.mockReturnValue({
        data: {
          notifications: [createNotification({ metadata: { target_url: '/test' } })],
          totalUnread: 3,
          hasMore: false,
          nextCursor: null,
        },
        isLoading: false,
        isFetching: false,
        hasNextPage: false,
        fetchNextPage: vi.fn(),
      })

      render(<NotificationDropdown teamId={teamId} />)

      const button = screen.getByRole('button', { name: /Mark all read/i })
      fireEvent.click(button)

      expect(mockMarkAllAsRead).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // PAGINATION TESTS
  // ============================================================================

  describe('pagination', () => {
    it('shows load more button when hasNextPage is true', () => {
      mockUseNotifications.mockReturnValue({
        data: {
          notifications: [createNotification({ metadata: { target_url: '/test' } })],
          totalUnread: 1,
          hasMore: true,
          nextCursor: 'cursor-123',
        },
        isLoading: false,
        isFetching: false,
        hasNextPage: true,
        fetchNextPage: vi.fn(),
      })

      render(<NotificationDropdown teamId={teamId} />)

      expect(screen.getByRole('button', { name: /Load more/i })).toBeInTheDocument()
    })

    it('does not show load more button when no more pages', () => {
      mockUseNotifications.mockReturnValue({
        data: {
          notifications: [createNotification({ metadata: { target_url: '/test' } })],
          totalUnread: 1,
          hasMore: false,
          nextCursor: null,
        },
        isLoading: false,
        isFetching: false,
        hasNextPage: false,
        fetchNextPage: vi.fn(),
      })

      render(<NotificationDropdown teamId={teamId} />)

      expect(screen.queryByRole('button', { name: /Load more/i })).not.toBeInTheDocument()
    })
  })
})

// ============================================================================
// TEST HELPERS
// ============================================================================

function createNotification(
  overrides: Partial<Omit<Notification, 'metadata'>> & { metadata?: Partial<Notification['metadata']> }
): Notification {
  const { metadata: metadataOverrides, ...restOverrides } = overrides
  return {
    id: 'notif-' + Math.random().toString(36).substr(2, 9),
    recipientId: 'user-123',
    actorId: 'actor-456',
    type: 'mention',
    entityType: 'issue',
    entityId: 'entity-789',
    readAt: null,
    createdAt: new Date().toISOString(),
    ...restOverrides,
    metadata: {
      target_url: '/test',
      ...metadataOverrides,
    },
  }
}
