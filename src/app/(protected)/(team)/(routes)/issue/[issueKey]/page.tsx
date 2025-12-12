// ============================================================================
// ISSUE DETAILS PAGE
// Next.js App Router page for viewing issue details
// ============================================================================

import { AppHeaderConfigurator, type BreadcrumbItem } from '@/components/shared/headers';
import { IssueDetailsScreen } from '@/features/issues';
import { getIssueByKeyOnly } from '@/server/issues';
import { getProject } from '@/server/projects/project-service';
import { getSession } from '@/server/auth/session';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface IssuePageProps {
  params: Promise<{
    issueKey: string;
  }>;
}

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

  // Get project for breadcrumbs
  const project = await getProject(issue.projectId, userId);

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
          <IssueDetailsScreen issueId={issue.id} userId={userId} />
        </div>
      </div>
    </>
  );
}

