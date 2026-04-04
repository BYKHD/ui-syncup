import { useParams } from 'next/navigation'
import { useTeams } from '@/features/teams/hooks/use-teams'

interface Team {
  id: string
  name: string
  slug: string
  image: string | null
}

interface UseTeamResult {
  currentTeam: Team | null
  isLoading: boolean
}

export function useTeam(): UseTeamResult {
  const { data, isLoading } = useTeams()
  const params = useParams()

  const slug = params?.slug as string | undefined
  const teams = data?.teams ?? []

  // Priority:
  // 1. URL slug (authoritative — user is explicitly on this team's page)
  // 2. activeTeamId from API (DB-backed lastActiveTeamId, no cookie)
  // 3. First team (fallback for single-team mode)
  const currentTeam = (
    slug
      ? teams.find(t => t.slug === slug)
      : data?.activeTeamId
        ? teams.find(t => t.id === data.activeTeamId)
        : teams[0]
  ) ?? null

  return {
    currentTeam: currentTeam
      ? { id: currentTeam.id, name: currentTeam.name, slug: currentTeam.slug, image: currentTeam.image ?? null }
      : null,
    isLoading,
  }
}
