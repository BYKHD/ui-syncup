'use client';

/**
 * useWorkspaceMode Hook
 * @description Client-side hook for workspace mode detection
 */

import { useInstanceStatus } from './use-instance-status';

export function useWorkspaceMode() {
  const { data, isLoading, error } = useInstanceStatus();

  return {
    isMultiWorkspaceMode: data?.isMultiWorkspaceMode ?? false,
    isSingleWorkspaceMode: data ? !data.isMultiWorkspaceMode : true,
    isLoading,
    error,
  };
}
