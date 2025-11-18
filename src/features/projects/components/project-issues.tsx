'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RiAddLine } from '@remixicon/react'
import { IssuesList, IssuesListFilter, useIssueFilters } from '@/features/issues'
import { MOCK_ISSUES } from '@/mocks/issue.fixtures'

interface ProjectIssuesProps {
  projectId: string
  onCreateIssue?: () => void
  isLoading?: boolean
}

export default function ProjectIssues({
  projectId,
  onCreateIssue,
  isLoading = false,
}: ProjectIssuesProps) {
  // TODO: wire GET /api/projects/:projectId/issues
  // Filter issues for this project only
  const projectIssues = MOCK_ISSUES.filter(
    (issue) => issue.projectId === projectId
  )

  const {
    filters,
    setFilters,
    filteredIssues,
    totalCount,
    filteredCount,
  } = useIssueFilters(projectIssues)

  const hasIssues = totalCount > 0

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
        {hasIssues ? (
          <>
            <IssuesListFilter
              filters={filters}
              onFiltersChange={setFilters}
              totalCount={totalCount}
              filteredCount={filteredCount}
            />
            <IssuesList issues={filteredIssues} isLoading={isLoading} />
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
