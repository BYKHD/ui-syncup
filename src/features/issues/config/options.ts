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
// STATUS COLORS - SEMANTIC COLOR SCHEME
// ============================================================================

export interface StatusColorConfig {
  /** Tailwind classes for the colored dot indicator */
  dot: string
  /** Tailwind classes for background (badges, pills) */
  bg: string
  /** Tailwind classes for text color */
  text: string
  /** Tailwind classes for border color */
  border: string
  /** Tailwind classes for row left-border indicator */
  rowBorder: string
  /** Tailwind classes for subtle row background on hover */
  rowHoverBg: string
}

/**
 * Semantic color mapping for each issue status.
 * Colors chosen for intuitive meaning:
 * - open: Slate (neutral, waiting to start)
 * - in_progress: Blue (active, working)
 * - in_review: Amber (attention needed, waiting)
 * - resolved: Emerald (success, complete)
 * - archived: Purple (inactive, historical)
 */
export const STATUS_COLORS: Record<IssueStatusValue, StatusColorConfig> = {
  open: {
    dot: 'bg-slate-500 dark:bg-slate-400',
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-300 dark:border-slate-600',
    rowBorder: 'border-l-slate-400 dark:border-l-slate-500',
    rowHoverBg: 'hover:bg-slate-50 dark:hover:bg-slate-900/30',
  },
  in_progress: {
    dot: 'bg-blue-500 dark:bg-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/50',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-300 dark:border-blue-600',
    rowBorder: 'border-l-blue-500 dark:border-l-blue-400',
    rowHoverBg: 'hover:bg-blue-50 dark:hover:bg-blue-950/30',
  },
  in_review: {
    dot: 'bg-amber-500 dark:bg-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-900/50',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-600',
    rowBorder: 'border-l-amber-500 dark:border-l-amber-400',
    rowHoverBg: 'hover:bg-amber-50 dark:hover:bg-amber-950/30',
  },
  resolved: {
    dot: 'bg-emerald-500 dark:bg-emerald-400',
    bg: 'bg-emerald-100 dark:bg-emerald-900/50',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-600',
    rowBorder: 'border-l-emerald-500 dark:border-l-emerald-400',
    rowHoverBg: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30',
  },
  archived: {
    dot: 'bg-purple-400 dark:bg-purple-500',
    bg: 'bg-purple-100 dark:bg-purple-900/50',
    text: 'text-purple-600 dark:text-purple-300',
    border: 'border-purple-300 dark:border-purple-600',
    rowBorder: 'border-l-purple-400 dark:border-l-purple-500',
    rowHoverBg: 'hover:bg-purple-50 dark:hover:bg-purple-950/30',
  },
}

export const DEFAULT_STATUS_COLOR: StatusColorConfig = STATUS_COLORS.open

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
