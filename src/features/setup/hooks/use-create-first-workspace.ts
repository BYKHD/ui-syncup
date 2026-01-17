'use client';

/**
 * useCreateFirstWorkspace Hook
 * @description React Query mutation hook for creating the first workspace
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFirstWorkspace } from '../api';
import type { FirstWorkspaceRequestDTO, FirstWorkspaceResponseDTO } from '../api';
import { INSTANCE_STATUS_QUERY_KEY } from './use-instance-status';

export function useCreateFirstWorkspace() {
  const queryClient = useQueryClient();

  return useMutation<FirstWorkspaceResponseDTO, Error, FirstWorkspaceRequestDTO>({
    mutationFn: createFirstWorkspace,
    onSuccess: () => {
      // Invalidate instance status as creating a workspace might affect global state
      // or at least be a significant milestone
      queryClient.invalidateQueries({ queryKey: INSTANCE_STATUS_QUERY_KEY });
    },
  });
}
