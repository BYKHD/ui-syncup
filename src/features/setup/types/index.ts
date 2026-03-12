/**
 * Setup Feature Domain Types
 * @description Types for the instance setup wizard
 */

export type ServiceStatus = 'connected' | 'not_configured' | 'error';

export interface ServiceHealthItem {
  status: ServiceStatus;
  message: string;
  degradedBehavior?: string;
}

export interface ServiceHealth {
  database: ServiceHealthItem;
  email: ServiceHealthItem;
  storage: ServiceHealthItem;
  redis: ServiceHealthItem;
}

export type DefaultMemberRole = 'WORKSPACE_VIEWER' | 'WORKSPACE_MEMBER' | 'WORKSPACE_EDITOR';

export interface InstanceStatus {
  isSetupComplete: boolean;
  instanceName: string | null;
  publicUrl: string | null;
  adminEmail: string | null;
  defaultWorkspaceId: string | null;
  defaultMemberRole: DefaultMemberRole;
  isMultiWorkspaceMode: boolean;
  skipEmailVerification: boolean;
}

export type SetupWizardStep =
  | 'health-check'
  | 'admin-account'
  | 'instance-config'
  | 'first-workspace'
  | 'sample-data'
  | 'complete';

export interface SetupWizardState {
  currentStep: SetupWizardStep;
  completedSteps: SetupWizardStep[];
  adminData: { email: string; name: string } | null;
  instanceData: { name: string; publicUrl: string } | null;
  workspaceData: { id: string; name: string; slug: string } | null;
  includeSampleData: boolean;
}

export interface AdminAccountData {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
}

export interface InstanceConfigData {
  instanceName: string;
  publicUrl?: string;
}

export interface FirstWorkspaceData {
  workspaceName: string;
}

export interface SetupCompleteData {
  workspaceId: string;
  createSampleData: boolean;
}
