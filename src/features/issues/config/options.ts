import {
  RiAlarmWarningLine,
  RiArrowDownLine,
  RiArrowUpLine,
  RiArticleLine,
  RiArchiveLine,
  RiBugLine,
  RiCheckboxBlankCircleLine,
  RiCheckboxCircleLine,
  RiEyeLine,
  RiFlagLine,
  RiMoreLine,
  RiProgress2Line,
  RiAccessibilityLine,
  RiEqualLine,
} from '@remixicon/react'
import type { IssueStatusValue } from './workflow'

type IconComponent = typeof RiAlarmWarningLine

// ============================================================================
// CORE ISSUE TYPE DEFINITIONS - SINGLE SOURCE OF TRUTH
// ============================================================================

export const ISSUE_PRIORITY_VALUES = ['low', 'medium', 'high', 'critical'] as const
export const ISSUE_TYPE_VALUES = ['bug', 'visual', 'accessibility', 'content', 'other'] as const

export type IssuePriorityValue = (typeof ISSUE_PRIORITY_VALUES)[number]
export type IssueTypeValue = (typeof ISSUE_TYPE_VALUES)[number]

// ============================================================================
// PRIORITY OPTIONS
// ============================================================================

export interface PriorityOption {
  value: IssuePriorityValue
  label: string
  icon: IconComponent
  description: string
}

export const PRIORITY_OPTIONS: PriorityOption[] = [
  {
    value: 'critical',
    label: 'Critical',
    icon: RiAlarmWarningLine,
    description: 'Blocking issue that requires immediate attention',
  },
  {
    value: 'high',
    label: 'High',
    icon: RiArrowUpLine,
    description: 'Important issue that impacts key workflows',
  },
  {
    value: 'medium',
    label: 'Medium',
    icon: RiEqualLine,
    description: 'Standard priority, should be addressed soon',
  },
  {
    value: 'low',
    label: 'Low',
    icon: RiArrowDownLine,
    description: 'Minor issue or polish task',
  },
]

export const DEFAULT_PRIORITY_ICON = RiEqualLine

// ============================================================================
// STATUS OPTIONS
// ============================================================================

export interface StatusOption {
  value: IssueStatusValue
  label: string
  icon: IconComponent
  description: string
}

export const STATUS_OPTIONS: StatusOption[] = [
  {
    value: 'open',
    label: 'Open',
    icon: RiCheckboxBlankCircleLine,
    description: 'Ready for development',
  },
  {
    value: 'in_progress',
    label: 'In Progress',
    icon: RiProgress2Line,
    description: 'Implementation in flight',
  },
  {
    value: 'in_review',
    label: 'In Review',
    icon: RiFlagLine,
    description: 'Waiting on design review and approval',
  },
  {
    value: 'resolved',
    label: 'Resolved',
    icon: RiCheckboxCircleLine,
    description: 'Approved and deployed',
  },
  {
    value: 'archived',
    label: 'Archived',
    icon: RiArchiveLine,
    description: 'Long-term storage, no edits expected',
  },
]

export const DEFAULT_STATUS_ICON = RiCheckboxBlankCircleLine

// ============================================================================
// TYPE OPTIONS + METADATA
// ============================================================================

export interface TypeOption {
  value: IssueTypeValue
  label: string
  icon: IconComponent
  description: string
}

export const TYPE_OPTIONS: TypeOption[] = [
  {
    value: 'bug',
    label: 'Bug',
    icon: RiBugLine,
    description: 'Functional issues, broken flows, runtime errors',
  },
  {
    value: 'visual',
    label: 'Visual',
    icon: RiEyeLine,
    description: 'Layout, spacing, color, or visual defects',
  },
  {
    value: 'accessibility',
    label: 'Accessibility',
    icon: RiAccessibilityLine,
    description: 'WCAG / a11y issues impacting usability',
  },
  {
    value: 'content',
    label: 'Content',
    icon: RiArticleLine,
    description: 'Copy, translation, or messaging fixes',
  },
  {
    value: 'other',
    label: 'Other',
    icon: RiMoreLine,
    description: 'Performance, feature requests, or general feedback',
  },
]

export type IssueTypeCategory = 'functional' | 'visual' | 'content' | 'accessibility' | 'general'

export const ISSUE_TYPE_METADATA: Record<
  IssueTypeValue,
  {
    label: string
    description: string
    examples: string[]
    category: IssueTypeCategory
    keywords: string[]
  }
> = {
  bug: {
    label: 'Bug',
    description: 'Functional issues, errors, or broken features in the application',
    examples: [
      'Button not responding to clicks',
      'Form validation not working',
      'JavaScript errors in console',
      'API calls failing',
    ],
    category: 'functional',
    keywords: ['error', 'broken', 'crash', 'fail', 'bug', 'issue', 'problem', 'not working'],
  },
  visual: {
    label: 'Visual',
    description: 'Visual inconsistencies, layout issues, or styling problems',
    examples: [
      'Text overlapping with other elements',
      'Incorrect colors or fonts',
      'Misaligned components',
      'Responsive design issues',
    ],
    category: 'visual',
    keywords: ['layout', 'design', 'color', 'font', 'style', 'css', 'visual', 'appearance', 'ui'],
  },
  accessibility: {
    label: 'Accessibility',
    description: 'Accessibility compliance issues affecting users with disabilities',
    examples: [
      'Missing alt text for images',
      'Poor keyboard navigation',
      'Insufficient color contrast',
      'Missing ARIA labels',
    ],
    category: 'accessibility',
    keywords: ['accessibility', 'a11y', 'screen reader', 'keyboard', 'contrast', 'aria', 'wcag'],
  },
  content: {
    label: 'Content',
    description: 'Text, copy, or content-related issues',
    examples: [
      'Typos or grammatical errors',
      'Incorrect or outdated information',
      'Missing translations',
      'Inconsistent terminology',
    ],
    category: 'content',
    keywords: ['text', 'copy', 'typo', 'spelling', 'grammar', 'content', 'translation', 'wording'],
  },
  other: {
    label: 'Other',
    description: "Miscellaneous issues that don't fit into other categories",
    examples: [
      'Performance issues',
      'User experience concerns',
      'Feature requests',
      'General feedback',
    ],
    category: 'general',
    keywords: ['performance', 'slow', 'feature', 'request', 'suggestion', 'improvement'],
  },
}

// ============================================================================
// ATTACHMENT LIMITS - SINGLE SOURCE OF TRUTH
// ============================================================================

/**
 * Attachment size limits for issues
 * Used by both server validation and client-side file pickers
 */
export const ATTACHMENT_LIMITS = {
  /** Maximum file size per attachment: 10MB */
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  /** Maximum total attachment size per issue: 50MB */
  MAX_TOTAL_SIZE_PER_ISSUE: 50 * 1024 * 1024,
  /** Maximum number of attachments per issue (for future use) */
  MAX_ATTACHMENTS_PER_ISSUE: 20,
} as const;
