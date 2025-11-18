import { IssueShareScreen } from '@/features/issues';
import { getIssueShareByToken, isIssueShareExpired } from '@/mocks/share.fixtures';
import { getDetailedIssueById } from '@/mocks/issue.fixtures';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface IssueSharePageProps {
  params: Promise<{
    token: string;
  }>;
}

export async function generateMetadata({ params }: IssueSharePageProps): Promise<Metadata> {
  const { token } = await params;
  const share = getIssueShareByToken(token);

  if (!share || isIssueShareExpired(share)) {
    return {
      title: 'Issue preview unavailable',
    };
  }

  const detailedIssue = getDetailedIssueById(share.issueId);

  return {
    title: detailedIssue ? `${detailedIssue.issueKey} preview` : 'Issue preview',
    description: detailedIssue?.description.slice(0, 140),
  };
}

export default async function IssueSharePage({ params }: IssueSharePageProps) {
  const { token } = await params;
  const share = getIssueShareByToken(token);

  if (!share || isIssueShareExpired(share)) {
    notFound();
  }

  const issue = getDetailedIssueById(share.issueId);
  if (!issue) {
    notFound();
  }

  return (
    <IssueShareScreen
      issueId={issue.id}
      issueKey={issue.issueKey}
      expiresAt={share.expiresAt}
    />
  );
}
