// ============================================================================
// DASHBOARD MOCK FIXTURES
// Multi-project issues assigned to the current user — for visual scaffolding
// ============================================================================

import type { MyIssue } from '@/features/dashboard/types'

export const MOCK_MY_ISSUES: MyIssue[] = [
  // ── Marketing Site ─────────────────────────────────────────────────────────
  {
    id: 'iss_d1',
    issueKey: 'MKT-42',
    title: 'Fix login button alignment on mobile',
    priority: 'high',
    status: 'in_progress',
    projectId: 'proj_1',
    projectName: 'Marketing Site',
    projectKey: 'MKT',
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'iss_d2',
    issueKey: 'MKT-38',
    title: 'Update hero section copy for Q2 campaign',
    priority: 'medium',
    status: 'open',
    projectId: 'proj_1',
    projectName: 'Marketing Site',
    projectKey: 'MKT',
    updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'iss_d3',
    issueKey: 'MKT-51',
    title: 'Inconsistent card shadow on pricing page',
    priority: 'low',
    status: 'open',
    projectId: 'proj_1',
    projectName: 'Marketing Site',
    projectKey: 'MKT',
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
  // ── Mobile App ─────────────────────────────────────────────────────────────
  {
    id: 'iss_d4',
    issueKey: 'MOB-17',
    title: 'Annotation popover overlaps bottom nav on iOS',
    priority: 'high',
    status: 'in_review',
    projectId: 'proj_2',
    projectName: 'Mobile App',
    projectKey: 'MOB',
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'iss_d5',
    issueKey: 'MOB-22',
    title: 'Dark mode colors incorrect in settings screen',
    priority: 'medium',
    status: 'in_progress',
    projectId: 'proj_2',
    projectName: 'Mobile App',
    projectKey: 'MOB',
    updatedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
  // ── Design System ──────────────────────────────────────────────────────────
  {
    id: 'iss_d6',
    issueKey: 'DS-9',
    title: 'Button focus ring missing in high-contrast mode',
    priority: 'critical',
    status: 'open',
    projectId: 'proj_5',
    projectName: 'Design System',
    projectKey: 'DS',
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'iss_d7',
    issueKey: 'DS-14',
    title: 'Tab component active indicator too thin at 1px',
    priority: 'low',
    status: 'in_review',
    projectId: 'proj_5',
    projectName: 'Design System',
    projectKey: 'DS',
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
]
