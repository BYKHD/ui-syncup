/**
 * USE ISSUE UPDATE HOOK
 * Ready-to-wire: React Query mutation for updating issue fields
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { updateIssue } from '../api';
import { issueKeys } from './use-issue-details';
import type { IssueUpdateResponse } from '@/types/issue';

// ============================================================================
// HOOK
// ============================================================================

export interface UseIssueUpdateOptions {
  onSuccess?: (data: IssueUpdateResponse) => void;
  onError?: (error: Error) => void;
}

export interface UseIssueUpdateParams {
  issueId: string;
  field: string;
  value: any;
  actorId: string;
}

export interface UseIssueUpdateResult {
  mutate: (params: UseIssueUpdateParams) => void;
  mutateAsync: (params: UseIssueUpdateParams) => Promise<IssueUpdateResponse>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  reset: () => void;
}

/**
 * Ready-to-wire mutation hook for updating issue fields
 * Automatically revalidates issue details and activities
 *
 * @example
 * ```tsx
 * const { mutate: updateField, isPending } = useIssueUpdate({
 *   onSuccess: () => toast.success('Issue updated'),
 *   onError: (error) => toast.error(error.message),
 * });
 *
 * updateField({
 *   issueId: 'issue_1',
 *   field: 'status',
 *   value: 'in_progress',
 *   actorId: 'user_1'
 * });
 * ```
 *
 * TODO: wire to React Query when backend is ready
 * - Currently uses mock data from fixtures
 */
export function useIssueUpdate(options?: UseIssueUpdateOptions): UseIssueUpdateResult {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ issueId, field, value, actorId }: UseIssueUpdateParams) =>
      updateIssue({ issueId, field, value, actorId }),
    onSuccess: (data, variables) => {
      // Invalidate issue details and activities to refetch latest data
      queryClient.invalidateQueries({ queryKey: issueKeys.detail(variables.issueId) });
      queryClient.invalidateQueries({ queryKey: issueKeys.activities(variables.issueId) });

      // Show success toast
      toast.success('Issue updated successfully');

      // Call custom success handler
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      // Show error toast
      toast.error(error.message || 'Failed to update issue');

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
