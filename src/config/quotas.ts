export type QuotaSpec = {
  members: number | "unlimited"
  projects: number | "unlimited"
  issues: number | "unlimited"
  storageMB: number
}

function parseLimit(envVar: string | undefined, defaultVal: number | "unlimited"): number | "unlimited" {
  if (!envVar) return defaultVal
  if (envVar.toLowerCase() === "unlimited") return "unlimited"
  const parsed = parseInt(envVar, 10)
  return isNaN(parsed) ? defaultVal : parsed
}

export const QUOTAS: QuotaSpec = {
  members: parseLimit(process.env.MAX_MEMBERS_PER_TEAM, "unlimited"),
  projects: parseLimit(process.env.MAX_PROJECTS_PER_TEAM, 100),
  issues: parseLimit(process.env.MAX_ISSUES_PER_TEAM, "unlimited"),
  storageMB: Number(process.env.MAX_STORAGE_PER_TEAM_MB) || 10_000,
}
