/**
 * Hook for unlinking an OAuth provider from the current user
 *
 * Features:
 * - Uses better-auth's unlinkAccount method
 * - Validates at least one auth method remains (via better-auth config)
 * - Returns error if trying to unlink last auth method
 *
 * @module features/auth/hooks/use-unlink-account
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { linkedAccountsQueryKey } from "./use-linked-accounts";

interface UnlinkAccountOptions {
  /** Provider ID to unlink (e.g., "google", "microsoft", "atlassian") */
  providerId: string;
}

interface UnlinkAccountResult {
  /** Whether the unlink operation was successful */
  success: boolean;
}

/**
 * Error thrown when trying to unlink the last authentication method
 */
export class LastAuthMethodError extends Error {
  constructor() {
    super("Cannot unlink your last authentication method");
    this.name = "LastAuthMethodError";
  }
}

/**
 * Hook to unlink an OAuth provider from the current user
 *
 * @returns Mutation for unlinking an OAuth account
 *
 * @example
 * ```tsx
 * const { mutate: unlinkAccount, isPending } = useUnlinkAccount();
 * const { data: accounts } = useLinkedAccounts();
 *
 * const handleUnlink = (providerId: string) => {
 *   if (!canUnlinkAccount(accounts)) {
 *     toast.error("Cannot unlink your last authentication method");
 *     return;
 *   }
 *
 *   unlinkAccount({ providerId }, {
 *     onSuccess: () => {
 *       toast.success("Account unlinked successfully");
 *     },
 *     onError: (error) => {
 *       toast.error(error.message);
 *     },
 *   });
 * };
 * ```
 */
export function useUnlinkAccount() {
  const queryClient = useQueryClient();

  return useMutation<UnlinkAccountResult, Error, UnlinkAccountOptions>({
    mutationFn: async ({ providerId }) => {
      const response = await authClient.unlinkAccount({
        providerId,
      });

      if (response.error) {
        // Check for specific error codes
        const errorCode = response.error.code;
        const errorMessage = response.error.message;

        // Handle "last auth method" error
        if (
          errorCode === "CANNOT_UNLINK_LAST_ACCOUNT" ||
          errorMessage?.includes("last") ||
          errorMessage?.includes("only")
        ) {
          throw new LastAuthMethodError();
        }

        throw new Error(
          errorMessage || `Failed to unlink ${providerId} account`
        );
      }

      return {
        success: true,
      };
    },
    onSuccess: () => {
      // Refetch linked accounts to update the list
      queryClient.invalidateQueries({ queryKey: linkedAccountsQueryKey });
    },
  });
}
