/**
 * USE ISSUE DELETE HOOK
 * Ready-to-wire: React Query mutation for deleting issues
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { deleteIssue, type DeleteIssueParams, type DeleteIssueResponse } from '../api';
import { issueKeys } from './use-issue-details';

// ============================================================================
// HOOK
// ============================================================================

export interface UseIssueDeleteOptions {
  onSuccess?: (data: DeleteIssueResponse) => void;
  onError?: (error: Error) => void;
}

export interface UseIssueDeleteResult {
  mutate: (params: DeleteIssueParams) => void;
  mutateAsync: (params: DeleteIssueParams) => Promise<DeleteIssueResponse>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  reset: () => void;
}

/**
 * Ready-to-wire mutation hook for deleting issues
 * Automatically invalidates issue lists
 *
 * @example
 * ```tsx
 * const { mutate: deleteIssueById, isPending } = useIssueDelete({
 *   onSuccess: () => {
 *     toast.success('Issue deleted');
 *     router.push('/issues');
 *   },
 *   onError: (error) => toast.error(error.message),
 * });
 *
 * deleteIssueById({ issueId: 'issue_1', actorId: 'user_1' });
 * ```
 *
 * TODO: wire to React Query when backend is ready
 * - Currently uses mock data from fixtures
 */
export function useIssueDelete(options?: UseIssueDeleteOptions): UseIssueDeleteResult {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (params: DeleteIssueParams) => deleteIssue(params),
    onSuccess: (data, variables) => {
      // Remove the deleted issue from cache
      queryClient.removeQueries({ queryKey: issueKeys.detail(variables.issueId) });

      // Invalidate issue lists to refetch
      queryClient.invalidateQueries({ queryKey: issueKeys.lists() });

      // Show success toast
      toast.success('Issue deleted successfully');

      // Call custom success handler
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      // Show error toast
      toast.error(error.message || 'Failed to delete issue');

      // Call custom error handler
      options?.onError?.(error);
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    reset: mutation.reset,
  };
}
