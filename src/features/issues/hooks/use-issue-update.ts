// ============================================================================
// USE ISSUE UPDATE HOOK
// React hook for updating issue fields with optimistic updates
// ============================================================================

import { useState, useCallback } from 'react';
import { updateIssue, type UpdateIssueParams } from '../api';
import type { IssueUpdateResponse } from '@/src/types/issue';

export interface UseIssueUpdateOptions {
  onSuccess?: (data: IssueUpdateResponse) => void;
  onError?: (error: Error) => void;
}

export interface UseIssueUpdateReturn {
  updateField: (issueId: string, field: string, value: any, actorId: string) => Promise<IssueUpdateResponse>;
  isUpdating: boolean;
  error: Error | null;
}

/**
 * Hook for updating issue fields
 *
 * @example
 * ```tsx
 * const { updateField, isUpdating } = useIssueUpdate({
 *   onSuccess: (data) => console.log('Updated:', data),
 *   onError: (error) => console.error('Error:', error),
 * });
 *
 * await updateField('issue_1', 'title', 'New title', 'user_1');
 * ```
 */
export function useIssueUpdate(options: UseIssueUpdateOptions = {}): UseIssueUpdateReturn {
  const { onSuccess, onError } = options;
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateField = useCallback(
    async (
      issueId: string,
      field: string,
      value: any,
      actorId: string
    ): Promise<IssueUpdateResponse> => {
      setIsUpdating(true);
      setError(null);

      try {
        const params: UpdateIssueParams = {
          issueId,
          field,
          value,
          actorId,
        };

        const response = await updateIssue(params);

        if (onSuccess) {
          onSuccess(response);
        }

        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Update failed');
        setError(error);

        if (onError) {
          onError(error);
        }

        throw error;
      } finally {
        setIsUpdating(false);
      }
    },
    [onSuccess, onError]
  );

  return {
    updateField,
    isUpdating,
    error,
  };
}
