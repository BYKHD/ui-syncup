'use client'

import { useMemo, useState } from 'react'
import type { ProjectSummary } from '@/features/projects/types'

export interface ProjectFilters {
  search: string
  status: 'all' | 'active' | 'archived'
  visibility: 'all' | 'private' | 'public'
  userRole: 'all' | 'owner' | 'editor' | 'member' | 'viewer'
  sortBy: 'name' | 'updated' | 'created' | 'progress'
  sortOrder: 'asc' | 'desc'
}

const DEFAULT_FILTERS: ProjectFilters = {
  search: '',
  status: 'all',
  visibility: 'all',
  userRole: 'all',
  sortBy: 'updated',
  sortOrder: 'desc',
}

export function useProjectFilters(projects: ProjectSummary[]) {
  const [filters, setFilters] = useState<ProjectFilters>(DEFAULT_FILTERS)

  const filteredProjects = useMemo(() => {
    let result = [...projects]

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower)
      )
    }

    // Status filter
    if (filters.status !== 'all') {
      result = result.filter((p) => p.status === filters.status)
    }

    // Visibility filter
    if (filters.visibility !== 'all') {
      result = result.filter((p) => p.visibility === filters.visibility)
    }

    // Role filter
    if (filters.userRole !== 'all') {
      result = result.filter((p) => p.userRole === filters.userRole)
    }

    // Sort
    result.sort((a, b) => {
      let compareValue = 0

      switch (filters.sortBy) {
        case 'name':
          compareValue = a.name.localeCompare(b.name)
          break
        case 'updated':
          compareValue = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
          break
        case 'progress':
          compareValue = a.stats.progressPercent - b.stats.progressPercent
          break
        default:
          compareValue = 0
      }

      return filters.sortOrder === 'asc' ? compareValue : -compareValue
    })

    return result
  }, [projects, filters])

  return {
    filters,
    setFilters,
    filteredProjects,
    totalCount: projects.length,
    filteredCount: filteredProjects.length,
  }
}
