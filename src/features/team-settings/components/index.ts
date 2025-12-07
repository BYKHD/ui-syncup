/**
 * Settings Feature Components
 * Barrel export for all settings-related UI components
 */

// Core settings components
export { default as TeamSettingsGeneral } from "./team-settings-general";
export { SettingsSection } from "./settings-section";
export { SettingsNavigation } from "./settings-navigation";

// Team components
export { TeamInformationForm } from "./team-information-form";
export type { TeamInformationFormProps } from "./team-information-form";
export { TeamDangerZone } from "./team-danger-zone";

// Permission & access components
export { PermissionGuard } from "./permission-guard";
export { TeamPermissionGuard } from "./team-permission-guard";
export { UnauthorizedAccess } from "./unauthorized-access";

// Context providers
export { SettingsContextProvider } from "./settings-context-provider";

// Error handling
export { SettingsErrorBoundary } from "./settings-error-boundary";

// Loading states
export {
  LoadingSpinner,
  LoadingButton,
  SettingsPageSkeleton,
  TeamSettingsLoadingSkeleton,
  TeamMembersLoadingSkeleton,
  PermissionLoadingSkeleton,
  BillingLoadingSkeleton,
  FormFieldSkeleton,
  TableLoadingSkeleton,
  ContentLoading,
  InlineLoading,
} from "./loading-states";
