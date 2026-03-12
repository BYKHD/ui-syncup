/**
 * Create Admin Fetcher
 * @description Creates the first admin user during setup
 */

import { apiClient } from '@/lib/api-client';
import {
  AdminAccountResponseSchema,
  type AdminAccountRequestDTO,
  type AdminAccountResponseDTO,
} from './types';

export async function createAdmin(
  data: AdminAccountRequestDTO
): Promise<AdminAccountResponseDTO> {
  const response = await apiClient<AdminAccountResponseDTO>('/api/setup/admin', {
    method: 'POST',
    body: data,
  });
  return AdminAccountResponseSchema.parse(response);
}
