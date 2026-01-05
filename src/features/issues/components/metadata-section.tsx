'use client';

import React from 'react';

// UI Components
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ExternalLink, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

// Issue Components
import IssuesPriorityBadge from './issues-priority-badge';
import { InlineEditableText } from './inline-editable-text';
import { InlineEditableTextarea } from './inline-editable-textarea';
import { InlineEditableSelect } from './inline-editable-select';
import { InlineEditableUserSelect } from './inline-editable-user-select';

// Config
import { TYPE_OPTIONS, PRIORITY_OPTIONS } from '@/features/issues/config';

// Types
import type { IssueDetailData, IssuePermissions } from '@/features/issues/types';

interface MetadataSectionProps {
  issue: IssueDetailData;
  onUpdate: (field: string, value: any) => Promise<void>;
  isLoading?: boolean;
  permissions?: IssuePermissions;
  // Team members for assignee selection
  // TODO: Wire to real team members API when available
  teamMembers?: { id: string; name: string; email: string; image: string | null }[];
  // Editing state props for keyboard shortcuts
  isEditingTitle?: boolean;
  isEditingDescription?: boolean;
  onEditingTitleChange?: (editing: boolean) => void;
  onEditingDescriptionChange?: (editing: boolean) => void;
}

// Default permissions when none provided (read-write by default)
const DEFAULT_PERMISSIONS = {
  canEdit: true,
  canEditField: (_field: string) => true,
  canChangeStatus: true,
  canDelete: true,
};

// Default empty team members
// TODO: Remove fallback when team members API is wired
const DEFAULT_TEAM_MEMBERS: { id: string; name: string; email: string; image: string | null }[] = [];

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

