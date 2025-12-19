import { RiGoogleFill, RiMicrosoftFill } from "@remixicon/react";
import { AtlassianIcon } from "@/components/icons";
import { Figma } from "lucide-react";

/**
 * Centralized configuration for OAuth providers and integrations.
 * 
 * This is the single source of truth for all provider/integration UI data.
 * When updating icons, names, or colors, change them here and all usages
 * will be updated automatically.
 */

// =============================================================================
// Types
// =============================================================================

export type OAuthProviderId = "google" | "microsoft" | "atlassian";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconComponent = React.ComponentType<any>;

export interface ProviderConfig {
  id: OAuthProviderId;
  name: string;
  icon: IconComponent;
  ariaLabel: string;
}

export type IntegrationId = "figma" | "jira";
export type IntegrationStatus = "Ready" | "Coming Soon";

export interface IntegrationConfig {
  id: IntegrationId;
  name: string;
  icon: IconComponent;
  status: IntegrationStatus;
  description: string;
  features: string[];
  /** Tailwind text color class, e.g., "text-purple-500" */
  color: string;
  /** Tailwind background color class, e.g., "bg-purple-500/10" */
  bg: string;
  /** Tailwind border color class, e.g., "border-purple-500/20" */
  border: string;
}

// =============================================================================
// OAuth Provider Configurations
// =============================================================================

/**
 * OAuth provider configurations used across:
 * - Social login buttons (sign-in/sign-up)
 * - Security settings (linked accounts)
 */
export const OAUTH_PROVIDERS: Record<OAuthProviderId, ProviderConfig> = {
  google: {
    id: "google",
    name: "Google",
    icon: RiGoogleFill,
    ariaLabel: "Sign in with Google",
  },
  microsoft: {
    id: "microsoft",
    name: "Microsoft",
    icon: RiMicrosoftFill,
    ariaLabel: "Sign in with Microsoft",
  },
  atlassian: {
    id: "atlassian",
    name: "Atlassian",
    icon: AtlassianIcon,
    ariaLabel: "Sign in with Atlassian",
  },
} as const;

/**
 * Ordered list of OAuth providers for UI rendering
 */
export const OAUTH_PROVIDER_LIST: ProviderConfig[] = [
  OAUTH_PROVIDERS.google,
  OAUTH_PROVIDERS.microsoft,
  OAUTH_PROVIDERS.atlassian,
];

// =============================================================================
// Integration Configurations
// =============================================================================

/**
 * Third-party integration configurations used in:
 * - Landing page integrations section
 * - (Future) Settings integrations page
 */
export const INTEGRATIONS: Record<IntegrationId, IntegrationConfig> = {
  figma: {
    id: "figma",
    name: "Figma",
    icon: Figma,
    status: "Ready",
    description: "Import designs, sync frames, and annotate mockups in real-time",
    features: ["Live frame sync", "Auto-import designs", "Two-way comments"],
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
  },
  jira: {
    id: "jira",
    name: "Jira",
    icon: AtlassianIcon,
    status: "Coming Soon",
    description: "Seamlessly sync issues between UI SyncUp and Jira projects",
    features: ["Bi-directional sync", "Custom field mapping", "Status automation"],
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
} as const;

/**
 * Ordered list of integrations for UI rendering
 */
export const INTEGRATION_LIST: IntegrationConfig[] = [
  INTEGRATIONS.figma,
  INTEGRATIONS.jira,
];
