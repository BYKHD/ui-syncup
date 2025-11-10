'use client'

import React from 'react'
import {
  RiSearchLine,
  RiFilterLine,
  RiCloseLine,
  RiBugLine,
  RiLightbulbLine,
  RiToolsLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiEqualLine,
  RiAlertLine,
} from '@remixicon/react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

import type { IssueFilters } from '@/features/issues/hooks/use-issue-filters'

interface IssuesListFilterProps {
  filters: IssueFilters
  onFiltersChange: (filters: IssueFilters) => void
  totalCount: number
  filteredCount: number
}

export function IssuesListFilter({
  filters,
  onFiltersChange,
  totalCount,
  filteredCount,
}: IssuesListFilterProps) {
  const updateFilter = <K extends keyof IssueFilters>(
    key: K,
    value: IssueFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      status: 'all',
      type: 'all',
      priority: 'all',
      sortBy: 'updated',
      sortOrder: 'desc',
    })
  }

  const hasActiveFilters =
    filters.search !== '' ||
    filters.status !== 'all' ||
    filters.type !== 'all' ||
    filters.priority !== 'all'

  const getActiveFilterCount = () => {
    let count = 0
    if (filters.search !== '') count++
    if (filters.status !== 'all') count++
    if (filters.type !== 'all') count++
    if (filters.priority !== 'all') count++
    return count
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug':
        return <RiBugLine className="h-3 w-3" />
      case 'feature':
        return <RiLightbulbLine className="h-3 w-3" />
      case 'improvement':
        return <RiToolsLine className="h-3 w-3" />
      default:
        return null
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <RiAlertLine className="h-3 w-3" />
      case 'high':
        return <RiArrowUpLine className="h-3 w-3" />
      case 'medium':
        return <RiEqualLine className="h-3 w-3" />
      case 'low':
        return <RiArrowDownLine className="h-3 w-3" />
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
              placeholder="Search issues..."
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
                All Status
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.status === 'open'}
                onCheckedChange={() => updateFilter('status', 'open')}
              >
                Open
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.status === 'in_progress'}
                onCheckedChange={() => updateFilter('status', 'in_progress')}
              >
                In Progress
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.status === 'in_review'}
                onCheckedChange={() => updateFilter('status', 'in_review')}
              >
                In Review
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.status === 'resolved'}
                onCheckedChange={() => updateFilter('status', 'resolved')}
              >
                Resolved
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.status === 'archived'}
                onCheckedChange={() => updateFilter('status', 'archived')}
              >
                Archived
              </DropdownMenuCheckboxItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>Type</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={filters.type === 'all'}
                onCheckedChange={() => updateFilter('type', 'all')}
              >
                All Types
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.type === 'bug'}
                onCheckedChange={() => updateFilter('type', 'bug')}
              >
                {getTypeIcon('bug')}
                <span className="ml-2">Bug</span>
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.type === 'feature'}
                onCheckedChange={() => updateFilter('type', 'feature')}
              >
                {getTypeIcon('feature')}
                <span className="ml-2">Feature</span>
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.type === 'improvement'}
                onCheckedChange={() => updateFilter('type', 'improvement')}
              >
                {getTypeIcon('improvement')}
                <span className="ml-2">Improvement</span>
              </DropdownMenuCheckboxItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>Priority</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={filters.priority === 'all'}
                onCheckedChange={() => updateFilter('priority', 'all')}
              >
                All Priorities
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.priority === 'critical'}
                onCheckedChange={() => updateFilter('priority', 'critical')}
              >
                {getPriorityIcon('critical')}
                <span className="ml-2">Critical</span>
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.priority === 'high'}
                onCheckedChange={() => updateFilter('priority', 'high')}
              >
                {getPriorityIcon('high')}
                <span className="ml-2">High</span>
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.priority === 'medium'}
                onCheckedChange={() => updateFilter('priority', 'medium')}
              >
                {getPriorityIcon('medium')}
                <span className="ml-2">Medium</span>
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.priority === 'low'}
                onCheckedChange={() => updateFilter('priority', 'low')}
              >
                {getPriorityIcon('low')}
                <span className="ml-2">Low</span>
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
                IssueFilters['sortBy'],
                IssueFilters['sortOrder']
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
              <SelectItem value="key-asc">Key A-Z</SelectItem>
              <SelectItem value="key-desc">Key Z-A</SelectItem>
              <SelectItem value="title-asc">Title A-Z</SelectItem>
              <SelectItem value="title-desc">Title Z-A</SelectItem>
              <SelectItem value="priority-desc">Priority High-Low</SelectItem>
              <SelectItem value="priority-asc">Priority Low-High</SelectItem>
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
            <Badge variant="secondary" className="gap-1 capitalize">
              Status: {filters.status.replace('_', ' ')}
              <button
                onClick={() => updateFilter('status', 'all')}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
              >
                <RiCloseLine className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.type !== 'all' && (
            <Badge variant="secondary" className="gap-1 capitalize">
              {getTypeIcon(filters.type)}
              {filters.type}
              <button
                onClick={() => updateFilter('type', 'all')}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
              >
                <RiCloseLine className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.priority !== 'all' && (
            <Badge variant="secondary" className="gap-1 capitalize">
              {getPriorityIcon(filters.priority)}
              {filters.priority}
              <button
                onClick={() => updateFilter('priority', 'all')}
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
          ? `Showing all ${totalCount} issue${totalCount !== 1 ? 's' : ''}`
          : `Showing ${filteredCount} of ${totalCount} issue${totalCount !== 1 ? 's' : ''}`}
      </div>
    </div>
  )
}
