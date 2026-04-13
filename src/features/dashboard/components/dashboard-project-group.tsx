'use client'

import { useState } from 'react'
import { RiArrowDownSLine, RiArrowRightSLine } from '@remixicon/react'
import { DashboardIssueRow } from './dashboard-issue-row'
import type { IssueProjectGroup } from '../types'

const STORAGE_KEY = 'dashboard:collapsed-projects'

function getCollapsed(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

function saveCollapsed(set: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
  } catch {
    // ignore
  }
}

interface DashboardProjectGroupProps {
  group: IssueProjectGroup
}

export function DashboardProjectGroup({ group }: DashboardProjectGroupProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() =>
    getCollapsed().has(group.projectId)
  )

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev
      const set = getCollapsed()
      if (next) {
        set.add(group.projectId)
      } else {
        set.delete(group.projectId)
      }
      saveCollapsed(set)
      return next
    })
  }

  const ChevronIcon = collapsed ? RiArrowRightSLine : RiArrowDownSLine

  return (
    <div className="flex flex-col gap-0">
      {/* Group header */}
      <button
        onClick={toggle}
        className="flex items-center gap-2 py-2 text-left hover:opacity-80"
        aria-expanded={!collapsed}
      >
        <ChevronIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">{group.projectName}</span>
        <span className="text-xs text-muted-foreground">
          · {group.issues.length} {group.issues.length === 1 ? 'issue' : 'issues'}
        </span>
        <span className="flex-1 border-t border-dashed border-border ml-2" />
      </button>

      {/* Issues */}
      {!collapsed && (
        <div className="flex flex-col gap-1.5 pl-6">
          {group.issues.map((issue) => (
            <DashboardIssueRow key={issue.id} issue={issue} />
          ))}
        </div>
      )}
    </div>
  )
}
