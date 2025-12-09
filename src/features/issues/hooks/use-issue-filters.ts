'use client'
/**
 * USE ISSUE FILTERS HOOK
 * Ready-to-wire: Simple state management for filters (delegates to utils)
 */

import { useState, useMemo } from 'react';
import type { IssueSummary } from '@/features/issues/types';
import { filterAndSortIssues, DEFAULT_FILTERS, type IssueFilters } from '../utils';

// ============================================================================
// HOOK
// ============================================================================

export interface UseIssueFiltersResult {
  filters: IssueFilters;
  setFilters: React.Dispatch<React.SetStateAction<IssueFilters>>;
  filteredIssues: IssueSummary[];
  totalCount: number;
  filteredCount: number;
}

/**
 * Ready-to-wire hook for managing issue filter state
 * Business logic delegated to pure utility functions
 *
 * @example
 * ```tsx
 * const { filters, setFilters, filteredIssues, filteredCount } = useIssueFilters(issues);
 *
 * // Update a single filter
 * setFilters(prev => ({ ...prev, status: 'open' }));
 * ```
 */
export function useIssueFilters(issues: IssueSummary[]): UseIssueFiltersResult {
  const [filters, setFilters] = useState<IssueFilters>(DEFAULT_FILTERS);

  const filteredIssues = useMemo(
    () => filterAndSortIssues(issues, filters),
    [issues, filters]
  );

  return {
    filters,
    setFilters,
    filteredIssues,
    totalCount: issues.length,
    filteredCount: filteredIssues.length,
  };
}
