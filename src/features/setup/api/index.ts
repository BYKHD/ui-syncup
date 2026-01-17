/**
 * Setup API Barrel Export
 */

// Fetchers
export { getInstanceStatus } from './get-instance-status';
export { getServiceHealth } from './get-service-health';
export { createAdmin } from './create-admin';
export { saveInstanceConfig } from './save-instance-config';
export { createFirstWorkspace } from './create-first-workspace';
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
  FirstWorkspaceRequestSchema,
  FirstWorkspaceResponseSchema,
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
  FirstWorkspaceRequestDTO,
  FirstWorkspaceResponseDTO,
  SetupCompleteRequestDTO,
  SetupCompleteResponseDTO,
} from './types';
