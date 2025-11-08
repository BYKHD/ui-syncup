// src/config/tiers.ts
export type PlanId = "free" | "pro"

type LimitSpec = {
  members: number | "unlimited"
  projects: number | "unlimited"
  issues: number | "unlimited"
  storageMB: number | "unlimited"
}

type BillingSpec =
  | { model: "free"; price: 0 }
  | { model: "per_editor"; priceUSD: number }

export type PlanSpec = {
  id: PlanId
  label: string
  limits: LimitSpec
  features: {
    jiraIntegration: boolean
    prioritySupport: boolean
    analytics: boolean
    privateProjects: boolean
  }
  billing: BillingSpec
}

export const PLANS: Record<PlanId, PlanSpec> = {
  free: {
    id: "free",
    label: "Free",
    limits: {
      members: 10,           // team-level heads
      projects: 1,
      issues: 25,
      storageMB: 100,
    },
    features: {
      jiraIntegration: false,
      prioritySupport: false,
      analytics: false,
      privateProjects: true, // you said public/private is allowed
    },
    billing: { model: "free", price: 0 },
  },
  pro: {
    id: "pro",
    label: "Pro",
    limits: {
      members: "unlimited",
      projects: 50,
      issues: "unlimited",
      storageMB: 80_000, // 80GB
    },
    features: {
      jiraIntegration: true,
      prioritySupport: true,
      analytics: true,
      privateProjects: true,
    },
    // IMPORTANT: bill per EDITOR (project-level)
    billing: { model: "per_editor", priceUSD: 8 },
  },
}