// ============================================================================
// ANNOTATION MOCK FIXTURES & FACTORIES
// ============================================================================

import type { IssueUser } from '@/features/issues/types';
import type { AttachmentAnnotation, AnnotationStatus } from '@/features/annotations';

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
  status?: AnnotationStatus;
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
      status: overrides.status ?? 'open',
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

const annotationFactory = createAnnotationFactory(101);

export const MOCK_CPM101_ANNOTATIONS: AttachmentAnnotation<IssueUser>[] = [
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
  annotationFactory({
    id: 'annot_cpm101_typography',
    attachmentId: 'att_cpm101_as_is',
    label: '03',
    description: 'Typography weight doesn’t match the spec on the header.',
    status: 'open',
    x: 0.48,
    y: 0.25,
  }),
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
