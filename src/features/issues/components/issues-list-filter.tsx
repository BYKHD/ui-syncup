'use client'

import React from 'react'
import { RiSearchLine, RiFilterLine, RiCloseLine } from '@remixicon/react'

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
import {
  PRIORITY_OPTIONS,
  TYPE_OPTIONS,
  type PriorityOption,
  type TypeOption,
} from '@/features/issues/config'

import type { IssueFilters } from '@/features/issues/utils'

const TYPE_OPTION_MAP = Object.fromEntries(TYPE_OPTIONS.map(option => [option.value, option])) as Record<
  TypeOption['value'],
  TypeOption
>

const PRIORITY_OPTION_MAP = Object.fromEntries(
  PRIORITY_OPTIONS.map(option => [option.value, option]),
) as Record<PriorityOption['value'], PriorityOption>

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

  const activeTypeOption = filters.type !== 'all' ? TYPE_OPTION_MAP[filters.type] : undefined
  const activePriorityOption =
    filters.priority !== 'all' ? PRIORITY_OPTION_MAP[filters.priority] : undefined

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
              {TYPE_OPTIONS.map(option => (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  checked={filters.type === option.value}
                  onCheckedChange={() => updateFilter('type', option.value)}
                >
                  <option.icon className="h-3 w-3" />
                  <span className="ml-2">{option.label}</span>
                </DropdownMenuCheckboxItem>
              ))}

              <DropdownMenuSeparator />
              <DropdownMenuLabel>Priority</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={filters.priority === 'all'}
                onCheckedChange={() => updateFilter('priority', 'all')}
              >
                All Priorities
              </DropdownMenuCheckboxItem>
              {PRIORITY_OPTIONS.map(option => (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  checked={filters.priority === option.value}
                  onCheckedChange={() => updateFilter('priority', option.value)}
                >
                  <option.icon className="h-3 w-3" />
                  <span className="ml-2">{option.label}</span>
                </DropdownMenuCheckboxItem>
              ))}

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
          {activeTypeOption && (
            <Badge variant="secondary" className="gap-1 capitalize">
              <activeTypeOption.icon className="h-3 w-3" />
              {activeTypeOption.label}
              <button
                onClick={() => updateFilter('type', 'all')}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
              >
                <RiCloseLine className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {activePriorityOption && (
            <Badge variant="secondary" className="gap-1 capitalize">
              <activePriorityOption.icon className="h-3 w-3" />
              {activePriorityOption.label}
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
