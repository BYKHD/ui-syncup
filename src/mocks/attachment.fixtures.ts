// ============================================================================
// ATTACHMENT MOCK FIXTURES
// ============================================================================

import type { IssueAttachment, IssueUser } from '@/src/types/issue';

// Mock users for attachments
const MOCK_ATTACHMENT_USERS: IssueUser[] = [
  {
    id: 'user_1',
    name: 'Sarah Chen',
    email: 'sarah@example.com',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
  },
  {
    id: 'user_2',
    name: 'Mike Johnson',
    email: 'mike@example.com',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
  },
  {
    id: 'user_3',
    name: 'Emma Williams',
    email: 'emma@example.com',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
  },
];

// Mock attachments for different issues
export const MOCK_ATTACHMENTS: IssueAttachment[] = [
  {
    id: 'att_1',
    issueId: 'issue_1',
    fileName: 'LinkedIn-skeleton-screen.png',
    fileSize: 245632,
    fileType: 'image/png',
    url: '/playground/TEST-1/LinkedIn-skeleton-screen.png',
    thumbnailUrl: '/playground/TEST-1/LinkedIn-skeleton-screen.png',
    width: 1920,
    height: 1080,
    uploadedBy: MOCK_ATTACHMENT_USERS[0],
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'att_2',
    issueId: 'issue_1',
    fileName: 'linkedin_skeletonscreen.jpg',
    fileSize: 189456,
    fileType: 'image/jpeg',
    url: '/playground/TEST-1/linkedin_skeletonscreen.jpg',
    thumbnailUrl: '/playground/TEST-1/linkedin_skeletonscreen.jpg',
    width: 1600,
    height: 900,
    uploadedBy: MOCK_ATTACHMENT_USERS[0],
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'att_3',
    issueId: 'issue_1',
    fileName: 'https___dev-to-uploads.s3.amazonaws.com_uploads_articles_vuahe90ka1mkx9aepmea.webp',
    fileSize: 156789,
    fileType: 'image/webp',
    url: '/playground/TEST-1/https___dev-to-uploads.s3.amazonaws.com_uploads_articles_vuahe90ka1mkx9aepmea.webp',
    thumbnailUrl: '/playground/TEST-1/https___dev-to-uploads.s3.amazonaws.com_uploads_articles_vuahe90ka1mkx9aepmea.webp',
    width: 1440,
    height: 810,
    uploadedBy: MOCK_ATTACHMENT_USERS[1],
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'att_4',
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
  },
  {
    id: 'att_5',
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
