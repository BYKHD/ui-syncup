// ============================================================================
// PROJECT ACTIVITY MOCK FIXTURES
// ============================================================================

export type ActivityType =
  | 'member_added'
  | 'member_removed'
  | 'member_role_changed'
  | 'project_updated'
  | 'visibility_changed'
  | 'project_archived'
  | 'project_deleted'

export interface ActivityItem {
  id: string
  type: ActivityType
  actor: {
    id: string
    name: string
    avatar?: string
  }
  target?: {
    id: string
    name: string
  }
  metadata?: Record<string, any>
  timestamp: string
}

export const MOCK_PROJECT_ACTIVITIES: ActivityItem[] = [
  {
    id: 'act_1',
    type: 'member_added',
    actor: { id: 'user_1', name: 'Sarah Johnson' },
    target: { id: 'user_5', name: 'Jessica Williams' },
    metadata: { role: 'member' },
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  },
  {
    id: 'act_2',
    type: 'project_updated',
    actor: { id: 'user_2', name: 'Michael Chen' },
    metadata: { changes: ['description'] },
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
  },
  {
    id: 'act_3',
    type: 'member_role_changed',
    actor: { id: 'user_1', name: 'Sarah Johnson' },
    target: { id: 'user_2', name: 'Michael Chen' },
    metadata: { oldRole: 'member', newRole: 'editor' },
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
  },
  {
    id: 'act_4',
    type: 'visibility_changed',
    actor: { id: 'user_1', name: 'Sarah Johnson' },
    metadata: { visibility: 'private' },
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
  },
  {
    id: 'act_5',
    type: 'member_added',
    actor: { id: 'user_1', name: 'Sarah Johnson' },
    target: { id: 'user_4', name: 'David Kim' },
    metadata: { role: 'viewer' },
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
  },
]
