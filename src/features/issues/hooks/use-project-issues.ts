import { useQuery } from '@tanstack/react-query';
import { getProjectIssues, type GetProjectIssuesParams } from '../api/get-project-issues';

export type UseProjectIssuesParams = GetProjectIssuesParams;

export function useProjectIssues({ projectId, ...filters }: UseProjectIssuesParams) {
  return useQuery({
    queryKey: ['projects', projectId, 'issues', filters],
    queryFn: () => getProjectIssues({ projectId, ...filters }),
    enabled: !!projectId,
    staleTime: 0, // Always consider data stale to ensure fresh data on mount
    refetchOnMount: true, // Refetch when component mounts (e.g., after navigation)
  });
}

