// ============================================================================
// ANNOTATION MOCK FIXTURES & FACTORIES
// ============================================================================

import type { IssueUser } from '@/features/issues/types';
import type { AttachmentAnnotation } from '@/features/annotations';

const DEFAULT_ATTACHMENT_ID = 'att_mock_canvas';

export const MOCK_ATTACHMENT_USERS: IssueUser[] = [
  {
    id: 'annot_author_1',
    name: 'Sarah Chen',
    email: 'sarah@example.com',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
  },
  {
    id: 'annot_author_2',
    name: 'Mike Johnson',
    email: 'mike@example.com',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
  },
  {
    id: 'annot_author_3',
    name: 'Emma Williams',
    email: 'emma@example.com',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
  },
  {
    id: 'annot_author_4',
    name: 'James Park',
    email: 'james@example.com',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James',
  },
];

type AnnotationFactoryOverrides = Partial<AttachmentAnnotation<IssueUser>> & {
  attachmentId?: string;
  author?: IssueUser;
};

const mulberry32 = (seed: number) => {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const createAnnotationFactory = (
  seed = 42,
  authors: IssueUser[] = MOCK_ATTACHMENT_USERS,
) => {
  const random = mulberry32(seed);
  let counter = 1;

  return (overrides: AnnotationFactoryOverrides = {}): AttachmentAnnotation<IssueUser> => {
    const author = overrides.author ?? authors[counter % authors.length];
    const attachmentId = overrides.attachmentId ?? DEFAULT_ATTACHMENT_ID;
    const label = overrides.label ?? String(counter).padStart(2, '0');
    const x = overrides.x ?? Number(random().toFixed(2));
    const y = overrides.y ?? Number(random().toFixed(2));

    const annotation: AttachmentAnnotation<IssueUser> = {
      id: overrides.id ?? `annot_mock_${counter}`,
      attachmentId,
      label,
      description: overrides.description ?? 'Ready-to-wire annotation mock',
      x,
      y,
      author,
      createdAt: overrides.createdAt ?? new Date(Date.now() - counter * 60000).toISOString(),
      comments: overrides.comments ?? [],
    };

    counter += 1;
    return annotation;
  };
};

export const MOCK_CPM101_ANNOTATIONS: AttachmentAnnotation<IssueUser>[] = [
  // Pin annotation example - specific point feedback
  {
    id: 'annot_cpm101_badge_spacing',
    attachmentId: 'att_cpm101_as_is',
    label: '1',
    description: 'Badge spacing is off and text is overflowing outside CTA.',
    x: 0.32,
    y: 0.41,
    author: MOCK_ATTACHMENT_USERS[1],
    createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    shape: {
      type: 'pin',
      position: { x: 0.32, y: 0.41 },
    },
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
      {
        id: 'annot_cpm101_badge_spacing_comment_3',
        annotationId: 'annot_cpm101_badge_spacing',
        author: MOCK_ATTACHMENT_USERS[3],
        message: 'Also noticed the text color contrast is a bit low. Should we bump it to meet WCAG AA?',
        createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      },
      {
        id: 'annot_cpm101_badge_spacing_comment_4',
        annotationId: 'annot_cpm101_badge_spacing',
        author: MOCK_ATTACHMENT_USERS[1],
        message: 'Good catch! Let\'s use the text/on-primary token instead.',
        createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      },
    ],
  },
  // Box annotation example - covering a component area
  {
    id: 'annot_cpm101_card_shadow',
    attachmentId: 'att_cpm101_as_is',
    label: '2',
    description: 'Shadow token mismatch makes the hover state look heavy.',
    x: 0.62,
    y: 0.58,
    author: MOCK_ATTACHMENT_USERS[2],
    createdAt: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
    shape: {
      type: 'box',
      start: { x: 0.55, y: 0.50 },
      end: { x: 0.75, y: 0.70 },
    },
    comments: [
      {
        id: 'annot_cpm101_card_shadow_comment_1',
        annotationId: 'annot_cpm101_card_shadow',
        author: MOCK_ATTACHMENT_USERS[2],
        message: 'Should use shadow/elevation-card not the modal drop shadow.',
        createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'annot_cpm101_card_shadow_comment_2',
        annotationId: 'annot_cpm101_card_shadow',
        author: MOCK_ATTACHMENT_USERS[0],
        message: 'Confirmed! The shadow is way too prominent on hover. Will update to use elevation-1.',
        createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      },
      {
        id: 'annot_cpm101_card_shadow_comment_3',
        annotationId: 'annot_cpm101_card_shadow',
        author: MOCK_ATTACHMENT_USERS[2],
        message: 'Perfect, that should fix it. Let me know when the update is ready for review.',
        createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      },
    ],
  },
  // Pin annotation example - typography issue
  {
    id: 'annot_cpm101_typography',
    attachmentId: 'att_cpm101_as_is',
    label: '3',
    description: 'Typography weight does not match the spec on the header.',
    x: 0.48,
    y: 0.22,
    author: MOCK_ATTACHMENT_USERS[0],
    createdAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    shape: {
      type: 'pin',
      position: { x: 0.48, y: 0.22 },
    },
    comments: [
      {
        id: 'annot_cpm101_typography_comment_1',
        annotationId: 'annot_cpm101_typography',
        author: MOCK_ATTACHMENT_USERS[0],
        message: 'Header should use font-weight: 600 (semibold) instead of 700 (bold).',
        createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      },
      {
        id: 'annot_cpm101_typography_comment_2',
        annotationId: 'annot_cpm101_typography',
        author: MOCK_ATTACHMENT_USERS[1],
        message: 'Agreed, and the line-height looks a bit tight too. Should be 1.5 per our type scale.',
        createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      },
    ],
  },
  // Box annotation example - larger region feedback
  {
    id: 'annot_cpm101_content_alignment',
    attachmentId: 'att_cpm101_as_is',
    label: '4',
    description: 'Content section needs better vertical spacing and alignment.',
    x: 0.50,
    y: 0.65,
    author: MOCK_ATTACHMENT_USERS[1],
    createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    shape: {
      type: 'box',
      start: { x: 0.25, y: 0.55 },
      end: { x: 0.75, y: 0.80 },
    },
    comments: [
      {
        id: 'annot_cpm101_content_alignment_comment_1',
        annotationId: 'annot_cpm101_content_alignment',
        author: MOCK_ATTACHMENT_USERS[1],
        message: 'The spacing between elements should be 24px according to our design tokens.',
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      },
      {
        id: 'annot_cpm101_content_alignment_comment_2',
        annotationId: 'annot_cpm101_content_alignment',
        author: MOCK_ATTACHMENT_USERS[3],
        message: 'I see 16px being used instead. Let me update the component to use spacing-6 token.',
        createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      },
      {
        id: 'annot_cpm101_content_alignment_comment_3',
        annotationId: 'annot_cpm101_content_alignment',
        author: MOCK_ATTACHMENT_USERS[2],
        message: 'Also check the horizontal alignment—items don\'t seem centered properly.',
        createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      },
      {
        id: 'annot_cpm101_content_alignment_comment_4',
        annotationId: 'annot_cpm101_content_alignment',
        author: MOCK_ATTACHMENT_USERS[3],
        message: 'Will fix both spacing and alignment in the same PR. Thanks for catching that!',
        createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      },
    ],
  },
  // Box annotation example - icon sizing (no comments yet - empty state)
  {
    id: 'annot_cpm101_icon_size',
    attachmentId: 'att_cpm101_as_is',
    label: '5',
    description: 'Icon size is inconsistent with design system.',
    x: 0.15,
    y: 0.20,
    author: MOCK_ATTACHMENT_USERS[2],
    createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    shape: {
      type: 'box',
      start: { x: 0.12, y: 0.17 },
      end: { x: 0.18, y: 0.23 },
    },
    comments: [],
  },
  // Pin annotation example - color inconsistency
  {
    id: 'annot_cpm101_color_mismatch',
    attachmentId: 'att_cpm101_as_is',
    label: '6',
    description: 'Button color doesn\'t match brand guidelines.',
    x: 0.68,
    y: 0.35,
    author: MOCK_ATTACHMENT_USERS[0],
    createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    shape: {
      type: 'pin',
      position: { x: 0.68, y: 0.35 },
    },
    comments: [
      {
        id: 'annot_cpm101_color_mismatch_comment_1',
        annotationId: 'annot_cpm101_color_mismatch',
        author: MOCK_ATTACHMENT_USERS[0],
        message: 'Primary button should use brand-primary-500, not blue-600.',
        createdAt: new Date(Date.now() - 115 * 60 * 1000).toISOString(),
      },
      {
        id: 'annot_cpm101_color_mismatch_comment_2',
        annotationId: 'annot_cpm101_color_mismatch',
        author: MOCK_ATTACHMENT_USERS[2],
        message: 'Looks like a leftover from the old design system. I\'ll update it.',
        createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      },
      {
        id: 'annot_cpm101_color_mismatch_comment_3',
        annotationId: 'annot_cpm101_color_mismatch',
        author: MOCK_ATTACHMENT_USERS[0],
        message: 'Thanks! Also check the hover and active states while you\'re at it.',
        createdAt: new Date(Date.now() - 70 * 60 * 1000).toISOString(),
      },
      {
        id: 'annot_cpm101_color_mismatch_comment_4',
        annotationId: 'annot_cpm101_color_mismatch',
        author: MOCK_ATTACHMENT_USERS[2],
        message: 'Will do. Updating all button states to use the new token system.',
        createdAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
      },
      {
        id: 'annot_cpm101_color_mismatch_comment_5',
        annotationId: 'annot_cpm101_color_mismatch',
        author: MOCK_ATTACHMENT_USERS[3],
        message: 'Don\'t forget the disabled state too—needs proper opacity token.',
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      },
    ],
  },
];

export const MOCK_ANNOTATION_SCENARIOS = {
  cpm101: {
    annotations: MOCK_CPM101_ANNOTATIONS,
  },
  default: {
    annotations: MOCK_CPM101_ANNOTATIONS,
  },
};

export type AnnotationScenario = typeof MOCK_ANNOTATION_SCENARIOS[keyof typeof MOCK_ANNOTATION_SCENARIOS];
export const DEFAULT_ANNOTATION_SCENARIO: AnnotationScenario = MOCK_ANNOTATION_SCENARIOS.default;
