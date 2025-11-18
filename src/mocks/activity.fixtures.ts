// ============================================================================
// ACTIVITY MOCK FIXTURES
// ============================================================================

import type { ActivityEntry, ActivityType, IssueUser } from '@/features/issues/types';

// Mock users for activities (reuse from attachments for consistency)
const MOCK_ACTIVITY_USERS: IssueUser[] = [
  {
    id: 'user_1',
    name: 'Sarah Chen',
    email: 'sarah@example.com',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
  },
  {
    id: 'user_2',
    name: 'Mike Johnson',
    email: 'mike@example.com',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
  },
  {
    id: 'user_3',
    name: 'Emma Williams',
    email: 'emma@example.com',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
  },
  {
    id: 'user_4',
    name: 'Alex Rodriguez',
    email: 'alex@example.com',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
  },
];

// Mock activities for different issues
export const MOCK_ACTIVITIES: ActivityEntry[] = [
  // Issue 1 activities
  {
    id: 'act_1',
    issueId: 'issue_1',
    type: 'created',
    actor: MOCK_ACTIVITY_USERS[0],
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'act_2',
    issueId: 'issue_1',
    type: 'attachment_added',
    actor: MOCK_ACTIVITY_USERS[0],
    comment: 'Added screenshot showing the button misalignment issue',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'act_3',
    issueId: 'issue_1',
    type: 'priority_changed',
    actor: MOCK_ACTIVITY_USERS[1],
    changes: [
      {
        field: 'priority',
        oldValue: 'medium',
        newValue: 'high',
      },
    ],
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'act_4',
    issueId: 'issue_1',
    type: 'comment_added',
    actor: MOCK_ACTIVITY_USERS[2],
    comment: 'I can reproduce this on iOS Safari 16.3. The button is shifted 20px to the left.',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'act_5',
    issueId: 'issue_1',
    type: 'assignee_changed',
    actor: MOCK_ACTIVITY_USERS[1],
    changes: [
      {
        field: 'assignee',
        oldValue: null,
        newValue: 'Sarah Chen',
      },
    ],
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },

  // Issue 2 activities
  {
    id: 'act_6',
    issueId: 'issue_2',
    type: 'created',
    actor: MOCK_ACTIVITY_USERS[1],
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'act_7',
    issueId: 'issue_2',
    type: 'status_changed',
    actor: MOCK_ACTIVITY_USERS[0],
    changes: [
      {
        field: 'status',
        oldValue: 'open',
        newValue: 'in_progress',
      },
    ],
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'act_8',
    issueId: 'issue_2',
    type: 'comment_added',
    actor: MOCK_ACTIVITY_USERS[0],
    comment: 'Started working on this. Will implement a theme context provider.',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'act_9',
    issueId: 'issue_2',
    type: 'attachment_added',
    actor: MOCK_ACTIVITY_USERS[1],
    comment: 'Added design mockup for dark mode UI',
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },

  // Issue 3 activities
  {
    id: 'act_10',
    issueId: 'issue_3',
    type: 'created',
    actor: MOCK_ACTIVITY_USERS[2],
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'act_11',
    issueId: 'issue_3',
    type: 'status_changed',
    actor: MOCK_ACTIVITY_USERS[3],
    changes: [
      {
        field: 'status',
        oldValue: 'open',
        newValue: 'in_progress',
      },
    ],
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'act_12',
    issueId: 'issue_3',
    type: 'status_changed',
    actor: MOCK_ACTIVITY_USERS[3],
    changes: [
      {
        field: 'status',
        oldValue: 'in_progress',
        newValue: 'in_review',
      },
    ],
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'act_13',
    issueId: 'issue_3',
    type: 'comment_added',
    actor: MOCK_ACTIVITY_USERS[2],
    comment: 'Implemented lazy loading with Intersection Observer and converted images to WebP. LCP improved by 40%.',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },

  // Issue 4 activities
  {
    id: 'act_14',
    issueId: 'issue_4',
    type: 'created',
    actor: MOCK_ACTIVITY_USERS[3],
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'act_15',
    issueId: 'issue_4',
    type: 'status_changed',
    actor: MOCK_ACTIVITY_USERS[0],
    changes: [
      {
        field: 'status',
        oldValue: 'open',
        newValue: 'resolved',
      },
    ],
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'act_16',
    issueId: 'issue_4',
    type: 'comment_added',
    actor: MOCK_ACTIVITY_USERS[0],
    comment: 'Fixed all broken footer links. Verified on staging.',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },

  // Issue 5 activities
  {
    id: 'act_17',
    issueId: 'issue_5',
    type: 'created',
    actor: MOCK_ACTIVITY_USERS[1],
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'act_18',
    issueId: 'issue_5',
    type: 'priority_changed',
    actor: MOCK_ACTIVITY_USERS[0],
    changes: [
      {
        field: 'priority',
        oldValue: 'high',
        newValue: 'critical',
      },
    ],
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },

  // Issue 6 activities
  {
    id: 'act_19',
    issueId: 'issue_6',
    type: 'created',
    actor: MOCK_ACTIVITY_USERS[2],
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'act_20',
    issueId: 'issue_6',
    type: 'type_changed',
    actor: MOCK_ACTIVITY_USERS[1],
    changes: [
      {
        field: 'type',
        oldValue: 'bug',
        newValue: 'other',
      },
    ],
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
];

// Helper function to get activities by issue ID
export function getActivitiesByIssueId(issueId: string): ActivityEntry[] {
  return MOCK_ACTIVITIES.filter((act) => act.issueId === issueId).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// Helper function to get paginated activities
export function getPaginatedActivities(
  issueId: string,
  limit: number = 10,
  cursor?: string | null
): { activities: ActivityEntry[]; hasMore: boolean; nextCursor: string | null } {
  const allActivities = getActivitiesByIssueId(issueId);

  let startIndex = 0;
  if (cursor) {
    const cursorIndex = allActivities.findIndex((act) => act.id === cursor);
    startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
  }

  const activities = allActivities.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < allActivities.length;
  const nextCursor = hasMore ? activities[activities.length - 1].id : null;

  return { activities, hasMore, nextCursor };
}

// Export users for reuse
export { MOCK_ACTIVITY_USERS };
