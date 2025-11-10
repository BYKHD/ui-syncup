'use client';

import React from 'react';

// UI Components
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

// Issue Components
import IssueStatusBadge from './issues-status-badge';
import IssuesPriorityBadge from './issues-priority-badge';
import { InlineEditableText } from './inline-editable-text';
import { InlineEditableTextarea } from './inline-editable-textarea';
import { InlineEditableSelect } from './inline-editable-select';
import { InlineEditableUserSelect } from './inline-editable-user-select';
// TODO: wire WorkflowControl when dependencies are ready
// import { WorkflowControl } from './workflow-control';

// Config
import { TYPE_OPTIONS, PRIORITY_OPTIONS } from '@/config/issue-options';

// Types
import type { IssueDetailData } from '@/types/issue';

interface MetadataSectionProps {
  issue: IssueDetailData;
  onUpdate: (field: string, value: any) => Promise<void>;
  isLoading?: boolean;
  // Editing state props for keyboard shortcuts
  isEditingTitle?: boolean;
  isEditingDescription?: boolean;
  onEditingTitleChange?: (editing: boolean) => void;
  onEditingDescriptionChange?: (editing: boolean) => void;
}

// TODO: Replace with actual team members hook/API call
const MOCK_TEAM_MEMBERS = [
  { id: '1', name: 'John Doe', email: 'john@example.com', image: null },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', image: null },
  { id: '3', name: 'Bob Johnson', email: 'bob@example.com', image: null },
];

// TODO: wire useIssuePermissions hook when implemented
const useMockPermissions = (issue: IssueDetailData) => {
  return {
    permissions: {
      canEdit: true,
      canEditField: (field: string) => true,
      canChangeStatus: true,
      canDelete: true,
    }
  };
};

// Simple date formatter until date-fns is added
function formatTimestamp(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  return dateObj.toLocaleDateString();
}

function MetadataField({
  label,
  children,
  isLoading = false,
  id
}: {
  label: string;
  children?: React.ReactNode;
  isLoading?: boolean;
  id?: string;
}) {
  const fieldId = id || `field-${label.toLowerCase().replace(/\s+/g, '-')}`;
  
  return (
    <div className="space-y-1.5">
      <label 
        htmlFor={fieldId}
        className="text-xs font-medium text-muted-foreground"
      >
        {label}
      </label>
      {isLoading ? (
        <Skeleton className="h-5 w-full" />
      ) : (
        <div id={fieldId} className="text-sm text-foreground" role="group" aria-labelledby={`${fieldId}-label`}>
          {children}
        </div>
      )}
    </div>
  );
}

function UserDisplay({
  user,
  fallbackText = 'Unassigned'
}: {
  user: { id: string; name: string; email: string; image: string | null } | null;
  fallbackText?: string;
}) {
  if (!user) {
    return <span className="text-muted-foreground">{fallbackText}</span>;
  }

  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-6 w-6">
        <AvatarImage src={user.image || undefined} alt={user.name} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <span className="text-sm">{user.name}</span>
    </div>
  );
}

