'use client';

/**
 * useTeamMode Hook
 * @description Client-side hook for team mode detection
 */

import { useInstanceStatus } from './use-instance-status';

export function useTeamMode() {
  const { data, isLoading, error } = useInstanceStatus();

  return {
    isMultiTeamMode: data?.isMultiTeamMode ?? false,
    isSingleTeamMode: data ? !data.isMultiTeamMode : true,
    isLoading,
    error,
  };
}

/** @deprecated Use useTeamMode */
export const useWorkspaceMode = useTeamMode;
