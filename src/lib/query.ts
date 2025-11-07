"use client"

import {
  DehydratedState,
  Hydrate,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"
import { ReactNode, useState } from "react"

const DEFAULT_QUERY_OPTIONS = {
  staleTime: 5 * 60 * 1000,
  refetchOnWindowFocus: false,
  retry: 1,
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: DEFAULT_QUERY_OPTIONS,
      mutations: {
        retry: 1,
      },
    },
  })
}

export interface QueryProviderProps {
  children: ReactNode
  state?: DehydratedState
}

export function QueryProvider({ children, state }: QueryProviderProps) {
  const [queryClient] = useState(() => makeQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <Hydrate state={state}>{children}</Hydrate>
    </QueryClientProvider>
  )
}

export type { DehydratedState }
