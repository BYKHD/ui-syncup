'use client';

import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PanelHeader } from './panel-header';
import { MetadataSection } from './metadata-section';
import { ActivityTimeline } from './activity-timeline';
import type {
  IssueDetailData,
  IssuePermissions,
  ActivityEntry,
  IssueUser,
} from '@/features/issues/types';
import type { AnnotationThread } from '@/features/annotations';
import { AnnotationCommentsPanel } from '@/features/annotations';

type AnnotationThreadWithMeta = AnnotationThread<IssueUser>;

type DetailsPanelTab = 'general' | 'comments';

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
  annotations?: AnnotationThreadWithMeta[];
  activeAnnotationId?: string | null;
  onAnnotationSelect?: (annotationId: string) => void;
  isPanelCollapsed?: boolean;
  onPanelToggle?: () => void;
  isMobile?: boolean;
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
  annotations = [],
  activeAnnotationId = null,
  onAnnotationSelect,
  isPanelCollapsed,
  onPanelToggle,
  isMobile = false,
}: IssueDetailsPanelProps) {
  const [panelTab, setPanelTab] = useState<DetailsPanelTab>('general');
  
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
      
      <div className="flex flex-1 min-h-0 flex-col">
        <Tabs
          value={panelTab}
          onValueChange={(value) => setPanelTab(value as DetailsPanelTab)}
          className="flex flex-1 min-h-0 flex-col gap-0"
        >
          <TabsList className="h-10 w-full justify-start rounded-none border-b px-6">
            <TabsTrigger value="general" className="h-full">General</TabsTrigger>
            <TabsTrigger value="comments" className="h-full">Comments</TabsTrigger>
          </TabsList>

          <TabsContent
            id="issue-details-panel-general-content"
            value="general"
            className="flex flex-1 min-h-0 data-[state=inactive]:hidden focus-visible:outline-none"
          >
            <ScrollArea className="flex-1 overflow-auto">
              <div className="p-6 space-y-8">
                <MetadataSection 
                  issue={issueData} 
                  onUpdate={onUpdate}
                  isLoading={isLoading}
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
          </TabsContent>

          <TabsContent
            value="comments"
            className="flex flex-1 min-h-0 data-[state=inactive]:hidden focus-visible:outline-none"
          >
            <AnnotationCommentsPanel
              annotations={annotations}
              activeAnnotationId={activeAnnotationId}
              onAnnotationSelect={onAnnotationSelect}
              isMobile={isMobile}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
