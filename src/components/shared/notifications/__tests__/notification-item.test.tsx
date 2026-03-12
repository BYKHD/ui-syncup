/**
 * NOTIFICATION ITEM COMPONENT TESTS
 *
 * Tests that NotificationItem renders correctly for each notification type
 * and handles user interactions properly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NotificationItem } from '../notification-item'
import type { Notification } from '@/features/notifications/api'

// Mock QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
})

const renderWithProviders = (ui: React.ReactNode) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock the useMarkAsRead hook
const mockMarkAsRead = vi.fn()
vi.mock('@/features/notifications/hooks', () => ({
  useMarkAsRead: () => ({
    mutate: mockMarkAsRead,
  }),
}))

describe('NotificationItem', () => {
  const teamId = 'team-123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================================================
  // NOTIFICATION TYPE RENDERING TESTS
  // ============================================================================

  describe('renders correctly for each notification type', () => {
    it('renders mention notification', () => {
      const notification = createNotification({
        type: 'mention',
        metadata: {
          target_url: '/teams/demo/projects/APP/issues/APP-123',
          actor_name: 'Alice',
          issue_key: 'APP-123',
        },
      })

      renderWithProviders(<NotificationItem notification={notification} teamId={teamId} />)

      expect(screen.getByText(/Alice mentioned you/)).toBeInTheDocument()
      expect(screen.getByText(/APP-123/)).toBeInTheDocument()
    })

    it('renders comment_created notification', () => {
      const notification = createNotification({
        type: 'comment_created',
        metadata: {
          target_url: '/teams/demo/projects/APP/issues/APP-456',
          actor_name: 'Bob',
          issue_key: 'APP-456',
          comment_preview: 'This looks great!',
        },
      })

      renderWithProviders(<NotificationItem notification={notification} teamId={teamId} />)

      expect(screen.getByText(/Bob commented on APP-456/)).toBeInTheDocument()
    })

    it('renders reply notification', () => {
      const notification = createNotification({
        type: 'reply',
        metadata: {
          target_url: '/teams/demo/projects/APP/issues/APP-789',
          actor_name: 'Carol',
          issue_key: 'APP-789',
        },
      })

      renderWithProviders(<NotificationItem notification={notification} teamId={teamId} />)

      expect(screen.getByText(/Carol replied to your comment/)).toBeInTheDocument()
    })

    it('renders issue_assigned notification', () => {
      const notification = createNotification({
        type: 'issue_assigned',
        metadata: {
          target_url: '/teams/demo/projects/APP/issues/APP-101',
          actor_name: 'Dave',
          issue_key: 'APP-101',
          issue_title: 'Fix login bug',
        },
      })

      renderWithProviders(<NotificationItem notification={notification} teamId={teamId} />)

      expect(screen.getByText(/Dave assigned you to APP-101/)).toBeInTheDocument()
    })

    it('renders issue_status_changed notification', () => {
      const notification = createNotification({
        type: 'issue_status_changed',
        metadata: {
          target_url: '/teams/demo/projects/APP/issues/APP-202',
          actor_name: 'Eve',
          issue_key: 'APP-202',
          new_status: 'In Review',
        },
      })

      renderWithProviders(<NotificationItem notification={notification} teamId={teamId} />)

      expect(screen.getByText(/Eve changed APP-202 status/)).toBeInTheDocument()
      expect(screen.getByText(/In Review/)).toBeInTheDocument()
    })

    it('renders project_invitation notification', () => {
      const notification = createNotification({
        type: 'project_invitation',
        metadata: {
          target_url: '/teams/demo/projects/NEW',
          actor_name: 'Frank',
          project_name: 'New Project',
          invitation_id: 'inv-123',
        },
      })

      renderWithProviders(<NotificationItem notification={notification} teamId={teamId} />)

      expect(screen.getByText(/Frank invited you to join New Project/)).toBeInTheDocument()
      // Should show Accept/Decline buttons
      expect(screen.getByRole('button', { name: /Accept/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Decline/i })).toBeInTheDocument()
    })

    it('renders team_invitation notification', () => {
      const notification = createNotification({
        type: 'team_invitation',
        metadata: {
          target_url: '/teams/new-team',
          actor_name: 'Grace',
          team_name: 'New Team',
          invitation_id: 'inv-456',
        },
      })

      renderWithProviders(<NotificationItem notification={notification} teamId={teamId} />)

      expect(screen.getByText(/Grace invited you to join New Team/)).toBeInTheDocument()
    })

    it('renders role_updated notification', () => {
      const notification = createNotification({
        type: 'role_updated',
        metadata: {
          target_url: '/teams/demo/projects/APP',
          actor_name: 'Admin',
          new_role: 'Editor',
          project_name: 'App Project',
        },
      })

      renderWithProviders(<NotificationItem notification={notification} teamId={teamId} />)

      expect(screen.getByText(/Your role was updated/)).toBeInTheDocument()
      expect(screen.getByText(/Editor/)).toBeInTheDocument()
    })
  })

  // ============================================================================
  // INTERACTION TESTS
  // ============================================================================

  describe('user interactions', () => {
    it('marks notification as read and navigates on click', () => {
      const notification = createNotification({
        type: 'mention',
        readAt: null,
        metadata: {
          target_url: '/teams/demo/projects/APP/issues/APP-123',
          actor_name: 'Alice',
        },
      })

      renderWithProviders(<NotificationItem notification={notification} teamId={teamId} />)

      const item = screen.getByRole('listitem')
      fireEvent.click(item)

      expect(mockMarkAsRead).toHaveBeenCalledWith(notification.id)
      expect(mockPush).toHaveBeenCalledWith('/teams/demo/projects/APP/issues/APP-123')
    })

    it('does not mark as read if already read', () => {
      const notification = createNotification({
        type: 'mention',
        readAt: '2024-01-15T10:00:00Z',
        metadata: {
          target_url: '/teams/demo/projects/APP/issues/APP-123',
          actor_name: 'Alice',
        },
      })

      renderWithProviders(<NotificationItem notification={notification} teamId={teamId} />)

      const item = screen.getByRole('listitem')
      fireEvent.click(item)

      expect(mockMarkAsRead).not.toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/teams/demo/projects/APP/issues/APP-123')
    })

    it('supports keyboard navigation', () => {
      const notification = createNotification({
        type: 'mention',
        readAt: null,
        metadata: {
          target_url: '/teams/demo/projects/APP/issues/APP-123',
          actor_name: 'Alice',
        },
      })

      renderWithProviders(<NotificationItem notification={notification} teamId={teamId} />)

      const item = screen.getByRole('listitem')
      fireEvent.keyDown(item, { key: 'Enter' })

      expect(mockMarkAsRead).toHaveBeenCalledWith(notification.id)
      expect(mockPush).toHaveBeenCalledWith('/teams/demo/projects/APP/issues/APP-123')
    })
  })

  // ============================================================================
  // VISUAL STATE TESTS
  // ============================================================================

  describe('visual states', () => {
    it('shows unread indicator for unread notifications', () => {
      const notification = createNotification({
        type: 'mention',
        readAt: null,
        metadata: {
          target_url: '/test',
          actor_name: 'Alice',
        },
      })

      renderWithProviders(<NotificationItem notification={notification} teamId={teamId} />)

      expect(screen.getByLabelText('Unread')).toBeInTheDocument()
    })

    it('does not show unread indicator for read notifications', () => {
      const notification = createNotification({
        type: 'mention',
        readAt: '2024-01-15T10:00:00Z',
        metadata: {
          target_url: '/test',
          actor_name: 'Alice',
        },
      })

      render(<NotificationItem notification={notification} teamId={teamId} />)

      expect(screen.queryByLabelText('Unread')).not.toBeInTheDocument()
    })

    it('displays relative timestamp', () => {
      const notification = createNotification({
        type: 'mention',
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
        metadata: {
          target_url: '/test',
          actor_name: 'Alice',
        },
      })

      render(<NotificationItem notification={notification} teamId={teamId} />)

      expect(screen.getByText(/5m ago/)).toBeInTheDocument()
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
