// ============================================================================
// MOCK DATA FOR NOTIFICATIONS (MOCKUP UI)
// ============================================================================

/**
 * Notification type interface for mockup UI
 */
export interface Notification {
  id: string
  type: 'invitation' | 'comment' | 'mention' | 'status_change' | 'assignment'
  actorId: string
  actorName?: string
  createdAt: string
  readAt: string | null
  metadata: Record<string, unknown>
}

// ============================================================================
// MOCK NOTIFICATION DATA
// ============================================================================

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    type: 'invitation',
    actorId: 'user-1',
    actorName: 'John Doe',
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    readAt: null,
    metadata: {
      inviterName: 'John Doe',
      projectName: 'Website Redesign',
      teamName: 'Acme Corp',
      invitationId: 'inv-1',
      invitationStatus: 'pending',
    },
  },
  {
    id: 'notif-2',
    type: 'comment',
    actorId: 'user-2',
    actorName: 'Jane Smith',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    readAt: null,
    metadata: {
      projectName: 'Mobile App',
      commentText: 'Looks great! Just a few minor adjustments needed.',
      feedbackId: 'feedback-1',
    },
  },
  {
    id: 'notif-3',
    type: 'mention',
    actorId: 'user-3',
    actorName: 'Bob Johnson',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    readAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // read 1 hour ago
    metadata: {
      projectName: 'Marketing Campaign',
      mentionContext: 'mentioned you in a comment',
    },
  },
  {
    id: 'notif-4',
    type: 'status_change',
    actorId: 'user-4',
    actorName: 'Alice Williams',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    readAt: null,
    metadata: {
      projectName: 'Website Redesign',
      oldStatus: 'in_progress',
      newStatus: 'review',
    },
  },
  {
    id: 'notif-5',
    type: 'assignment',
    actorId: 'user-5',
    actorName: 'Charlie Brown',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    readAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(), // read 20 hours ago
    metadata: {
      projectName: 'Mobile App',
      taskName: 'Review design mockups',
    },
  },
  {
    id: 'notif-6',
    type: 'comment',
    actorId: 'user-6',
    actorName: 'Diana Prince',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    readAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: {
      projectName: 'Marketing Campaign',
      commentText: 'This is exactly what we needed!',
      feedbackId: 'feedback-2',
    },
  },
  {
    id: 'notif-7',
    type: 'invitation',
    actorId: 'user-7',
    actorName: 'Eve Torres',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    readAt: null,
    metadata: {
      inviterName: 'Eve Torres',
      projectName: 'Brand Guidelines',
      teamName: 'Design Studio',
      invitationId: 'inv-2',
      invitationStatus: 'pending',
    },
  },
]

// ============================================================================
// MOCK COUNTS
// ============================================================================

export const MOCK_UNREAD_COUNT = MOCK_NOTIFICATIONS.filter((n) => !n.readAt).length

// ============================================================================
// MOCK TEAM DATA
// ============================================================================

export const MOCK_TEAM_ID = 'team-mock-123'

export const MOCK_MEMBER_ROLE = 'member' as 'owner' | 'admin' | 'member' | 'viewer'
