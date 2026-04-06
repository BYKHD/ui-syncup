import { useQuery } from '@tanstack/react-query'
import { getMyIssues } from '../api/get-my-issues'

export const MY_ISSUES_QUERY_KEY = ['dashboard', 'my-issues'] as const

export function useMyIssues() {
  const query = useQuery({
    queryKey: MY_ISSUES_QUERY_KEY,
    queryFn: getMyIssues,
    staleTime: 60 * 1000, // 1 minute
  })

  return {
    ...query,
    issues: query.data?.issues ?? [],
  }
}