export function MetadataSection({
  issue,
  onUpdate,
  isLoading = false,
  isEditingTitle,
  isEditingDescription,
  onEditingTitleChange,
  onEditingDescriptionChange
}: MetadataSectionProps) {
  const { permissions } = useMockPermissions(issue);
  if (isLoading) {
    return (
      <div className="space-y-4">
        <MetadataField label="Title" isLoading />
        <MetadataField label="Description" isLoading />
        <Separator />
        <MetadataField label="Status" isLoading />
        <MetadataField label="Type" isLoading />
        <MetadataField label="Priority" isLoading />
        <Separator />
        <MetadataField label="Reporter" isLoading />
        <MetadataField label="Assignee" isLoading />
        <Separator />
        <MetadataField label="Created" isLoading />
        <MetadataField label="Updated" isLoading />
      </div>
    );
  }

  return (
    <div className="space-y-4" role="region" aria-label="Issue metadata">
      {/* Title */}
      <MetadataField label="Title" id="title-field">
        <InlineEditableText
          value={issue.title}
          onSave={(value) => onUpdate('title', value)}
          canEdit={permissions.canEditField('title')}
          placeholder="Enter title"
          minLength={4}
          maxLength={200}
          displayClassName="font-medium leading-tight"
          isEditing={isEditingTitle}
          onEditingChange={onEditingTitleChange}
        />
      </MetadataField>

      {/* Description */}
      <MetadataField label="Description" id="description-field">
        <InlineEditableTextarea
          value={issue.description || ''}
          onSave={(value) => onUpdate('description', value)}
          canEdit={permissions.canEditField('description')}
          placeholder="Enter description"
          minLength={20}
          maxLength={5000}
          rows={4}
          displayClassName="leading-relaxed text-muted-foreground"
          isEditing={isEditingDescription}
          onEditingChange={onEditingDescriptionChange}
        />
      </MetadataField>

      <Separator />

      {/* Status */}
      <MetadataField label="Status">
        {/* TODO: wire WorkflowControl when ready */}
        <IssueStatusBadge status={issue.status} />
      </MetadataField>

      {/* Type */}
      <MetadataField label="Type">
        <InlineEditableSelect
          value={issue.type}
          options={TYPE_OPTIONS}
          onSave={(value) => onUpdate('type', value)}
          canEdit={permissions.canEditField('type')}
          placeholder="Select type"
          renderValue={(option) => {
            const IconComponent = option.icon;
            return (
              <div className="flex items-center gap-2">
                {IconComponent && <IconComponent className="h-4 w-4" />}
                  {option.label}
              </div>
            );
          }}
        />
      </MetadataField>

      {/* Priority */}
      <MetadataField label="Priority">
        <InlineEditableSelect
          value={issue.priority}
          options={PRIORITY_OPTIONS}
          onSave={(value) => onUpdate('priority', value)}
          canEdit={permissions.canEditField('priority')}
          placeholder="Select priority"
          renderValue={(option) => (
            <div className="flex items-center gap-2">
              <IssuesPriorityBadge priority={issue.priority} />
              <span className="text-sm capitalize">{option.label}</span>
            </div>
          )}
        />
      </MetadataField>

      <Separator />

      {/* Reporter */}
      <MetadataField label="Reporter">
        <UserDisplay user={issue.reporter} fallbackText="Unknown" />
      </MetadataField>

      {/* Assignee */}
      <MetadataField label="Assignee">
        <InlineEditableUserSelect
          value={issue.assigneeId}
          users={MOCK_TEAM_MEMBERS}
          onSave={(userId) => onUpdate('assigneeId', userId)}
          canEdit={permissions.canEditField('assigneeId')}
          placeholder="Select assignee"
        />
      </MetadataField>

      <Separator />

      {/* Timestamps */}
      <div className="grid grid-cols-2 gap-4">
        <MetadataField label="Created">
          <time
            dateTime={new Date(issue.createdAt).toISOString()}
            className="text-sm text-muted-foreground"
          >
            {formatTimestamp(issue.createdAt)}
          </time>
        </MetadataField>

        <MetadataField label="Updated">
          <time
            dateTime={new Date(issue.updatedAt).toISOString()}
            className="text-sm text-muted-foreground"
          >
            {formatTimestamp(issue.updatedAt)}
          </time>
        </MetadataField>
      </div>

      {/* Optional fields */}
      {(issue.page || issue.figmaLink || permissions.canEdit) && (
        <>
          <Separator />
          
          {/* Page */}
          <MetadataField label="Page">
            <InlineEditableText
              value={issue.page || ''}
              onSave={(value) => onUpdate('page', value || null)}
              canEdit={permissions.canEditField('page')}
              placeholder="Enter page URL or name"
              minLength={0}
              maxLength={500}
              displayClassName="text-sm"
            />
          </MetadataField>

          {/* Figma Link */}
          <MetadataField label="Figma Link">
            {permissions.canEditField('figmaLink') ? (
              <InlineEditableText
                value={issue.figmaLink || ''}
                onSave={(value) => onUpdate('figmaLink', value || null)}
                canEdit={permissions.canEditField('figmaLink')}
                placeholder="Enter Figma link"
                minLength={0}
                maxLength={500}
                displayClassName="text-sm"
              />
            ) : issue.figmaLink ? (
              <a
                href={issue.figmaLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                View in Figma
              </a>
            ) : (
              <span className="text-sm text-muted-foreground">No Figma link</span>
            )}
          </MetadataField>
        </>
      )}
    </div>
  );
}
