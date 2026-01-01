'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RiAddLine } from '@remixicon/react'
import { IssuesList, IssuesListFilter, useIssueFilters, useProjectIssues } from '@/features/issues'
import type { IssueSummary } from '@/features/issues/types'

interface ProjectIssuesProps {
  projectId: string
  onCreateIssue?: () => void
  /** Server-prefetched issues for instant display (eliminates loading state) */
  initialIssues?: IssueSummary[]
}

/**
 * ProjectIssues - Manages loading state at this level to prevent
 * duplicate skeletons from route loading.tsx + child component
 * 
 * Supports initialIssues from server-side prefetching to eliminate
 * the client-side loading state entirely.
 */
export default function ProjectIssues({
  projectId,
  onCreateIssue,
  initialIssues,
}: ProjectIssuesProps) {
  const router = useRouter()
  const { data, isLoading } = useProjectIssues({ projectId })
  
  // Use server-prefetched data if available, otherwise use React Query data
  // This eliminates loading state when SSR prefetch is successful
  const projectIssues = initialIssues ?? data?.issues ?? []
  
  // Only show loading if we have no data at all (neither initial nor fetched)
  const showLoading = isLoading && !initialIssues && !data

  const {
    filters,
    setFilters,
    filteredIssues,
    totalCount,
    filteredCount,
  } = useIssueFilters(projectIssues)

  const hasIssues = totalCount > 0

  // Navigate to issue details page when clicking on an issue row
  const handleIssueClick = (issueKey: string) => {
    router.push(`/issue/${issueKey}`)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg">Issues</CardTitle>
          {hasIssues && (
            <CardDescription className="mt-1">
              Track and manage project issues
            </CardDescription>
          )}
        </div>
        {onCreateIssue && (
          <Button onClick={onCreateIssue} size="sm" className="gap-2">
            <RiAddLine className="h-4 w-4" />
            New Issue
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showLoading ? (
          // Single unified skeleton at this level
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-9 w-48" />
              <Skeleton className="h-9 w-32" />
            </div>
            <div className="rounded-md border">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center gap-4 p-4 border-b last:border-b-0">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                  <div className="flex items-center gap-2 flex-1">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </div>
        ) : hasIssues ? (
          <>
            <IssuesListFilter
              filters={filters}
              onFiltersChange={setFilters}
              totalCount={totalCount}
              filteredCount={filteredCount}
            />
            <IssuesList 
              issues={filteredIssues} 
              onIssueClick={handleIssueClick}
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
            <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
              <h3 className="text-lg font-semibold">No issues yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Create your first issue to start tracking work for this project
              </p>
              {onCreateIssue && (
                <Button onClick={onCreateIssue} className="mt-4 gap-2">
                  <RiAddLine className="h-4 w-4" />
                  Create Issue
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

