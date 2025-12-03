import { useTeams } from '@/features/teams/hooks/use-teams'
import Cookies from 'js-cookie'

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
  const { data, isLoading } = useTeams()
  
  // Get the team ID from the cookie
  const teamIdCookie = Cookies.get('team_id')
  
  // Find the team that matches the cookie, or fall back to the first team
  const currentTeam = data?.teams?.find(t => t.id === teamIdCookie) ?? data?.teams?.[0] ?? null

  return {
    currentTeam: currentTeam ? {
      id: currentTeam.id,
      name: currentTeam.name,
      image: currentTeam.image ?? null
    } : null,
    isLoading,
  }
}
