'use client'

import React from 'react'
import {
  RiSearchLine,
  RiFilterLine,
  RiCloseLine,
  RiLockLine,
  RiGlobalLine,
  RiVipCrownLine,
  RiEditLine,
  RiTeamLine,
  RiEyeLine,
} from '@remixicon/react'

import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@components/ui/dropdown-menu'
import { Badge } from '@components/ui/badge'

import type { ProjectFilters } from '@features/projects/hooks'

interface ProjectFiltersProps {
  filters: ProjectFilters
  onFiltersChange: (filters: ProjectFilters) => void
  totalCount: number
  filteredCount: number
}

export function ProjectFiltersComponent({
  filters,
  onFiltersChange,
  totalCount,
  filteredCount,
}: ProjectFiltersProps) {
  const updateFilter = <K extends keyof ProjectFilters>(
    key: K,
    value: ProjectFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      status: 'all',
      visibility: 'all',
      userRole: 'all',
      sortBy: 'updated',
      sortOrder: 'desc',
    })
  }

  const hasActiveFilters =
    filters.search !== '' ||
    filters.status !== 'all' ||
    filters.visibility !== 'all' ||
    filters.userRole !== 'all'

  const getActiveFilterCount = () => {
    let count = 0
    if (filters.search !== '') count++
    if (filters.status !== 'all') count++
    if (filters.visibility !== 'all') count++
    if (filters.userRole !== 'all') count++
    return count
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <RiVipCrownLine className="h-3 w-3" />
      case 'editor':
        return <RiEditLine className="h-3 w-3" />
      case 'member':
        return <RiTeamLine className="h-3 w-3" />
      case 'viewer':
        return <RiEyeLine className="h-3 w-3" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <RiSearchLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <RiFilterLine className="h-4 w-4" />
                Filter
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                    {getActiveFilterCount()}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={filters.status === 'all'}
                onCheckedChange={() => updateFilter('status', 'all')}
              >
                All Projects
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.status === 'active'}
                onCheckedChange={() => updateFilter('status', 'active')}
              >
                Active
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.status === 'archived'}
                onCheckedChange={() => updateFilter('status', 'archived')}
              >
                Archived
              </DropdownMenuCheckboxItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>Visibility</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={filters.visibility === 'all'}
                onCheckedChange={() => updateFilter('visibility', 'all')}
              >
                All Types
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.visibility === 'private'}
                onCheckedChange={() => updateFilter('visibility', 'private')}
              >
                <RiLockLine className="h-3 w-3 mr-2" />
                Private
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.visibility === 'public'}
                onCheckedChange={() => updateFilter('visibility', 'public')}
              >
                <RiGlobalLine className="h-3 w-3 mr-2" />
                Public
              </DropdownMenuCheckboxItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>My Role</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={filters.userRole === 'all'}
                onCheckedChange={() => updateFilter('userRole', 'all')}
              >
                All Roles
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.userRole === 'owner'}
                onCheckedChange={() => updateFilter('userRole', 'owner')}
              >
                {getRoleIcon('owner')}
                <span className="ml-2">Owner</span>
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.userRole === 'editor'}
                onCheckedChange={() => updateFilter('userRole', 'editor')}
              >
                {getRoleIcon('editor')}
                <span className="ml-2">Editor</span>
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.userRole === 'member'}
                onCheckedChange={() => updateFilter('userRole', 'member')}
              >
                {getRoleIcon('member')}
                <span className="ml-2">Member</span>
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.userRole === 'viewer'}
                onCheckedChange={() => updateFilter('userRole', 'viewer')}
              >
                {getRoleIcon('viewer')}
                <span className="ml-2">Viewer</span>
              </DropdownMenuCheckboxItem>

              {hasActiveFilters && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={clearFilters}>
                    <RiCloseLine className="h-4 w-4 mr-2" />
                    Clear Filters
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <RiCloseLine className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2">
          <Select
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onValueChange={(value) => {
              const [sortBy, sortOrder] = value.split('-') as [
                ProjectFilters['sortBy'],
                ProjectFilters['sortOrder']
              ];
              onFiltersChange({ ...filters, sortBy, sortOrder });
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated-desc">Recently Updated</SelectItem>
              <SelectItem value="updated-asc">Oldest Updated</SelectItem>
              <SelectItem value="created-desc">Recently Created</SelectItem>
              <SelectItem value="created-asc">Oldest Created</SelectItem>
              <SelectItem value="name-asc">Name A-Z</SelectItem>
              <SelectItem value="name-desc">Name Z-A</SelectItem>
              <SelectItem value="progress-desc">Progress High-Low</SelectItem>
              <SelectItem value="progress-asc">Progress Low-High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Search: "{filters.search}"
              <button
                onClick={() => updateFilter('search', '')}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
              >
                <RiCloseLine className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.status !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Status: {filters.status}
              <button
                onClick={() => updateFilter('status', 'all')}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
              >
                <RiCloseLine className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.visibility !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {filters.visibility === 'private' ? <RiLockLine className="h-3 w-3" /> : <RiGlobalLine className="h-3 w-3" />}
              {filters.visibility}
              <button
                onClick={() => updateFilter('visibility', 'all')}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
              >
                <RiCloseLine className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.userRole !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {getRoleIcon(filters.userRole)}
              Role: {filters.userRole}
              <button
                onClick={() => updateFilter('userRole', 'all')}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
              >
                <RiCloseLine className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {filteredCount === totalCount
          ? `Showing all ${totalCount} project${totalCount !== 1 ? 's' : ''}`
          : `Showing ${filteredCount} of ${totalCount} project${totalCount !== 1 ? 's' : ''}`}
      </div>
    </div>
  )
}