/**
 * Setup API Barrel Export
 */

// Fetchers
export { getInstanceStatus } from './get-instance-status';
export { getServiceHealth } from './get-service-health';
export { createAdmin } from './create-admin';
export { saveInstanceConfig } from './save-instance-config';
export { createFirstTeam } from './create-first-team';
export { completeSetup } from './complete-setup';

// Schemas
export {
  ServiceStatusSchema,
  ServiceHealthItemSchema,
  ServiceHealthSchema,
  InstanceStatusSchema,
  DefaultMemberRoleSchema,
  AdminAccountRequestSchema,
  AdminAccountResponseSchema,
  InstanceConfigRequestSchema,
  InstanceConfigResponseSchema,
  FirstTeamRequestSchema,
  FirstTeamResponseSchema,
  SetupCompleteRequestSchema,
  SetupCompleteResponseSchema,
} from './types';

// Types
export type {
  ServiceStatusDTO,
  ServiceHealthItemDTO,
  ServiceHealthDTO,
  InstanceStatusDTO,
  AdminAccountRequestDTO,
  AdminAccountResponseDTO,
  InstanceConfigRequestDTO,
  InstanceConfigResponseDTO,
  FirstTeamRequestDTO,
  FirstTeamResponseDTO,
  SetupCompleteRequestDTO,
  SetupCompleteResponseDTO,
} from './types';
