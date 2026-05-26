import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import IssuesList from '../issues-list'
import type { IssueSummary } from '@/features/issues/types'

const baseIssue: IssueSummary = {
  id: 'issue-1',
  issueKey: 'WEB-1',
  title: 'Button alignment is off',
  type: 'visual',
  priority: 'medium',
  status: 'in_progress',
  projectId: 'project-1',
  createdAt: '2026-01-05T12:00:00.000Z',
  updatedAt: '2026-01-06T12:00:00.000Z',
}

describe('IssuesList', () => {
  it('does not apply the status row border color to issue rows', () => {
    render(<IssuesList issues={[baseIssue]} />)

    const row = screen.getByText(baseIssue.title).closest('tr')

    expect(row).toHaveClass('hover:bg-blue-50')
    expect(row).not.toHaveClass('border-l-blue-500')
    expect(row).not.toHaveClass('dark:border-l-blue-400')
  })
})
