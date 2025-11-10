"use client";

import { useCallback, useState, useEffect } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { issueFeedback, networkFeedback } from "@/src/lib/feedback";
import { useKeyboardShortcuts, getModifierKey } from "@/src/hooks/use-keyboard-shortcuts";
import { useFocusManagement } from "@/src/hooks/use-focus-management";
import { useAccessibility } from "@/src/contexts/accessibility-context";
import { usePerformanceMonitoring, useMemoryOptimization, prefetchIssueData } from "@/src/lib/performance";

import ResponsiveIssueLayout from '@/src/features/issues/components/responsive-issue-layout';
import { EnhancedResponsiveIssueLayoutSkeleton } from '@/src/features/issues/components/issue-detail-skeletons';
import { 
  IssueDetailErrorBoundary, 
  IssueDetailError, 
  IssueDetailErrorType,
  IssuePermissionError,
  IssueNotFoundError,
  IssueNetworkError,
  AttachmentLoadError,
  ActivityLoadError
} from '@/src/features/issues/components/issue-detail-error-boundary';
import { fetcher } from "@/src/lib/utils";
import { useIssuePermissions } from "@/src/hooks/use-issue-permissions";
import { useSession } from "@/src/hooks/use-session";
import { useApiRetry, useAttachmentRetry, useActivityRetry } from "@/src/hooks/use-retry-mechanism";
import { Alert, AlertDescription, AlertTitle } from "@/src/components/ui/alert";
import { Button } from "@/src/components/ui/button";
import { AlertCircle, RefreshCw, Wifi } from "lucide-react";
import type { IssueDetailData, ActivityTimelineResponse } from "@/src/types/issue";

interface IssueDetailsContentProps {
  issueId: string;
}

interface IssueDetailResponse {
  issue: IssueDetailData;
}

