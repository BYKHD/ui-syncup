/**
 * Server-side React Query utilities for SSR data prefetching
 * 
 * Enables prefetching data on the server to hydrate the client cache,
 * eliminating loading states and reducing Time to First Content.
 */

import { QueryClient, dehydrate, type DehydratedState } from "@tanstack/react-query";

/**
 * Create a server-side QueryClient with appropriate defaults
 * 
 * Server clients should:
 * - Not retry failed requests (let client handle retries)
 * - Have shorter cache times (data will be hydrated to client)
 */
export function createServerQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        retry: false,
      },
    },
  });
}

/**
 * Dehydrate a query client for hydration on the client
 */
export function dehydrateQueryClient(queryClient: QueryClient): DehydratedState {
  return dehydrate(queryClient);
}

export { dehydrate };
