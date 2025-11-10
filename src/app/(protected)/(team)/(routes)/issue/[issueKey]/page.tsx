// ============================================================================
// ISSUE DETAILS PAGE
// Next.js App Router page for viewing issue details
// ============================================================================

import { IssueDetailsScreen } from '@/features/issues';
import { getDetailedIssueByKey } from '@/src/mocks/issue.fixtures';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface IssuePageProps {
  params: {
    issueKey: string;
  };
}

/**
 * Generate metadata for the issue page
 */
export async function generateMetadata({ params }: IssuePageProps): Promise<Metadata> {
  const issueKey = params.issueKey;
  const issue = getDetailedIssueByKey(issueKey);

  if (!issue) {
    return {
      title: 'Issue Not Found',
    };
  }

  return {
    title: `${issue.issueKey} - ${issue.title}`,
    description: issue.description.substring(0, 160),
  };
}

/**
 * Issue Details Page
 *
 * Displays the full issue details view with attachments and activity timeline.
 * Uses the ready-to-wire IssueDetailsScreen component with mock data.
 *
 * @param params - Route parameters containing the issue key (e.g., "MKT-101")
 */
export default function IssuePage({ params }: IssuePageProps) {
  const issueKey = params.issueKey;

  // Look up issue by key to get the ID
  // In production, this would be a server-side database query
  const issue = getDetailedIssueByKey(issueKey);

  // Handle not found
  if (!issue) {
    notFound();
  }

  // Mock user ID - in production, get from session
  const userId = 'user_1';

  return (
    <div className="h-screen flex flex-col">
      {/* Issue Details Screen */}
      <div className="flex-1 overflow-hidden">
        <IssueDetailsScreen issueId={issue.id} userId={userId} />
      </div>
    </div>
  );
}
