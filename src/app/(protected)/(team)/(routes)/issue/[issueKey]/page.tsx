// ============================================================================
// ISSUE DETAILS PAGE
// Next.js App Router page for viewing issue details
// ============================================================================

import { AppHeaderConfigurator, type BreadcrumbItem } from '@/components/shared/headers';
import { IssueDetailsScreen } from '@/features/issues';
import type { IssuePermissions } from '@/features/issues/types';
import { AccessRequestScreen } from '@/features/projects';
import type { AccessRequest } from '@/features/projects/api';
import { db } from '@/lib/db';
import { teams } from '@/server/db/schema';
import { getIssueByKeyOnly } from '@/server/issues';
import { getMyLatestAccessRequest, getProjectForAccessCheck } from '@/server/projects';
import { getProject } from '@/server/projects/project-service';
import { getSession } from '@/server/auth/session';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface IssuePageProps {
  params: Promise<{
    issueKey: string;
  }>;
}

const GENERIC_ISSUE_METADATA: Metadata = {
  title: 'Issue',
};

/**
 * Generate metadata for the issue page
 */
export async function generateMetadata({ params }: IssuePageProps): Promise<Metadata> {
  const { issueKey } = await params;
  const issue = await getIssueByKeyOnly(issueKey);

  if (!issue) {
    return {
      title: 'Issue Not Found',
    };
  }

  const session = await getSession();
  const userId = session?.id;
  if (!userId) {
    return GENERIC_ISSUE_METADATA;
  }

  const access = await getProjectForAccessCheck(issue.projectId, userId);
  if (!access?.hasAccess) {
    return GENERIC_ISSUE_METADATA;
  }

  return {
    title: `${issue.issueKey} - ${issue.title}`,
    description: issue.description?.substring(0, 160) ?? '',
  };
}

/**
 * Issue Details Page
 *
 * Displays the full issue details view with attachments and activity timeline.
 * Uses real API data via getIssueByKeyOnly server function.
 *
 * @param params - Route parameters containing the issue key (e.g., "MKT-101")
 */
export default async function IssuePage({ params }: IssuePageProps) {
  const { issueKey } = await params;

  // Look up issue by key from database
  const issue = await getIssueByKeyOnly(issueKey);

  // Handle not found
  if (!issue) {
    notFound();
  }

  // Get session for user ID
  const session = await getSession();
  const userId = session?.id;

  if (!userId) {
    // Should typically be handled by middleware, but safe guard here
    return notFound();
  }

  const access = await getProjectForAccessCheck(issue.projectId, userId);
  if (!access) {
    notFound();
  }

  if (!access.hasAccess) {
    const teamRow = await db
      .select({ name: teams.name })
      .from(teams)
      .where(eq(teams.id, access.project.teamId))
      .limit(1);
    const existingRequest = await getMyLatestAccessRequest(access.project.id, userId);
    const serializedExistingRequest: AccessRequest | null = existingRequest
      ? {
          ...existingRequest,
          decidedAt: existingRequest.decidedAt?.toISOString() ?? null,
          declineCooldownUntil: existingRequest.declineCooldownUntil?.toISOString() ?? null,
          createdAt: existingRequest.createdAt.toISOString(),
        }
      : null;

    return (
      <AccessRequestScreen
        project={{ id: access.project.id, name: access.project.name, slug: access.project.slug }}
        teamName={teamRow[0]?.name ?? ''}
        existingRequest={serializedExistingRequest}
      />
    );
  }

  // Get project for breadcrumbs and permission derivation
  const project = await getProject(issue.projectId, userId);

  // Derive permissions from project role + assignee.
  // PROJECT_MEMBER may only update/change status when they are the assigned user.
  // TEAM_MEMBER and unrelated visitors (userRole === null) get view-only access.
  const isAssignedUser = issue.assigneeId === userId;

  const issuePermissions: IssuePermissions = (() => {
    switch (project.userRole) {
      case 'owner':
        return { canEdit: true, canDelete: true, canComment: true, canAssign: true, canChangeStatus: true };
      case 'editor':
        return { canEdit: true, canDelete: true, canComment: true, canAssign: true, canChangeStatus: true };
      case 'member':
        return { canEdit: isAssignedUser, canDelete: false, canComment: true, canAssign: false, canChangeStatus: isAssignedUser };
      case 'viewer':
      default:
        return { canEdit: false, canDelete: false, canComment: false, canAssign: false, canChangeStatus: false };
    }
  })();

  const issueBreadcrumbs: BreadcrumbItem[] = [
    { label: 'Projects', href: '/projects' },
    { label: project.name, href: `/${project.slug}` },
    { label: issue.issueKey },
  ];

  return (
    <>
      <AppHeaderConfigurator
        pageName={issue.issueKey}
        breadcrumbs={issueBreadcrumbs}
      />
      <div className="h-full flex flex-col">
        {/* Issue Details Screen */}
        <div className="flex-1 overflow-hidden">
          <IssueDetailsScreen issueId={issue.id} userId={userId} permissions={issuePermissions} />
        </div>
      </div>
    </>
  );
}
