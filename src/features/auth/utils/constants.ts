import type { PlanOption } from '../types'
import { PLANS } from '@/config/tiers'

// ============================================================================
// PLAN OPTIONS FOR SIGN-UP
// ============================================================================

export const planOptions: PlanOption[] = [
  {
    id: 'free',
    label: PLANS.free.label,
    price: 'Free',
    description: 'Perfect for small teams getting started',
    features: [
      `Up to ${PLANS.free.limits.members} team members`,
      `${PLANS.free.limits.projects} project`,
      `Up to ${PLANS.free.limits.issues} issues`,
      `${PLANS.free.limits.storageMB}MB storage`,
    ],
  },
  {
    id: 'pro',
    label: PLANS.pro.label,
    price: 'Stay Tuned',
    description: 'For growing teams with advanced needs',
    features: [
      'Unlimited team members',
      `Up to ${PLANS.pro.limits.projects} projects`,
      'Unlimited issues',
      'Jira integration',
      'Priority support',
    ],
  },
]
