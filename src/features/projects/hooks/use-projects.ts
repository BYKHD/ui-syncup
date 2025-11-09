import { useMemo } from 'react'
import type { ProjectSummary } from '@features/projects/types'
import { MOCK_PROJECT_SUMMARIES } from '@/mocks'

interface UseProjectsParams {
  teamId?: string
}

interface UseProjectsResult {
  data: ProjectSummary[] | undefined
  isLoading: boolean
  error: Error | null
}

export function useProjects({ teamId }: UseProjectsParams): UseProjectsResult {
  // TODO: wire: GET /api/projects?teamId={teamId}
  // For now, return mock data filtered by teamId
  const data = useMemo(() => {
    if (!teamId) return undefined
    return MOCK_PROJECT_SUMMARIES.filter((p) => p.status === 'active')
  }, [teamId])

  return {
    data,
    isLoading: false,
    error: null,
  }
}
