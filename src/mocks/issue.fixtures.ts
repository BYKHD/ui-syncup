// ============================================================================
// ISSUE MOCK FIXTURES
// ============================================================================

import type { IssuePriority, IssueType, IssueStatus } from '@lib/issues'

// Re-export types for convenience
export type { IssuePriority, IssueType, IssueStatus }

export interface Issue {
  id: string
  projectId: string
  issueKey: string
  title: string
  description: string
  type: IssueType
  priority: IssuePriority
  status: IssueStatus
  coverImageUrl?: string | null
  createdAt: string
  updatedAt: string
}

export const MOCK_ISSUES: Issue[] = [
  {
    id: 'issue_1',
    projectId: 'proj_1',
    issueKey: 'MKT-101',
    title: 'Button alignment issue on mobile homepage',
    description: 'The CTA button on the homepage hero section is misaligned on mobile devices (iOS Safari)',
    type: 'bug',
    priority: 'high',
    status: 'open',
    coverImageUrl: null,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'issue_2',
    projectId: 'proj_1',
    issueKey: 'MKT-102',
    title: 'Add dark mode toggle to navigation',
    description: 'Users have requested a dark mode option. Add toggle to main navigation.',
    type: 'feature',
    priority: 'medium',
    status: 'in_progress',
    coverImageUrl: null,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'issue_3',
    projectId: 'proj_1',
    issueKey: 'MKT-103',
    title: 'Optimize hero image loading performance',
    description: 'Hero images on landing page are loading slowly. Implement lazy loading and WebP format.',
    type: 'improvement',
    priority: 'medium',
    status: 'in_review',
    coverImageUrl: null,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'issue_4',
    projectId: 'proj_1',
    issueKey: 'MKT-104',
    title: 'Footer links broken on pricing page',
    description: 'Several footer links are returning 404 errors on the pricing page.',
    type: 'bug',
    priority: 'high',
    status: 'resolved',
    coverImageUrl: null,
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'issue_5',
    projectId: 'proj_1',
    issueKey: 'MKT-105',
    title: 'Contact form email validation too strict',
    description: 'Contact form rejects valid email addresses with plus signs and subdomains.',
    type: 'bug',
    priority: 'critical',
    status: 'open',
    coverImageUrl: null,
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'issue_6',
    projectId: 'proj_1',
    issueKey: 'MKT-106',
    title: 'Add analytics tracking to CTA buttons',
    description: 'Implement Google Analytics event tracking for all CTA button clicks.',
    type: 'feature',
    priority: 'low',
    status: 'open',
    coverImageUrl: null,
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
]
