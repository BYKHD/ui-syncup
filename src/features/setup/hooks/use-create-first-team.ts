'use client';

/**
 * useCreateFirstTeam Hook
 * @description React Query mutation hook for creating the first team
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFirstTeam } from '../api';
import type { FirstTeamRequestDTO, FirstTeamResponseDTO } from '../api';
import { INSTANCE_STATUS_QUERY_KEY } from './use-instance-status';

export function useCreateFirstTeam() {
  const queryClient = useQueryClient();

  return useMutation<FirstTeamResponseDTO, Error, FirstTeamRequestDTO>({
    mutationFn: createFirstTeam,
    onSuccess: () => {
      // Invalidate instance status as creating a team might affect global state
      queryClient.invalidateQueries({ queryKey: INSTANCE_STATUS_QUERY_KEY });
    },
  });
}
