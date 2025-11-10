'use client';

// ============================================================================
// ISSUE DETAILS SCREEN (READY-TO-WIRE VERSION)
// Thin presentational component that composes issue feature components
// All logic is handled by hooks and API layer
// ============================================================================

import { useIssueDetails, useIssueActivities, useIssueUpdate, useIssueDelete } from '../hooks';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Wifi } from 'lucide-react';
import ResponsiveIssueLayout from '../components/responsive-issue-layout';
import { EnhancedResponsiveIssueLayoutSkeleton } from './issue-details-skeletons';
import type { IssuePermissions } from '@types/issue';

interface IssueDetailsScreenProps {
  issueId: string;
  userId?: string; // Current user ID for permissions and updates
}

/**
 * Issue Details Screen - Ready-to-wire mockup version
 *
 * This component demonstrates the visual UI with mock data.
 * When implementing the real feature:
 * 1. Replace mock API calls in /api with real backend calls
 * 2. Implement real permission checks based on user roles
 * 3. Add real session management
 * 4. Replace useIssueDetails hook with real data fetching
 */
export default function IssueDetailsScreen({ issueId, userId = 'user_1' }: IssueDetailsScreenProps) {
  // Fetch issue details
  const {
    issue,
    isLoading: isLoadingIssue,
    error: issueError,
    mutate: mutateIssue,
  } = useIssueDetails({ issueId });

  // Fetch activities
  const {
    activities,
    hasMore: hasMoreActivities,
    isLoading: isLoadingActivities,
    error: activityError,
    mutate: mutateActivities,
  } = useIssueActivities({
    issueId,
    limit: 10,
    enabled: !!issue, // Only fetch activities after issue is loaded
  });

  // Update hook
  const { updateField, isUpdating } = useIssueUpdate({
    onSuccess: (data) => {
      toast.success('Issue updated successfully');
      mutateIssue(); // Revalidate issue data
      mutateActivities(); // Revalidate activities to show new activity
    },
    onError: (error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });

  // Delete hook
  const { deleteIssueById, isDeleting } = useIssueDelete({
    onSuccess: () => {
      toast.success('Issue deleted successfully');
      // Redirect to issues list after short delay
      setTimeout(() => {
        window.location.href = '/issues';
      }, 1000);
    },
    onError: (error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  // Local state for UI interactions
  const [activityCursor, setActivityCursor] = useState<string | null>(null);

  // Mock permissions (in real app, derive from user role and issue data)
  const permissions: IssuePermissions = {
    canEdit: true,
    canDelete: true,
    canComment: true,
    canAssign: true,
    canChangeStatus: true,
  };

  // Handlers
  const handleUpdate = useCallback(
    async (field: string, value: any) => {
      await updateField(issueId, field, value, userId);
    },
    [issueId, userId, updateField]
  );

  const handleDelete = useCallback(async () => {
    await deleteIssueById(issueId, userId);
  }, [issueId, userId, deleteIssueById]);

  const handleLoadMoreActivities = useCallback(() => {
    // In real implementation, this would trigger pagination
    // For mock, we can simulate loading more
    toast.info('Loading more activities...');
  }, []);

  const handleRetryIssue = useCallback(() => {
    mutateIssue();
  }, [mutateIssue]);

  const handleRetryActivities = useCallback(() => {
    mutateActivities();
  }, [mutateActivities]);

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
        permissions={permissions}
        activities={activities}
        activitiesLoading={isLoadingActivities}
        hasMoreActivities={hasMoreActivities}
        onLoadMoreActivities={handleLoadMoreActivities}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        isLoading={isUpdating || isDeleting}
        activityError={activityError}
        onRetryActivity={handleRetryActivities}
      />
    </div>
  );
}
