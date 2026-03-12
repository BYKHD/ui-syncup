/**
 * USE TEAM MEMBER SUGGESTIONS HOOK
 * React hook for searching team members with debounce for autocomplete
 */

"use client"

import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

// ============================================================================
// TYPES
// ============================================================================

export interface TeamMemberSuggestion {
  userId: string
  name: string
  email: string
  image: string | null
}

interface SearchTeamMembersResponse {
  members: TeamMemberSuggestion[]
}

// ============================================================================
// API FUNCTION
// ============================================================================

async function searchTeamMembers(
  teamId: string,
  query: string,
  excludeProjectId?: string
): Promise<SearchTeamMembersResponse> {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (excludeProjectId) params.set('excludeProjectId', excludeProjectId)
  params.set('limit', '10')

  const response = await fetch(`/api/teams/${teamId}/members/search?${params}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error?.message || `Failed to search team members (${response.status})`)
  }

  return response.json()
}

// ============================================================================
// DEBOUNCE HOOK
// ============================================================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export interface UseTeamMemberSuggestionsParams {
  teamId: string
  query: string
  excludeProjectId?: string
  enabled?: boolean
  debounceMs?: number
}

export interface UseTeamMemberSuggestionsResult {
  suggestions: TeamMemberSuggestion[]
  isLoading: boolean
  isError: boolean
  error: Error | null
}

/**
 * Hook for searching team members with debounced query
 * 
 * @param teamId - The team ID to search members in
 * @param query - The search query (name or email)
 * @param excludeProjectId - Optional project ID to exclude existing members
 * @param enabled - Whether the query should be enabled
 * @param debounceMs - Debounce delay in milliseconds (default: 300)
 */
export function useTeamMemberSuggestions({
  teamId,
  query,
  excludeProjectId,
  enabled = true,
  debounceMs = 300,
}: UseTeamMemberSuggestionsParams): UseTeamMemberSuggestionsResult {
  const debouncedQuery = useDebounce(query, debounceMs)
  
  // Only search if we have a query of at least 1 character
  const shouldSearch = enabled && !!teamId && debouncedQuery.length >= 1
  
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['teamMemberSearch', teamId, debouncedQuery, excludeProjectId],
    queryFn: () => searchTeamMembers(teamId, debouncedQuery, excludeProjectId),
    enabled: shouldSearch,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })

  const suggestions = useMemo(() => {
    return data?.members || []
  }, [data])

  return {
    suggestions,
    isLoading: shouldSearch && isLoading,
    isError,
    error,
  }
}
