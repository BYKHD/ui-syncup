import { useMemo } from 'react'
import { MOCK_DEFAULT_TEAM } from '@/mocks'

interface Team {
  id: string
  name: string
  image: string | null
}

interface UseTeamResult {
  currentTeam: Team | null
  isLoading: boolean
}

export function useTeam(): UseTeamResult {
  // TODO: wire: GET /api/teams/current
  const currentTeam = useMemo(() => MOCK_DEFAULT_TEAM, [])

  return {
    currentTeam,
    isLoading: false,
  }
}
