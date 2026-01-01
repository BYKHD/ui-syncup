import { useQuery } from '@tanstack/react-query';
import { getProjectIssues, type GetProjectIssuesParams } from '../api/get-project-issues';

export type UseProjectIssuesParams = GetProjectIssuesParams;

export function useProjectIssues({ projectId, ...filters }: UseProjectIssuesParams) {
  return useQuery({
    queryKey: ['projects', projectId, 'issues', filters],
    queryFn: () => getProjectIssues({ projectId, ...filters }),
    enabled: !!projectId,
    staleTime: 30 * 1000, // 30 seconds - use cached data to prevent skeleton flashes
  });
}

