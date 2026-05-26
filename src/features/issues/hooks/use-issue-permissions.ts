'use client';

/**
 * useIssuePermissions
 *
 * Reads the viewer's resolved permission strings from the already-cached
 * useIssueDetails response and maps them to the IssuePermissions shape used
 * by the UI layer. React Query deduplicates the underlying fetch, so calling
 * this hook on a page that already calls useIssueDetails adds zero network
 * overhead.
 */

import { useMemo } from 'react';
import { useIssueDetails } from './use-issue-details';
import type { IssuePermissions } from '@/features/issues/types';

export interface UseIssuePermissionsParams {
  issueId: string;
}

export function useIssuePermissions({ issueId }: UseIssuePermissionsParams): IssuePermissions {
  const { permissions } = useIssueDetails({ issueId });

  return useMemo((): IssuePermissions => {
    if (!permissions) {
      return {
        canEdit: false,
        canDelete: false,
        canComment: false,
        canAssign: false,
        canChangeStatus: false,
      };
    }

    return {
      canEdit: permissions.includes('issue:update'),
      canDelete: permissions.includes('issue:delete'),
      canComment: permissions.includes('issue:comment'),
      canAssign: permissions.includes('issue:assign'),
      canChangeStatus: permissions.includes('issue:update'),
    };
  }, [permissions]);
}
