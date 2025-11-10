// ============================================================================
// USE ISSUE DELETE HOOK
// React hook for deleting issues
// ============================================================================

import { useState, useCallback } from 'react';
import { deleteIssue, type DeleteIssueParams, type DeleteIssueResponse } from '../api';

export interface UseIssueDeleteOptions {
  onSuccess?: (data: DeleteIssueResponse) => void;
  onError?: (error: Error) => void;
}

export interface UseIssueDeleteReturn {
  deleteIssueById: (issueId: string, actorId: string) => Promise<DeleteIssueResponse>;
  isDeleting: boolean;
  error: Error | null;
}

/**
 * Hook for deleting issues
 *
 * @example
 * ```tsx
 * const { deleteIssueById, isDeleting } = useIssueDelete({
 *   onSuccess: () => {
 *     toast.success('Issue deleted');
 *     router.push('/issues');
 *   },
 *   onError: (error) => toast.error(error.message),
 * });
 *
 * await deleteIssueById('issue_1', 'user_1');
 * ```
 */
export function useIssueDelete(options: UseIssueDeleteOptions = {}): UseIssueDeleteReturn {
  const { onSuccess, onError } = options;
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteIssueById = useCallback(
    async (issueId: string, actorId: string): Promise<DeleteIssueResponse> => {
      setIsDeleting(true);
      setError(null);

      try {
        const params: DeleteIssueParams = {
          issueId,
          actorId,
        };

        const response = await deleteIssue(params);

        if (onSuccess) {
          onSuccess(response);
        }

        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Delete failed');
        setError(error);

        if (onError) {
          onError(error);
        }

        throw error;
      } finally {
        setIsDeleting(false);
      }
    },
    [onSuccess, onError]
  );

  return {
    deleteIssueById,
    isDeleting,
    error,
  };
}