// Normal date format (e.g., "Jan 5, 2026")
function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function MetadataField({
  label,
  labelVisible = true,
  children,
  isLoading = false,
  id
}: {
  label: string;
  labelVisible?: boolean;
  children?: React.ReactNode;
  isLoading?: boolean;
  id?: string;
}) {
  const fieldId = id || `field-${label.toLowerCase().replace(/\s+/g, '-')}`;
  
  return (
    <div className="space-y-1.5 w-full max-w-full">
      <label 
        htmlFor={fieldId}
        id={`${fieldId}-label`}
        className={labelVisible ? 'text-xs font-medium text-muted-foreground' : 'sr-only'}
      >
        {label}
      </label>
      {isLoading ? (
        <Skeleton className="h-5 w-full" />
      ) : (
        <div
          id={fieldId}
          className="text-sm text-foreground max-w-full break-words"
          role="group"
          aria-labelledby={`${fieldId}-label`}
        >
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
    <div className="flex items-center gap-2 min-w-0">
      <Avatar className="h-6 w-6">
        <AvatarImage src={user.image || undefined} alt={user.name} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <span className="text-sm break-words">{user.name}</span>
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
  onEditingDescriptionChange,
  permissions,
  teamMembers = DEFAULT_TEAM_MEMBERS,
}: MetadataSectionProps) {
  // Use provided permissions or default to read-write
  const resolvedPermissions = permissions
    ? {
        canEdit: permissions.canEdit,
        canEditField: (_field: string) => permissions.canEdit,
        canChangeStatus: permissions.canChangeStatus ?? false,
        canDelete: permissions.canDelete ?? false,
      }
    : DEFAULT_PERMISSIONS;

  const isReadOnly = !resolvedPermissions.canEdit;
  if (isLoading) {
    return (
      <div className="space-y-4 w-full max-w-full overflow-hidden">
        <MetadataField label="Title" isLoading />
        <MetadataField label="Description" isLoading />
        <Separator />
        <div className="grid gap-4 sm:grid-cols-2">
          <MetadataField label="Type" isLoading />
          <MetadataField label="Priority" isLoading />
        </div>
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
    <div className="space-y-4 w-full max-w-full overflow-hidden" role="region" aria-label="Issue metadata">
      {/* Title */}
      <MetadataField label="Title" id="title-field" labelVisible={false}>
        <InlineEditableText
          value={issue.title}
          onSave={(value) => onUpdate('title', value)}
          canEdit={resolvedPermissions.canEditField('title')}
          placeholder="Enter title"
          minLength={4}
          maxLength={200}
          displayClassName="font-medium leading-tight break-words"
          isEditing={isEditingTitle}
          onEditingChange={onEditingTitleChange}
        />
      </MetadataField>

      {/* Description */}
      <MetadataField label="Description" id="description-field" labelVisible={false}>
        <InlineEditableTextarea
          value={issue.description || ''}
          onSave={(value) => onUpdate('description', value)}
          canEdit={resolvedPermissions.canEditField('description')}
          placeholder="Enter description"
          minLength={20}
          maxLength={5000}
          rows={4}
          displayClassName="leading-relaxed text-muted-foreground break-words"
          isEditing={isEditingDescription}
          onEditingChange={onEditingDescriptionChange}
        />
      </MetadataField>

      <Separator />

      <div className="grid min-w-0 gap-4 sm:grid-cols-2" role="group" aria-label="Issue classification">
        {/* Type */}
        <MetadataField label="Type">
          <InlineEditableSelect
            value={issue.type}
            options={TYPE_OPTIONS}
            onSave={(value) => onUpdate('type', value)}
            canEdit={resolvedPermissions.canEditField('type')}
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
            canEdit={resolvedPermissions.canEditField('priority')}
            placeholder="Select priority"
            renderValue={(option) => (
              <div className="flex items-center gap-2">
                <IssuesPriorityBadge priority={issue.priority} />
                <span className="text-sm capitalize">{option.label}</span>
              </div>
            )}
          />
        </MetadataField>
      </div>

      <Separator />

      {/* Reporter */}
      <MetadataField label="Reporter">
        <UserDisplay user={issue.reporter} fallbackText="Unknown" />
      </MetadataField>

      {/* Assignee */}
      <MetadataField label="Assignee">
        <InlineEditableUserSelect
          value={issue.assignee?.id || 'unassigned'}
          users={teamMembers}
          onSave={(userId) => onUpdate('assigneeId', userId)}
          canEdit={resolvedPermissions.canEditField('assigneeId')}
          placeholder="Select assignee"
        />
      </MetadataField>

      <Separator />

      {/* Timestamps */}
      <div className="grid grid-cols-2 gap-4 min-w-0">
        <MetadataField label="Created">
          <time
            dateTime={new Date(issue.createdAt).toISOString()}
            className="text-sm text-muted-foreground break-words"
          >
            {formatDate(issue.createdAt)}
          </time>
        </MetadataField>

        <MetadataField label="Updated">
          <time
            dateTime={new Date(issue.updatedAt).toISOString()}
            className="text-sm text-muted-foreground break-words"
          >
            {formatTimestamp(issue.updatedAt)}
          </time>
        </MetadataField>
      </div>

      {/* Optional fields */}
      {(issue.page || issue.figmaLink || !isReadOnly) && (
        <>
          <Separator />
          
          {/* Page */}
          <MetadataField label="Page">
            <InlineEditableText
              value={issue.page || ''}
              onSave={(value) => onUpdate('page', value || null)}
              canEdit={resolvedPermissions.canEditField('page')}
              placeholder="Enter page URL or name"
              minLength={0}
              maxLength={500}
              displayClassName="text-sm break-words"
              renderView={({ value, placeholder, startEditing }) => {
                const isUrl = value && (value.startsWith('http://') || value.startsWith('https://'));
                
                return (
                  <div className="group flex items-center justify-between gap-2 w-full min-h-[2rem] rounded px-2 py-1 -mx-2 hover:bg-accent/50 transition-colors">
                    {isUrl ? (
                      <a 
                        href={value} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline truncate flex items-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="truncate">{value}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    ) : (
                      <span 
                        className={cn("text-sm cursor-text", !value && "text-muted-foreground")}
                        onClick={startEditing}
                      >
                        {value || placeholder}
                      </span>
                    )}
                    
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 shrink-0"
                      onClick={startEditing}
                      aria-label="Edit page link"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                );
              }}
            />
          </MetadataField>

          {/* Figma Link */}
          <MetadataField label="Figma Link">
            {resolvedPermissions.canEditField('figmaLink') ? (
              <InlineEditableText
                value={issue.figmaLink || ''}
                onSave={(value) => onUpdate('figmaLink', value || null)}
                canEdit={resolvedPermissions.canEditField('figmaLink')}
                placeholder="Enter Figma link"
                minLength={0}
                maxLength={500}
                displayClassName="text-sm break-words"
              />
            ) : issue.figmaLink ? (
              <a
                href={issue.figmaLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline break-words"
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
