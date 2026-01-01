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
