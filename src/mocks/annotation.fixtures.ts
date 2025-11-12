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
  // Pin annotation example
  {
    id: 'annot_cpm101_badge_spacing',
    attachmentId: 'att_cpm101_as_is',
    label: 'A',
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
    ],
  },
  // Box annotation example - covering a component area
  {
    id: 'annot_cpm101_card_shadow',
    attachmentId: 'att_cpm101_as_is',
    label: 'B',
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
    ],
  },
  // Box annotation example - highlighting header section
  {
    id: 'annot_cpm101_typography',
    attachmentId: 'att_cpm101_as_is',
    label: 'C',
    description: 'Typography weight does not match the spec on the header.',
    x: 0.48,
    y: 0.25,
    author: MOCK_ATTACHMENT_USERS[0],
    createdAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    shape: {
      type: 'box',
      start: { x: 0.35, y: 0.15 },
      end: { x: 0.65, y: 0.30 },
    },
    comments: [
      {
        id: 'annot_cpm101_typography_comment_1',
        annotationId: 'annot_cpm101_typography',
        author: MOCK_ATTACHMENT_USERS[0],
        message: 'Header should use font-weight: 600 (semibold) instead of 700 (bold).',
        createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      },
    ],
  },
  // Box annotation example - extending outside image bounds (right side)
  {
    id: 'annot_cpm101_overflow_right',
    attachmentId: 'att_cpm101_as_is',
    label: 'D',
    description: 'Content extends beyond the container on smaller viewports.',
    x: 0.85,
    y: 0.40,
    author: MOCK_ATTACHMENT_USERS[1],
    createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    shape: {
      type: 'box',
      start: { x: 0.80, y: 0.35 },
      end: { x: 1.15, y: 0.55 }, // Extends 15% beyond right edge
    },
    comments: [
      {
        id: 'annot_cpm101_overflow_right_comment_1',
        annotationId: 'annot_cpm101_overflow_right',
        author: MOCK_ATTACHMENT_USERS[1],
        message: 'This content is cut off on mobile devices. Need to add responsive container constraints.',
        createdAt: new Date(Date.now() - 38 * 60 * 1000).toISOString(),
      },
    ],
  },
  // Box annotation example - extending outside image bounds (bottom)
  {
    id: 'annot_cpm101_overflow_bottom',
    attachmentId: 'att_cpm101_as_is',
    label: 'E',
    description: 'Footer alignment issues when viewport height is reduced.',
    x: 0.50,
    y: 0.92,
    author: MOCK_ATTACHMENT_USERS[2],
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    shape: {
      type: 'box',
      start: { x: 0.30, y: 0.85 },
      end: { x: 0.70, y: 1.10 }, // Extends 10% beyond bottom edge
    },
    comments: [
      {
        id: 'annot_cpm101_overflow_bottom_comment_1',
        annotationId: 'annot_cpm101_overflow_bottom',
        author: MOCK_ATTACHMENT_USERS[2],
        message: 'Footer gets clipped on short screens. Consider using sticky positioning.',
        createdAt: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
      },
    ],
  },
  // Small box annotation example - highlighting an icon
  {
    id: 'annot_cpm101_icon_size',
    attachmentId: 'att_cpm101_as_is',
    label: 'F',
    description: 'Icon size is inconsistent with design system.',
    x: 0.15,
    y: 0.20,
    author: MOCK_ATTACHMENT_USERS[0],
    createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    shape: {
      type: 'box',
      start: { x: 0.12, y: 0.17 },
      end: { x: 0.18, y: 0.23 }, // Small 6x6% box
    },
    comments: [
      {
        id: 'annot_cpm101_icon_size_comment_1',
        annotationId: 'annot_cpm101_icon_size',
        author: MOCK_ATTACHMENT_USERS[0],
        message: 'Icons should be 24px, currently showing at 20px.',
        createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
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
