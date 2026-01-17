'use client';

/**
 * useSaveInstanceConfig Hook
 * @description React Query mutation hook for saving instance configuration
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveInstanceConfig } from '../api';
import type { InstanceConfigRequestDTO, InstanceConfigResponseDTO } from '../api';
import { INSTANCE_STATUS_QUERY_KEY } from './use-instance-status';

export function useSaveInstanceConfig() {
  const queryClient = useQueryClient();

  return useMutation<InstanceConfigResponseDTO, Error, InstanceConfigRequestDTO>({
    mutationFn: saveInstanceConfig,
    onSuccess: () => {
      // Invalidate instance status to reflect the new config
      queryClient.invalidateQueries({ queryKey: INSTANCE_STATUS_QUERY_KEY });
    },
  });
}
