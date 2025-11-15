// ============================================================================
// ATTACHMENT MOCK FIXTURES
// ============================================================================

import type { IssueAttachment } from '@/features/issues/types';
import { MOCK_ATTACHMENT_USERS, MOCK_CPM101_ANNOTATIONS } from './annotation.fixtures';

// Mock attachments for different issues
// Each issue should have only one "as-is" image attachment
export const MOCK_ATTACHMENTS: IssueAttachment[] = [
  {
    id: 'att_cpm101_as_is',
    issueId: 'issue_1',
    fileName: 'as-is-image.jpg',
    fileSize: 512432,
    fileType: 'image/jpeg',
    url: '/playground/CPM-101/as-is-image.jpg',
    thumbnailUrl: '/playground/CPM-101/as-is-image.jpg',
    width: 1920,
    height: 1350,
    uploadedBy: MOCK_ATTACHMENT_USERS[0],
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    reviewVariant: 'as_is',
    annotations: MOCK_CPM101_ANNOTATIONS,
  },
  {
    id: 'att_cpm101_to_be',
    issueId: 'issue_1',
    fileName: 'to-be-image.jpg',
    fileSize: 498110,
    fileType: 'image/jpeg',
    url: '/playground/CPM-101/to-be-image.jpg',
    thumbnailUrl: '/playground/CPM-101/to-be-image.jpg',
    width: 1920,
    height: 1350,
    uploadedBy: MOCK_ATTACHMENT_USERS[1],
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    reviewVariant: 'to_be',
  },
  {
    id: 'att_dark_mode',
    issueId: 'issue_2',
    fileName: 'dark-mode-mockup.png',
    fileSize: 342567,
    fileType: 'image/png',
    url: '/placeholder.svg?height=1080&width=1920',
    thumbnailUrl: '/placeholder.svg?height=1080&width=1920',
    width: 1920,
    height: 1080,
    uploadedBy: MOCK_ATTACHMENT_USERS[1],
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    reviewVariant: 'as_is',
  },
  {
    id: 'att_perf_report',
    issueId: 'issue_3',
    fileName: 'performance-report.pdf',
    fileSize: 567890,
    fileType: 'application/pdf',
    url: '/placeholder-document.pdf',
    thumbnailUrl: null,
    width: null,
    height: null,
    uploadedBy: MOCK_ATTACHMENT_USERS[2],
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
];

// Helper function to get attachments by issue ID
export function getAttachmentsByIssueId(issueId: string): IssueAttachment[] {
  return MOCK_ATTACHMENTS.filter((att) => att.issueId === issueId);
}

// Helper function to get a single attachment
export function getAttachmentById(attachmentId: string): IssueAttachment | undefined {
  return MOCK_ATTACHMENTS.find((att) => att.id === attachmentId);
}

// Export users for reuse
export { MOCK_ATTACHMENT_USERS };
