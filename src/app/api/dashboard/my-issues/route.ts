import { NextResponse } from 'next/server'
import { getSession } from '@/server/auth/session'
import { db } from '@/lib/db'
import { issues } from '@/server/db/schema/issues'
import { projects } from '@/server/db/schema/projects'
import { eq, and, ne, desc } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import type { MyIssue } from '@/features/dashboard/types'

/**
 * GET /api/dashboard/my-issues
 *
 * Returns all non-archived issues assigned to the current user across every
 * project, joined with project name and key for cross-project grouping.
 *
 * Response:
 * { issues: MyIssue[] }
 */
export async function GET() {
  try {
    const user = await getSession()

    if (!user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
    }

    const rows = await db
      .select({
        id: issues.id,
        issueKey: issues.issueKey,
        title: issues.title,
        priority: issues.priority,
        status: issues.status,
        projectId: issues.projectId,
        projectName: projects.name,
        projectKey: projects.key,
        updatedAt: issues.updatedAt,
      })
      .from(issues)
      .innerJoin(projects, eq(issues.projectId, projects.id))
      .where(
        and(
          eq(issues.assigneeId, user.id),
          ne(issues.status, 'archived'),
        )
      )
      .orderBy(desc(issues.updatedAt))

    const myIssues: MyIssue[] = rows.map((row) => ({
      ...row,
      updatedAt: row.updatedAt.toISOString(),
    }))

    logger.info('api.dashboard.my-issues.success', {
      userId: user.id,
      count: myIssues.length,
    })

    return NextResponse.json({ issues: myIssues })
  } catch (error) {
    logger.error('api.dashboard.my-issues.error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR' } },
      { status: 500 },
    )
  }
}
