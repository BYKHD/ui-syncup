/**
 * Hook for linking a new OAuth provider to the current user
 *
 * Uses better-auth's linkSocial method which:
 * - Redirects to OAuth provider consent screen
 * - Creates Provider_Account on successful auth
 * - Validates account not already linked to another user
 *
 * @module features/auth/hooks/use-link-account
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import type { OAuthProvider } from "../api/types";
import { linkedAccountsQueryKey } from "./use-linked-accounts";

interface LinkAccountOptions {
  /** OAuth provider to link */
  provider: OAuthProvider;
  /** URL to redirect to after linking (default: /settings/security) */
  callbackURL?: string;
}

interface LinkAccountResult {
  /** Whether the link operation was initiated successfully */
  success: boolean;
  /** Redirect URL if provided by the OAuth flow */
  url?: string;
}

/**
 * Hook to link a new OAuth provider to the current user
 *
 * @returns Mutation for linking an OAuth account
 *
 * @example
 * ```tsx
 * const { mutate: linkAccount, isPending } = useLinkAccount();
 *
 * const handleLink = () => {
 *   linkAccount({ provider: "google" }, {
 *     onSuccess: () => {
 *       // Redirect handled by OAuth flow
 *     },
 *     onError: (error) => {
 *       toast.error(error.message);
 *     },
 *   });
 * };
 * ```
 */
export function useLinkAccount() {
  const queryClient = useQueryClient();

  return useMutation<LinkAccountResult, Error, LinkAccountOptions>({
    mutationFn: async ({ provider, callbackURL = "/settings/security" }) => {
      const response = await authClient.linkSocial({
        provider,
        callbackURL,
      });

      if (response.error) {
        throw new Error(
          response.error.message || `Failed to link ${provider} account`
        );
      }

      return {
        success: true,
        url: response.data?.url,
      };
    },
    onSuccess: () => {
      // Invalidate linked accounts cache to refetch after OAuth return
      queryClient.invalidateQueries({ queryKey: linkedAccountsQueryKey });
    },
  });
}
