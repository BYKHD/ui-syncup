'use client';

// ============================================================================
// ISSUE DETAILS SCREEN
// Thin presentational component that composes issue feature components
// All logic is handled by hooks and API layer
// ============================================================================

import { useIssueDetails, useIssueActivities, useIssueUpdate, useIssueDelete, useIssuePermissions } from '../hooks';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import ResponsiveIssueLayout from '../components/responsive-issue-layout';
import { EnhancedResponsiveIssueLayoutSkeleton } from './issue-details-skeletons';
import type { IssuePermissions, IssueUpdateHandler } from '@/features/issues/types';

interface IssueDetailsScreenProps {
  issueId: string;
  userId?: string; // Current user ID for permissions and updates
  permissions?: IssuePermissions;
}

/**
 * Issue Details Screen
 *
 * Displays full issue details with attachments and activity timeline.
 * Wired to real API endpoints via React Query hooks.
 *
 * Annotations are integrated via AnnotatedAttachmentView (Task 15)
 * and activity timeline includes annotation events (Task 17.2).
 */
import { authClient } from '@/lib/auth-client';

export default function IssueDetailsScreen({
  issueId,
  userId: propUserId,
  permissions,
}: IssueDetailsScreenProps) {
  const { data: session } = authClient.useSession();
  // Use provided userId, session userId, or empty string as fallback
  const userId = propUserId || session?.user?.id || '';

  // Fetch issue details
  const {
    issue,
    isLoading: isLoadingIssue,
    error: issueError,
    refetch: refetchIssue,
  } = useIssueDetails({ issueId });

  // Fetch activities in PARALLEL (not waiting for issue)
  // This eliminates the waterfall pattern where activities only loaded after issue
  const {
    activities,
    hasMore: hasMoreActivities,
    isLoading: isLoadingActivities,
    error: activityError,
    refetch: refetchActivities,
  } = useIssueActivities({
    issueId,
    limit: 10,
    enabled: !!issueId, // Start immediately with issueId, don't wait for issue
  });

  // Update hook
  const { mutateAsync: updateIssue, isPending: isUpdating } = useIssueUpdate({
    onSuccess: () => {
      // Note: Success toast is handled by individual inline editable components
      refetchIssue(); // Revalidate issue data
      refetchActivities(); // Revalidate activities to show new activity
    },
    onError: (error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });

  // Delete hook
  const { mutateAsync: deleteIssue, isPending: isDeleting } = useIssueDelete({
    onSuccess: (data) => {
      toast.success('Issue deleted successfully');
      // Redirect to project issues list
      setTimeout(() => {
        if (data.projectKey) {
           window.location.href = `/${data.projectKey}`;
        } else {
           window.location.href = '/projects';
        }
      }, 500);
    },
    onError: (error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  // Local state for UI interactions
  const [_activityCursor, _setActivityCursor] = useState<string | null>(null);

  const hookPermissions = useIssuePermissions({ issueId });
  const basePermissions: IssuePermissions = permissions ?? hookPermissions;

  // Archived projects are a frozen historical record (see features/projects
  // wiki page). Force read-only UI regardless of role; the server-side
  // permission gate (rbac.ts ARCHIVE_BLOCKED_PERMISSIONS) is the safety net.
  const isArchived = issue?.projectStatus === 'archived';
  const resolvedPermissions: IssuePermissions = isArchived
    ? {
        canEdit: false,
        canDelete: false,
        canComment: false,
        canAssign: false,
        canChangeStatus: false,
      }
    : basePermissions;

  // Handlers
  const handleUpdate: IssueUpdateHandler = useCallback(
    async (field, value) => {
      if (isArchived) {
        toast.info('This project is archived. Unarchive to edit.');
        return;
      }
      if (!resolvedPermissions.canEdit) {
        toast.info('View-only link. Editing is disabled.');
        return;
      }
      await updateIssue({ issueId, field, value, actorId: userId });
    },
    [issueId, userId, updateIssue, resolvedPermissions.canEdit, isArchived]
  );

  const handleDelete = useCallback(async () => {
    if (isArchived) {
      toast.info('This project is archived. Unarchive to delete issues.');
      return;
    }
    if (!resolvedPermissions.canDelete) {
      toast.info('View-only link. Delete is disabled.');
      return;
    }
    await deleteIssue({ issueId, actorId: userId });
  }, [deleteIssue, issueId, resolvedPermissions.canDelete, userId, isArchived]);

  const handleLoadMoreActivities = useCallback(() => {
    // In real implementation, this would trigger pagination
    // For mock, we can simulate loading more
    toast.info('Loading more activities...');
  }, []);

  const handleRetryIssue = useCallback(() => {
    refetchIssue();
  }, [refetchIssue]);

  const handleRetryActivities = useCallback(() => {
    refetchActivities();
  }, [refetchActivities]);

  const handleUploadComplete = useCallback(() => {
    refetchIssue();
  }, [refetchIssue]);

  // Error states
  if (issueError) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading issue</AlertTitle>
          <AlertDescription className="mt-2">
            {issueError.message || 'Unable to load issue details. Please try again.'}
          </AlertDescription>
          <div className="flex gap-2 mt-4">
            <Button
              variant="default"
              size="sm"
              onClick={handleRetryIssue}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => (window.location.href = '/issues')}
            >
              Back to Issues
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  // Loading state
  if (isLoadingIssue || !issue) {
    return <EnhancedResponsiveIssueLayoutSkeleton />;
  }

  // Main content
  return (
    <div className="h-full" role="main" aria-label={`Issue ${issue.issueKey} details`}>
      <ResponsiveIssueLayout
        issueId={issueId}
        issueData={issue}
        attachments={issue.attachments || []}
        permissions={resolvedPermissions}
        activities={activities}
        activitiesLoading={isLoadingActivities}
        hasMoreActivities={hasMoreActivities}
        onLoadMoreActivities={handleLoadMoreActivities}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        isLoading={isUpdating || isDeleting}
        activityError={activityError}
        onRetryActivity={handleRetryActivities}
        onAttachmentUpload={handleUploadComplete}
      />
    </div>
  );
}
