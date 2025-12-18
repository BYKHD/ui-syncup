/**
 * Hook for fetching user's linked OAuth accounts
 *
 * Provides:
 * - List of accounts linked to current user
 * - Account count for last-method protection logic
 *
 * @module features/auth/hooks/use-linked-accounts
 */

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { LinkedAccount } from "../api/types";

/**
 * Query key for linked accounts
 */
export const linkedAccountsQueryKey = ["linked-accounts"] as const;

/**
 * Hook to fetch linked accounts for the current user
 *
 * @returns Query result with linked accounts data
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useLinkedAccounts();
 *
 * if (isLoading) return <Loading />;
 * if (error) return <Error message={error.message} />;
 *
 * return (
 *   <ul>
 *     {data?.map((account) => (
 *       <li key={account.id}>{account.providerId}</li>
 *     ))}
 *   </ul>
 * );
 * ```
 */
export function useLinkedAccounts() {
  return useQuery<LinkedAccount[], Error>({
    queryKey: linkedAccountsQueryKey,
    queryFn: async () => {
      const accounts = await apiClient<LinkedAccount[]>("/api/user/linked-accounts");

      // Map the response to our LinkedAccount type (ensure date parsing if needed, 
      // though apiClient usually handles JSON parsing so dates will be strings)
      return accounts.map((account: any) => ({
        id: account.id,
        providerId: account.providerId as LinkedAccount["providerId"],
        accountId: account.accountId,
        createdAt: account.createdAt,
      }));
    },
    // Cache for 5 minutes since linked accounts don't change often
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Check if user can unlink an account
 *
 * Users cannot unlink their last authentication method
 *
 * @param accounts - Current linked accounts
 * @returns True if unlinking is allowed
 */
export function canUnlinkAccount(accounts: LinkedAccount[] | undefined): boolean {
  if (!accounts) return false;
  // Must have at least 2 accounts to unlink one
  return accounts.length > 1;
}

/**
 * Check if a specific provider is linked
 *
 * @param accounts - Current linked accounts
 * @param providerId - Provider to check
 * @returns True if provider is linked
 */
export function isProviderLinked(
  accounts: LinkedAccount[] | undefined,
  providerId: LinkedAccount["providerId"]
): boolean {
  if (!accounts) return false;
  return accounts.some((account) => account.providerId === providerId);
}
