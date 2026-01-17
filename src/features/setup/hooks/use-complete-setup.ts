'use client';

/**
 * useCompleteSetup Hook
 * @description React Query mutation hook for completing setup
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { completeSetup } from '../api';
import type { SetupCompleteRequestDTO, SetupCompleteResponseDTO } from '../api';
import { INSTANCE_STATUS_QUERY_KEY } from './use-instance-status';

export function useCompleteSetup() {
  const queryClient = useQueryClient();

  return useMutation<SetupCompleteResponseDTO, Error, SetupCompleteRequestDTO>({
    mutationFn: completeSetup,
    onSuccess: () => {
      // Invalidate instance status to reflect setup completion
      queryClient.invalidateQueries({ queryKey: INSTANCE_STATUS_QUERY_KEY });
    },
  });
}
