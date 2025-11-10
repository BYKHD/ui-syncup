import {
  RiAlertLine,
  RiArrowUpLine,
  RiEqualLine,
  RiArrowDownLine,
  RiCheckboxCircleLine,
  RiTimeLine,
  RiLoader4Line,
  RiEyeLine,
  RiArchiveLine,
  RiBugLine,
  RiLightbulbLine,
  RiToolsLine,
} from '@remixicon/react'
import type { IssuePriority, IssueStatus, IssueType } from '@/lib/issues'

// ============================================================================
// PRIORITY OPTIONS
// ============================================================================

export interface PriorityOption {
  value: IssuePriority
  label: string
  icon: typeof RiAlertLine
  description: string
}

export const PRIORITY_OPTIONS: PriorityOption[] = [
  {
    value: 'critical',
    label: 'Critical',
    icon: RiAlertLine,
    description: 'Urgent issue that blocks progress',
  },
  {
    value: 'high',
    label: 'High',
    icon: RiArrowUpLine,
    description: 'Important issue that should be addressed soon',
  },
  {
    value: 'medium',
    label: 'Medium',
    icon: RiEqualLine,
    description: 'Standard priority issue',
  },
  {
    value: 'low',
    label: 'Low',
    icon: RiArrowDownLine,
    description: 'Minor issue that can be addressed later',
  },
]

export const DEFAULT_PRIORITY_ICON = RiEqualLine

// ============================================================================
// STATUS OPTIONS
// ============================================================================

export interface StatusOption {
  value: IssueStatus
  label: string
  icon: typeof RiCheckboxCircleLine
  description: string
}

export const STATUS_OPTIONS: StatusOption[] = [
  {
    value: 'open',
    label: 'Open',
    icon: RiCheckboxCircleLine,
    description: 'Issue is ready for work',
  },
  {
    value: 'in_progress',
    label: 'In Progress',
    icon: RiLoader4Line,
    description: 'Issue is being worked on',
  },
  {
    value: 'in_review',
    label: 'In Review',
    icon: RiEyeLine,
    description: 'Issue is under review',
  },
  {
    value: 'resolved',
    label: 'Resolved',
    icon: RiCheckboxCircleLine,
    description: 'Issue has been completed',
  },
  {
    value: 'archived',
    label: 'Archived',
    icon: RiArchiveLine,
    description: 'Issue is archived',
  },
]

export const DEFAULT_STATUS_ICON = RiTimeLine

// ============================================================================
// TYPE OPTIONS
// ============================================================================

export interface TypeOption {
  value: IssueType
  label: string
  icon: typeof RiBugLine
  description: string
}

export const TYPE_OPTIONS: TypeOption[] = [
  {
    value: 'bug',
    label: 'Bug',
    icon: RiBugLine,
    description: 'Something is not working as expected',
  },
  {
    value: 'feature',
    label: 'Feature',
    icon: RiLightbulbLine,
    description: 'New functionality or enhancement',
  },
  {
    value: 'improvement',
    label: 'Improvement',
    icon: RiToolsLine,
    description: 'Enhancement to existing functionality',
  },
]

export const DEFAULT_TYPE_ICON = RiBugLine
