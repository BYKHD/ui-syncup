/**
 * USE PROJECT ACTIVITIES (INFINITE) HOOK
 * Paginated project activity feed with "load more" support.
 */

import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { getProjectActivities } from '../api/get-project-activities'
import { projectKeys } from './use-project'
import type { ProjectActivity } from '../api/types'

export interface UseProjectActivitiesInfiniteParams {
  projectId: string
  /** Items fetched per page (default 25) */
  pageSize?: number
  enabled?: boolean
}

/**
 * Fetches project activities one page at a time via `useInfiniteQuery`.
 *
 * Pages are flattened and de-duplicated by id — offset pagination can re-include
 * a row that shifted down if a new activity is logged between page fetches.
 */
export function useProjectActivitiesInfinite({
  projectId,
  pageSize = 25,
  enabled = true,
}: UseProjectActivitiesInfiniteParams) {
  const query = useInfiniteQuery({
    queryKey: [...projectKeys.activitiesInfinite(projectId), pageSize],
    queryFn: ({ pageParam }) =>
      getProjectActivities(projectId, { page: pageParam, limit: pageSize }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination?.hasMore ? lastPage.pagination.page + 1 : undefined,
    enabled: enabled && !!projectId,
    staleTime: 30 * 1000, // 30 seconds
  })

  const activities = useMemo(() => {
    const seen = new Set<string>()
    const out: ProjectActivity[] = []
    for (const page of query.data?.pages ?? []) {
      for (const activity of page.activities) {
        if (!seen.has(activity.id)) {
          seen.add(activity.id)
          out.push(activity)
        }
      }
    }
    return out
  }, [query.data])

  return {
    activities,
    total: query.data?.pages[0]?.pagination?.total ?? activities.length,
    isLoading: query.isLoading,
    // `isPending` is true until the first page resolves — the right signal for a
    // gated (enabled-on-open) query, since it never flashes empty mid-transition.
    isPending: query.isPending,
    isError: query.isError,
    error: query.error as Error | null,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  }
}
