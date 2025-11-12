// ============================================================================
// ISSUE WORKFLOW CONFIGURATION
// Canonical status metadata + transitions for UI feedback lifecycle
// ============================================================================

export const ISSUE_STATUS_VALUES = ['open', 'in_progress', 'in_review', 'resolved', 'archived'] as const
export type IssueStatusValue = (typeof ISSUE_STATUS_VALUES)[number]

export type IssueWorkflowStage = 'creation' | 'development' | 'review' | 'completion' | 'storage'

export interface IssueWorkflowState {
  label: string
  description: string
  stage: IssueWorkflowStage
  allowedTransitions: readonly IssueStatusValue[]
  workflowNotes: string
  requiresConfirmation?: boolean
  confirmationMessage?: string
}

export const ISSUE_WORKFLOW: Record<IssueStatusValue, IssueWorkflowState> = {
  open: {
    label: 'Open',
    description: 'Created from design annotation; triage done. Ready for development.',
    stage: 'creation',
    allowedTransitions: ['in_progress', 'archived'],
    workflowNotes:
      'Issue has been created and triaged. Designer has provided clear requirements and assets. Ready for developer assignment.',
  },
  in_progress: {
    label: 'In Progress',
    description: 'Developer is implementing/fixing the issue.',
    stage: 'development',
    allowedTransitions: ['in_review', 'open', 'archived'],
    workflowNotes:
      'Developer is actively working on the implementation. Code changes are being made to address the design requirements.',
  },
  in_review: {
    label: 'In Review',
    description: 'Waiting on design review. Implementation complete, needs approval.',
    stage: 'review',
    allowedTransitions: ['resolved', 'in_progress', 'archived'],
    workflowNotes:
      'Developer has completed implementation. Designer needs to review and approve the changes before deployment.',
  },
  resolved: {
    label: 'Resolved',
    description: 'Accepted by design; merged/deployed as defined.',
    stage: 'completion',
    allowedTransitions: ['archived', 'in_progress'],
    requiresConfirmation: true,
    confirmationMessage:
      'Mark this issue as resolved? This indicates the fix has been accepted by design and deployed.',
    workflowNotes:
      'Designer has approved the implementation. Changes have been merged and deployed to production.',
  },
  archived: {
    label: 'Archived',
    description: 'Long-term storage. No further edits expected.',
    stage: 'storage',
    allowedTransitions: [],
    requiresConfirmation: true,
    confirmationMessage:
      'Archive this issue? Archived issues are moved to long-term storage and cannot be edited.',
    workflowNotes:
      'Issue is complete and moved to long-term storage. No further changes expected unless major regression occurs.',
  },
} as const

export const ISSUE_STATUS_METADATA = ISSUE_WORKFLOW

export const WORKFLOW_TRANSITIONS = {
  primary: ['open', 'in_progress', 'in_review', 'resolved', 'archived'] as const,
  revisionLoops: [
    {
      from: 'in_review' as const,
      to: 'in_progress' as const,
      reason: 'Design requests changes or improvements',
      frequency: 'common',
    },
    {
      from: 'resolved' as const,
      to: 'in_progress' as const,
      reason: 'Regression found after deployment',
      frequency: 'occasional',
    },
    {
      from: 'in_progress' as const,
      to: 'open' as const,
      reason: 'Requirements or scope changed during development',
      frequency: 'rare',
    },
  ] as const,
  emergency: [
    {
      from: 'any' as const,
      to: 'archived' as const,
      reason: 'Issue cancelled, duplicate, or no longer relevant',
      requiresReason: true,
    },
  ] as const,
}
