'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { PanelHeader } from './panel-header';
import { MetadataSection } from './metadata-section';
import { ActivityTimeline } from './activity-timeline';
import type {
  IssueDetailData,
  IssuePermissions,
  ActivityEntry,
} from '@/features/issues/types';

interface IssueDetailsPanelProps {
  issueData: IssueDetailData;
  permissions: IssuePermissions;
  activities: ActivityEntry[];
  activitiesLoading: boolean;
  hasMoreActivities: boolean;
  onLoadMoreActivities: () => void;
  onUpdate: (field: string, value: any) => Promise<void>;
  onDelete: () => Promise<void>;
  isLoading: boolean;
  activityError?: Error | null;
  onRetryActivity?: () => void;
  // Editing state props for keyboard shortcuts
  isEditingTitle?: boolean;
  isEditingDescription?: boolean;
  onEditingTitleChange?: (editing: boolean) => void;
  onEditingDescriptionChange?: (editing: boolean) => void;
  // Keyboard shortcuts help
  onToggleShortcutsHelp?: () => void;
  isPanelCollapsed?: boolean;
  onPanelToggle?: () => void;
}

export default function IssueDetailsPanel({
  issueData,
  permissions,
  activities,
  activitiesLoading,
  hasMoreActivities,
  onLoadMoreActivities,
  onUpdate,
  onDelete,
  isLoading,
  activityError,
  onRetryActivity,
  isEditingTitle,
  isEditingDescription,
  onEditingTitleChange,
  onEditingDescriptionChange,
  onToggleShortcutsHelp,
  isPanelCollapsed,
  onPanelToggle,
}: IssueDetailsPanelProps) {
  return (
    <div 
      id="issue-details-panel-container"
      className="pointer-events-auto flex h-full w-full flex-col overflow-hidden bg-card md:border-l md:border-border"
      role="complementary"
      aria-label="Issue details and activity"
    >
      <PanelHeader
        issueKey={issueData.issueKey}
        issue={issueData}
        onDelete={onDelete}
        isLoading={isLoading}
        onToggleShortcutsHelp={onToggleShortcutsHelp}
        permissions={permissions}
        onStatusChange={(nextStatus) => onUpdate('status', nextStatus)}
        isPanelCollapsed={isPanelCollapsed}
        onPanelToggle={onPanelToggle}
      />
      
      <ScrollArea className="flex-1 w-full max-w-full overflow-auto">
        <div className="p-6 space-y-8">
          <MetadataSection 
            issue={issueData} 
            onUpdate={onUpdate}
            isLoading={isLoading}
            permissions={permissions}
            isEditingTitle={isEditingTitle}
            isEditingDescription={isEditingDescription}
            onEditingTitleChange={onEditingTitleChange}
            onEditingDescriptionChange={onEditingDescriptionChange}
          />
          
          <ActivityTimeline
            issueId={issueData.id}
            activities={activities}
            isLoading={activitiesLoading}
            hasMore={hasMoreActivities}
            onLoadMore={onLoadMoreActivities}
            error={activityError}
            onRetry={onRetryActivity}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