export default function IssueDetailsContent({ issueId }: IssueDetailsContentProps) {
  // Get current user session
  const { user, isLoading: sessionLoading } = useSession();
  
  // Performance monitoring
  const endMeasurement = usePerformanceMonitoring('issueDetailLoad');
  const { addCleanup } = useMemoryOptimization();
  
  // State for activity pagination
  const [activityCursor, setActivityCursor] = useState<string | null>(null);
  
  // State for partial failures
  const [attachmentError, setAttachmentError] = useState<Error | null>(null);
  const [activityError, setActivityError] = useState<Error | null>(null);
  
  // State for keyboard shortcuts and editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  
  // Accessibility and focus management
  const { announce, announceStatus, announceError } = useAccessibility();
  const { containerRef } = useFocusManagement({ 
    restoreFocus: true,
    autoFocus: false 
  });
  
  // Prefetch related data on mount - only in production for performance
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      prefetchIssueData(issueId);
    }
    
    // Cleanup function
    addCleanup(() => {
      endMeasurement();
    });
  }, [issueId, addCleanup, endMeasurement]);
  
  // Retry mechanisms for different data types
  const issueRetry = useApiRetry({
    onRetry: (attempt, error) => {
      networkFeedback.retryAttempt(attempt, 3);
    },
    onMaxAttemptsReached: (error) => {
      networkFeedback.connectionError();
    }
  });

  const attachmentRetry = useAttachmentRetry({
    onRetry: (attempt, error) => {
      setAttachmentError(null);
      networkFeedback.retryAttempt(attempt, 2);
    },
    onMaxAttemptsReached: (error) => {
      setAttachmentError(new AttachmentLoadError('Failed to load attachments after multiple attempts'));
      toast.error('Attachments failed to load, but issue details are still available');
    }
  });

  const activityRetry = useActivityRetry({
    onRetry: (attempt, error) => {
      setActivityError(null);
      networkFeedback.retryAttempt(attempt, 2);
    },
    onMaxAttemptsReached: (error) => {
      setActivityError(new ActivityLoadError('Failed to load activity timeline after multiple attempts'));
      toast.error('Activity timeline failed to load, but issue details are still available');
    }
  });

  // Enhanced fetcher with error classification
  const enhancedFetcher = useCallback(async (url: string) => {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        // Classify errors based on status code
        switch (response.status) {
          case 403:
            throw new IssuePermissionError(issueId);
          case 404:
            throw new IssueNotFoundError(issueId);
          case 500:
          case 502:
          case 503:
          case 504:
            throw new IssueNetworkError(`Server error (${response.status}): ${response.statusText}`);
          default:
            throw new IssueDetailError(
              `Request failed with status ${response.status}`,
              IssueDetailErrorType.UNKNOWN_ERROR,
              response.status
            );
        }
      }

      return response.json();
    } catch (error) {
      if (error instanceof IssueDetailError) {
        throw error;
      }
      
      // Network or parsing errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new IssueNetworkError('Network connection failed');
      }
      
      throw new IssueDetailError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        IssueDetailErrorType.UNKNOWN_ERROR
      );
    }
  }, [issueId]);
  
  // Fetch complete issue details with populated relationships
  const { 
    data, 
    error, 
    isLoading,
    mutate 
  } = useSWR<IssueDetailResponse>(
    `/api/issues/${issueId}`,
    enhancedFetcher,
    {
      revalidateOnFocus: false, // Reduce unnecessary revalidations
      revalidateOnReconnect: true,
      revalidateIfStale: false, // Don't revalidate stale data immediately
      dedupingInterval: 5000, // Increase deduping interval
      focusThrottleInterval: 10000, // Reduce focus revalidation frequency
      shouldRetryOnError: false, // We handle retries manually
      keepPreviousData: true, // Prevent flash of loading state
      compare: (a, b) => {
        // Custom comparison to prevent unnecessary re-renders
        return JSON.stringify(a) === JSON.stringify(b);
      },
      onError: (error) => {
        // Don't show toast for permission/not found errors as they're handled by error boundary
        if (!(error instanceof IssuePermissionError) && !(error instanceof IssueNotFoundError)) {
          console.error('Issue fetch error:', error);
        }
      },
      onSuccess: () => {
        // Mark performance measurement complete when data loads
        endMeasurement();
      }
    }
  );

  // Fetch activity timeline with automatic revalidation and error handling
  const {
    data: activityData,
    isLoading: activityLoading,
    mutate: mutateActivity,
    error: rawActivityError
  } = useSWR<ActivityTimelineResponse>(
    data?.issue ? `/api/issues/${issueId}/activity${activityCursor ? `?cursor=${activityCursor}` : ''}` : null,
    async (url: string) => {
      try {
        return await activityRetry.executeWithRetry(() => enhancedFetcher(url));
      } catch (error) {
        // Don't throw - let the component handle partial failure
        console.error('Activity fetch error:', error);
        return { activities: [], hasMore: false, nextCursor: null };
      }
    },
    {
      revalidateOnFocus: false, // Reduce activity revalidation
      revalidateOnReconnect: true,
      refreshInterval: 30000, // Reduce polling frequency to 30 seconds
      refreshWhenHidden: false, // Don't poll when tab is hidden
      refreshWhenOffline: false, // Don't poll when offline
      dedupingInterval: 5000, // Increase deduping
      focusThrottleInterval: 15000, // Reduce focus revalidation
      shouldRetryOnError: false,
      keepPreviousData: true,
      compare: (a, b) => {
        // Custom comparison for activity data
        if (!a || !b) return a === b;
        return a.activities?.length === b.activities?.length && 
               a.hasMore === b.hasMore;
      }
    }
  );

  const issue = data?.issue;
  const activities = activityData?.activities || [];
  const hasMoreActivities = activityData?.hasMore || false;

  // Get permissions for the current user
  const { permissions, isLoading: permissionsLoading } = useIssuePermissions(issue || null);

  // Keyboard shortcut handlers
  const handleEditTitle = useCallback(() => {
    if (permissions?.canEdit && !isEditingTitle && !isEditingDescription) {
      setIsEditingTitle(true);
      announceStatus('Editing title field');
    }
  }, [permissions?.canEdit, isEditingTitle, isEditingDescription, announceStatus]);

  const handleEditDescription = useCallback(() => {
    if (permissions?.canEdit && !isEditingDescription && !isEditingTitle) {
      setIsEditingDescription(true);
      announceStatus('Editing description field');
    }
  }, [permissions?.canEdit, isEditingDescription, isEditingTitle, announceStatus]);

  const handleToggleShortcutsHelp = useCallback(() => {
    setShowShortcutsHelp(prev => !prev);
    announceStatus(showShortcutsHelp ? 'Keyboard shortcuts help closed' : 'Keyboard shortcuts help opened');
  }, [showShortcutsHelp, announceStatus]);

  const handleFocusFirstEditable = useCallback(() => {
    const editableElements = document.querySelectorAll('[data-editable="true"]');
    const firstEditable = editableElements[0] as HTMLElement;
    if (firstEditable) {
      firstEditable.focus();
      announceStatus('Focused on first editable field');
    }
  }, [announceStatus]);

  const handleGoBackToIssues = useCallback(() => {
    window.location.href = '/issues';
  }, []);

  // Configure keyboard shortcuts
  const modifierKey = getModifierKey();
  const shortcuts = [
    {
      key: 'e',
      action: handleEditTitle,
      description: 'Edit title',
      disabled: !permissions?.canEdit || isEditingTitle || isEditingDescription
    },
    {
      key: 'd',
      action: handleEditDescription,
      description: 'Edit description',
      disabled: !permissions?.canEdit || isEditingTitle || isEditingDescription
    },
    {
      key: 'f',
      action: handleFocusFirstEditable,
      description: 'Focus first editable field'
    },
    {
      key: '?',
      shiftKey: true,
      action: handleToggleShortcutsHelp,
      description: 'Show keyboard shortcuts help'
    },
    {
      key: 'Escape',
      action: () => {
        if (showShortcutsHelp) {
          setShowShortcutsHelp(false);
          announceStatus('Keyboard shortcuts help closed');
        } else if (isEditingTitle) {
          setIsEditingTitle(false);
          announceStatus('Cancelled editing title');
        } else if (isEditingDescription) {
          setIsEditingDescription(false);
          announceStatus('Cancelled editing description');
        }
      },
      description: 'Cancel current action or close help'
    },
    {
      key: 'b',
      [modifierKey]: true,
      action: handleGoBackToIssues,
      description: `Go back to issues list (${modifierKey === 'metaKey' ? '⌘' : 'Ctrl'}+B)`
    }
  ];

  // Enable keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts,
    enabled: !isLoading && !!issue
  });

  // Handle loading more activities with error handling
  const handleLoadMoreActivities = useCallback(async () => {
    if (activityData?.nextCursor) {
      try {
        setActivityCursor(activityData.nextCursor);
      } catch (error) {
        networkFeedback.serverError(() => handleLoadMoreActivities());
        console.error('Load more activity error:', error);
      }
    }
  }, [activityData]);

  // Manual retry handlers
  const handleRetryIssue = useCallback(async () => {
    try {
      await issueRetry.manualRetry(() => mutate());
    } catch (error) {
      // Error is already handled by the retry mechanism
    }
  }, [issueRetry, mutate]);

  const handleRetryActivity = useCallback(async () => {
    try {
      setActivityError(null);
      await activityRetry.manualRetry(() => mutateActivity());
    } catch (error) {
      // Error is already handled by the retry mechanism
    }
  }, [activityRetry, mutateActivity]);

  // Effect to handle attachment loading errors
  useEffect(() => {
    if (data?.issue?.attachments && attachmentError) {
      // Clear attachment error if we successfully loaded issue with attachments
      setAttachmentError(null);
    }
  }, [data?.issue?.attachments, attachmentError]);

  // Optimistic update handler
  const handleOptimisticUpdate = useCallback(
    async (field: string, value: any) => {
      if (!issue || !user) return;

      const previousData = data;
      const displayValue = typeof value === 'string' ? value : String(value);

      try {
        // Optimistic update
        mutate(
          {
            issue: {
              ...issue,
              [field]: value,
            },
          },
          false
        );

        // Make API call
        const response = await fetch(`/api/issues/${issueId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            field,
            value,
            actorId: user.id,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to update ${field}`);
        }

        const result = await response.json();
        const serverIssue = result?.issue;

        if (!serverIssue || typeof serverIssue !== 'object') {
          throw new Error('Invalid issue payload received from server');
        }

        const normalizedIssue = {
          ...serverIssue,
          attachments: Array.isArray(serverIssue.attachments)
            ? serverIssue.attachments
            : issue.attachments ?? []
        };

        if (!Array.isArray(serverIssue.attachments)) {
          console.warn(
            'Issue update response missing attachments. Preserving existing attachments to avoid UI flicker.'
          );
        }

        // Update with server response
        mutate({ issue: normalizedIssue }, false);

        // Revalidate activity timeline to show the new activity entry
        mutateActivity();

        // Show success feedback with undo option
        issueFeedback.updateSuccess(
          field,
          displayValue,
          () => {
            if (previousData) {
              mutate(previousData, false);
            }
          }
        );

        // Announce success to screen readers
        announceStatus(`${field} updated successfully`);
      } catch (error) {
        // Rollback on error
        if (previousData) {
          mutate(previousData, false);
        }
        
        const err = error instanceof Error ? error : new Error('Update failed');
        issueFeedback.updateError(
          field,
          err,
          () => handleOptimisticUpdate(field, value)
        );
        
        // Announce error to screen readers
        announceError(`Failed to update ${field}: ${err.message}`);
        console.error('Update error:', error);
      }
    },
    [issue, data, issueId, mutate, user, mutateActivity, announceStatus, announceError]
  );

  // Handle issue deletion
  const handleDelete = useCallback(async () => {
    if (!issue || !user) return;

    try {
      const response = await fetch(`/api/issues/${issueId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actorId: user.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to delete issue (${response.status})`);
      }

      // Show success feedback
      issueFeedback.deleteSuccess(issue.issueKey);
      
      // Small delay to show the success message before redirecting
      setTimeout(() => {
        window.location.href = '/issues';
      }, 1000);
    } catch (error) {
      console.error('Delete error:', error);
      throw error; // Re-throw to let the dialog handle the error
    }
  }, [issue, issueId, user]);

  // Critical error state - these errors should be handled by error boundary
  if (error && (error instanceof IssuePermissionError || error instanceof IssueNotFoundError)) {
    throw error;
  }

  // Network error state with retry
  if (error && error instanceof IssueNetworkError) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <Wifi className="h-4 w-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription className="mt-2">
            {error.message}
          </AlertDescription>
          <div className="flex gap-2 mt-4">
            <Button
              variant="default"
              size="sm"
              onClick={handleRetryIssue}
              disabled={issueRetry.isRetrying}
              className="flex items-center gap-2"
            >
              {issueRetry.isRetrying ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/issues'}
            >
              Back to Issues
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  // Other errors
  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading issue</AlertTitle>
          <AlertDescription className="mt-2">
            {error.message || 'Unable to load issue details. Please try again.'}
          </AlertDescription>
          <div className="flex gap-2 mt-4">
            <Button
              variant="default"
              size="sm"
              onClick={handleRetryIssue}
              disabled={issueRetry.isRetrying}
              className="flex items-center gap-2"
            >
              {issueRetry.isRetrying ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/issues'}
            >
              Back to Issues
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  // Loading state with enhanced skeleton - only show if we don't have any data yet
  if ((isLoading && !data) || (sessionLoading && !user) || (permissionsLoading && !issue)) {
    return <EnhancedResponsiveIssueLayoutSkeleton />;
  }

  // Not found state (shouldn't happen with proper error handling, but keep as fallback)
  if (!issue) {
    throw new IssueNotFoundError(issueId);
  }

  // Transform attachments to match expected type
  const attachments = (issue.attachments || []).map(att => ({
    ...att,
    createdAt: att.createdAt instanceof Date ? att.createdAt.toISOString() : att.createdAt,
  }));

  return (
    <div ref={containerRef as React.RefObject<HTMLDivElement>} className="h-full" role="main" aria-label={`Issue ${issue.issueKey} details`}>
      <ResponsiveIssueLayout
        issueId={issueId}
        issueData={issue}
        attachments={attachments}
        permissions={permissions || { canEdit: false, canDelete: false, canComment: false }} // Provide default permissions to prevent loading flash
        activities={activities}
        activitiesLoading={activityLoading || activityRetry.isRetrying}
        hasMoreActivities={hasMoreActivities}
        onLoadMoreActivities={handleLoadMoreActivities}
        onUpdate={handleOptimisticUpdate}
        onDelete={handleDelete}
        isLoading={false}
        // Pass error states and retry handlers for partial failures
        attachmentError={attachmentError}
        activityError={activityError}
        onRetryActivity={handleRetryActivity}
        onRetryAttachments={() => {
          setAttachmentError(null);
          mutate(); // Refetch issue data which includes attachments
        }}
        // Pass keyboard shortcut states
        isEditingTitle={isEditingTitle}
        isEditingDescription={isEditingDescription}
        onEditingTitleChange={setIsEditingTitle}
        onEditingDescriptionChange={setIsEditingDescription}
        showShortcutsHelp={showShortcutsHelp}
        onToggleShortcutsHelp={handleToggleShortcutsHelp}
        shortcuts={shortcuts}
      />
    </div>
  );
}
