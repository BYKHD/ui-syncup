'use client';

/**
 * useCreateAdmin Hook
 * @description React Query mutation hook for creating admin account
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createAdmin } from '../api';
import type { AdminAccountRequestDTO, AdminAccountResponseDTO } from '../api';
import { INSTANCE_STATUS_QUERY_KEY } from './use-instance-status';

export function useCreateAdmin() {
  const queryClient = useQueryClient();

  return useMutation<AdminAccountResponseDTO, Error, AdminAccountRequestDTO>({
    mutationFn: createAdmin,
    onSuccess: () => {
      // Invalidate instance status to reflect the new admin
      queryClient.invalidateQueries({ queryKey: INSTANCE_STATUS_QUERY_KEY });
    },
  });
}
