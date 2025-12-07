'use client'

import { useRouter } from 'next/navigation'
import { RiBox2Line } from '@remixicon/react'

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/shared/headers/page-header'

import { useProjects, useProjectFilters } from '@/features/projects/hooks'
import {
  ProjectCard,
  ProjectCreateDialog,
  ProjectFiltersComponent,
  type ProjectPreview
} from '@/features/projects/components'
import { useTeam } from '@/hooks/use-team'

export default function ProjectsListScreen() {
  const router = useRouter()
  const { currentTeam, isLoading: isTeamLoading } = useTeam()
  const teamId = currentTeam?.id

  const { data: allProjects, isLoading, refetch } = useProjects({ teamId })
  const projectsLoading = isTeamLoading || !teamId || isLoading

  const {
    filters,
    setFilters,
    filteredProjects,
    totalCount,
    filteredCount,
  } = useProjectFilters(allProjects?.projects || [])

  const hasProjects = totalCount > 0
  const hasFilteredProjects = filteredCount > 0

  const handleProjectAdded = (project: ProjectPreview) => {
    refetch()
    router.push(`/${project.slug}`)
  }

  const handleProjectUpdate = () => {
    refetch()
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 lg:px-10">
      <PageHeader
        title="Projects"
        description="Keep a pulse on active cross-functional efforts, spot risks early, and celebrate the teams moving work forward."
        actionsSlot={
          <ProjectCreateDialog onProjectAdded={handleProjectAdded}>
            <Button>Create project</Button>
          </ProjectCreateDialog>
        }
      />

      {projectsLoading ? (
        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="h-40 animate-pulse rounded-lg bg-muted/40"
            />
          ))}
        </section>
      ) : hasProjects ? (
        <>
          <ProjectFiltersComponent
            filters={filters}
            onFiltersChange={setFilters}
            totalCount={totalCount}
            filteredCount={filteredCount}
          />

          {hasFilteredProjects ? (
            <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onUpdate={handleProjectUpdate}
                />
              ))}
            </section>
          ) : (
            <NoFilteredResults
              onClearFilters={() =>
                setFilters({
                  search: '',
                  status: 'all',
                  visibility: 'all',
                  userRole: 'all',
                  sortBy: 'updated',
                  sortOrder: 'desc',
                })
              }
            />
          )}
        </>
      ) : (
        <EmptyState onProjectAdded={handleProjectAdded} />
      )}
    </div>
  )
}

function EmptyState({ onProjectAdded }: { onProjectAdded: (project: ProjectPreview) => void }) {
  return (
    <Empty className="border border-dashed py-16">
      <EmptyMedia variant="icon">
        <RiBox2Line className="size-6" />
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>No projects to show (yet)</EmptyTitle>
        <EmptyDescription>
          Spin up a new initiative or import an existing roadmap to start tracking
          progress in one place.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <ProjectCreateDialog onProjectAdded={onProjectAdded}>
          <Button size="sm">Create first project</Button>
        </ProjectCreateDialog>
        <p className="text-xs text-muted-foreground">
          Need inspiration? Share the template with teammates so everyone reports
          updates consistently.
        </p>
      </EmptyContent>
    </Empty>
  )
}

function NoFilteredResults({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <Empty className="border border-dashed py-16">
      <EmptyMedia variant="icon">
        <RiBox2Line className="size-6" />
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>No projects match your filters</EmptyTitle>
        <EmptyDescription>
          Try adjusting your search terms or filters to find what you're looking for.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button size="sm" onClick={onClearFilters}>
          Clear all filters
        </Button>
      </EmptyContent>
    </Empty>
  );
}
