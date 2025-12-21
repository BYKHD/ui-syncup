"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RiLoader4Line } from "@remixicon/react";
import { authClient } from "@/lib/auth-client";
import { OAUTH_PROVIDER_LIST, type OAuthProviderId } from "@/config/integrations";

/**
 * Provider configuration type matching API response
 */
interface ProviderStatus {
  enabled: boolean;
}

interface ProvidersResponse {
  providers: {
    google: ProviderStatus;
    microsoft: ProviderStatus;
    atlassian: ProviderStatus;
  };
}

export interface SocialLoginButtonsProps {
  /**
   * URL to redirect to after successful authentication
   */
  redirectTo?: string;
  /**
   * Callback when an error occurs
   */
  onError?: (error: string) => void;
  /**
   * Whether to disable all buttons (e.g., during form submission)
   */
  disabled?: boolean;
  /**
   * Layout direction for buttons
   */
  layout?: "vertical" | "horizontal";
}

/**
 * Social Login Buttons Component
 *
 * Renders OAuth provider buttons dynamically based on server configuration.
 * Fetches enabled providers from /api/auth/providers and displays appropriate buttons.
 *
 * Features:
 * - Dynamic provider visibility based on configuration
 * - Loading states during authentication
 * - Error handling with user-friendly messages
 * - Accessible with proper ARIA labels
 *
 * @example
 * ```tsx
 * <SocialLoginButtons
 *   redirectTo="/dashboard"
 *   onError={(error) => console.error(error)}
 * />
 * ```
 */
export function SocialLoginButtons({
  redirectTo = "/projects",
  onError,
  disabled = false,
  layout = "vertical",
}: SocialLoginButtonsProps) {
  const [providers, setProviders] = useState<ProvidersResponse["providers"] | null>(null);
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);
  const [loadingProvider, setLoadingProvider] = useState<OAuthProviderId | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch enabled providers on mount
  useEffect(() => {
    async function fetchProviders() {
      try {
        const response = await fetch("/api/auth/providers");
        if (!response.ok) {
          throw new Error("Failed to fetch providers");
        }
        const data: ProvidersResponse = await response.json();
        setProviders(data.providers);
      } catch (err) {
        console.error("Failed to fetch OAuth providers:", err);
        // Fall back to showing Google only (always enabled)
        setProviders({
          google: { enabled: true },
          microsoft: { enabled: false },
          atlassian: { enabled: false },
        });
      } finally {
        setIsLoadingProviders(false);
      }
    }

    fetchProviders();
  }, []);

  /**
   * Handle OAuth sign-in for a specific provider
   */
  const handleSignIn = async (provider: OAuthProviderId) => {
    setLoadingProvider(provider);
    setError(null);

    try {
      const response = await authClient.signIn.social({
        provider,
        callbackURL: redirectTo,
      });

      if (response?.error) {
        const message =
          response.error.message || `Failed to sign in with ${provider}`;
        setError(message);
        onError?.(message);
        setLoadingProvider(null);
        return;
      }

      const redirectPayload = response?.data;

      // In local/dev auth setups better-auth might return a URL without auto-redirecting.
      if (
        redirectPayload?.url &&
        redirectPayload.redirect === false &&
        typeof window !== "undefined"
      ) {
        window.location.href = redirectPayload.url;
        return;
      }

      // If no redirect happened (e.g., mocked response), clear loading state.
      setLoadingProvider(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : `Failed to sign in with ${provider}`;
      setError(errorMessage);
      onError?.(errorMessage);
      setLoadingProvider(null);
    }
  };

  // Get enabled providers
  const enabledProviders = OAUTH_PROVIDER_LIST.filter(
    (config) => providers?.[config.id]?.enabled
  );

  // Show skeleton while loading
  if (isLoadingProviders) {
    return (
      <div className={`flex ${layout === "horizontal" ? "flex-row gap-2" : "flex-col gap-3"}`}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-10 w-full animate-pulse rounded-md bg-muted"
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }

  // No enabled providers (shouldn't happen, Google is always enabled)
  if (enabledProviders.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Sign-in Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div
        className={`flex ${layout === "horizontal" ? "flex-row gap-2" : "flex-col gap-3"}`}
        role="group"
        aria-label="Social login options"
      >
        {enabledProviders.map((config) => {
          const Icon = config.icon;
          const isLoading = loadingProvider === config.id;
          const isDisabled = disabled || loadingProvider !== null;

          return (
            <Button
              key={config.id}
              variant="outline"
              className="w-full"
              type="button"
              onClick={() => handleSignIn(config.id)}
              disabled={isDisabled}
              aria-label={config.ariaLabel}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <RiLoader4Line className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <Icon className="mr-2 h-5 w-5" aria-hidden="true" />
              )}
              {isLoading
                ? `Signing in with ${config.name}…`
                : `Continue with ${config.name}`}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export default SocialLoginButtons;
