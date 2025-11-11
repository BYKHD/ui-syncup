// ============================================================================
// ATTACHMENT MOCK FIXTURES
// ============================================================================

import type {
  IssueAttachment,
  IssueUser,
  AttachmentAnnotation,
} from '@/src/types/issue';

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

const CPM101_ANNOTATIONS: AttachmentAnnotation[] = [
  {
    id: 'annot_cpm101_badge_spacing',
    attachmentId: 'att_cpm101_as_is',
    label: '01',
    description: 'Badge spacing is off and text is overflowing outside CTA.',
    status: 'open',
    x: 0.32,
    y: 0.41,
    author: MOCK_ATTACHMENT_USERS[1],
    createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    comments: [
      {
        id: 'annot_cpm101_badge_spacing_comment_1',
        annotationId: 'annot_cpm101_badge_spacing',
        author: MOCK_ATTACHMENT_USERS[1],
        message: 'CTA badge caps at 8px padding per token. Please align with design spec.',
        createdAt: new Date(Date.now() - 85 * 60 * 1000).toISOString(),
      },
      {
        id: 'annot_cpm101_badge_spacing_comment_2',
        annotationId: 'annot_cpm101_badge_spacing',
        author: MOCK_ATTACHMENT_USERS[0],
        message: 'Copy that—will tighten spacing once we finalize type ramp.',
        createdAt: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: 'annot_cpm101_card_shadow',
    attachmentId: 'att_cpm101_as_is',
    label: '02',
    description: 'Shadow token mismatch makes the hover state look heavy.',
    status: 'in_review',
    x: 0.62,
    y: 0.58,
    author: MOCK_ATTACHMENT_USERS[2],
    createdAt: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
    comments: [
      {
        id: 'annot_cpm101_card_shadow_comment_1',
        annotationId: 'annot_cpm101_card_shadow',
        author: MOCK_ATTACHMENT_USERS[2],
        message: 'Should use shadow/elevation-card not the modal drop shadow.',
        createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      },
    ],
  },
];

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
    annotations: CPM101_ANNOTATIONS,
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
