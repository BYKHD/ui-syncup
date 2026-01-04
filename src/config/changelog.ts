export type ChangelogType = 'feature' | 'fix' | 'improvement';

export interface ChangelogItem {
  version: string;
  date: string;
  title: string;
  description: string;
  changes: {
    type: ChangelogType;
    text: string;
  }[];
}

export const changelogData: ChangelogItem[] = [
  {
    version: '0.2.0',
    date: '2026-01-05',
    title: 'Canvas & Workflow Enhancements',
    description: 'Significant improvements to the canvas interaction, issue creation workflow, and introduction of local annotation mode.',
    changes: [
      {
        type: 'feature',
        text: 'Infinite canvas with elastic pan/zoom capabilities.',
      },
      {
        type: 'feature',
        text: 'Touch pinch-to-zoom support.',
      },
      {
        type: 'feature',
        text: 'Local mode for annotated attachment view.',
      },
      {
        type: 'feature',
        text: 'Relative time display for issue dates.',
      },
      {
        type: 'improvement',
        text: 'Streamlined issue creation flow (no immediate redirect).',
      },
      {
        type: 'improvement',
        text: 'Editable page link field in issues.',
      },
    ],
  },
  {
    version: '0.1.0',
    date: '2025-12-31',
    title: 'Initial Release',
    description: 'First public release of UI SyncUp, creating the foundation for visual feedback and collaboration.',
    changes: [
      {
        type: 'feature',
        text: 'Visual Annotations: Pin-based and box annotations on images/mockups.',
      },
      {
        type: 'feature',
        text: 'Issue Management: Track and resolve UI/UX issues with workflow states.',
      },
      {
        type: 'feature',
        text: 'Project Organization: Multi-team workspace support.',
      },
    ],
  },
];
