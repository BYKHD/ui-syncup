import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { DashboardFilters, IssueProjectGroup } from '../types'

interface DashboardFiltersProps {
  filters: DashboardFilters
  projectGroups: IssueProjectGroup[]
  onFiltersChange: (filters: DashboardFilters) => void
}

export function DashboardFiltersBar({
  filters,
  projectGroups,
  onFiltersChange,
}: DashboardFiltersProps) {
  function update<K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={filters.status}
        onValueChange={(v) => update('status', v as DashboardFilters['status'])}
      >
        <SelectTrigger className="h-8 w-36 text-sm">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="in_review">In Review</SelectItem>
          <SelectItem value="resolved">Resolved</SelectItem>
          <SelectItem value="archived">Archived</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.priority}
        onValueChange={(v) => update('priority', v as DashboardFilters['priority'])}
      >
        <SelectTrigger className="h-8 w-36 text-sm">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All priorities</SelectItem>
          <SelectItem value="critical">Critical</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>

      {projectGroups.length > 1 && (
        <Select
          value={filters.projectId}
          onValueChange={(v) => update('projectId', v)}
        >
          <SelectTrigger className="h-8 w-44 text-sm">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projectGroups.map((g) => (
              <SelectItem key={g.projectId} value={g.projectId}>
                {g.projectName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
