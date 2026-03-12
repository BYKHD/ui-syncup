// ============================================================================
// ISSUE SHARE LINK MOCKS
// ============================================================================

import type { IssuePermissions } from '@/features/issues/types';

interface IssueShareLink {
  token: string;
  issueId: string;
  issueKey: string;
  expiresAt: string;
  createdByUserId: string;
  permissions: IssuePermissions;
  note?: string;
}

// Ready-to-wire default permissions for a public, read-only share link
const READ_ONLY_PERMISSIONS: IssuePermissions = {
  canEdit: false,
  canDelete: false,
  canComment: false,
  canAssign: false,
  canChangeStatus: false,
};

export const ISSUE_SHARE_LINKS: IssueShareLink[] = [
  {
    token: 'share_issue_1',
    issueId: 'issue_1',
    issueKey: 'MKT-101',
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // +24h
    createdByUserId: 'user_2',
    permissions: READ_ONLY_PERMISSIONS,
    note: 'Read-only share link for previewing the issue UI',
  },
];

export const DEFAULT_ISSUE_SHARE_SCENARIO = {
  links: ISSUE_SHARE_LINKS,
};

export function getIssueShareByToken(token: string): IssueShareLink | null {
  return ISSUE_SHARE_LINKS.find((link) => link.token === token) ?? null;
}

export function isIssueShareExpired(link: IssueShareLink): boolean {
  return new Date(link.expiresAt).getTime() < Date.now();
}
