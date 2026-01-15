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
    version: '0.3.0',
    date: '2026-01-15',
    title: 'Notifications & Team Collaboration',
    description: 'Introducing real-time notifications system and enhanced team invitation experience.',
    changes: [
      {
        type: 'feature',
        text: 'Real-time in-app notifications with Supabase Realtime.',
      },
      {
        type: 'feature',
        text: 'Notification panel with read/unread status and badge count.',
      },
      {
        type: 'feature',
        text: 'Toast notifications with quick accept action for invitations.',
      },
      {
        type: 'feature',
        text: 'Notification grouping by type with expandable sections.',
      },
      {
        type: 'improvement',
        text: 'Enhanced team invitation flow with better error handling.',
      },
      {
        type: 'improvement',
        text: 'Activity logging security and performance improvements.',
      },
      {
        type: 'fix',
        text: 'Fixed public project visibility for team members.',
      },
      {
        type: 'fix',
        text: 'Fixed invitation redirect issues after acceptance.',
      },
    ],
  },
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
