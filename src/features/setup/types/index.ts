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

export type DefaultMemberRole = 'TEAM_VIEWER' | 'TEAM_MEMBER' | 'TEAM_EDITOR';

export interface InstanceStatus {
  isSetupComplete: boolean;
  instanceName: string | null;
  adminEmail: string | null;
  defaultWorkspaceId: string | null;
  defaultMemberRole: DefaultMemberRole;
  isMultiTeamMode: boolean;
  skipEmailVerification: boolean;
}

export type SetupWizardStep =
  | 'health-check'
  | 'admin-account'
  | 'instance-config'
  | 'mail-config'
  | 'first-team'
  | 'sample-data'
  | 'complete';

export interface SetupWizardState {
  currentStep: SetupWizardStep;
  completedSteps: SetupWizardStep[];
  adminData: { email: string; name: string } | null;
  instanceData: { name: string } | null;
  teamData: { id: string; name: string; slug: string } | null;
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
}

export interface FirstTeamData {
  teamName: string;
}

export interface SetupCompleteData {
  teamId: string;
  createSampleData: boolean;
}
