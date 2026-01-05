"use client";

import { useCallback, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import IssueStatusBadge from "./issues-status-badge";
import PriorityBadge from "./issues-priority-badge";
import { preloadIssueDetailComponents } from "./preload";
import { STATUS_COLORS, DEFAULT_STATUS_COLOR } from "@/features/issues/config";
import type { IssueStatus } from "@/features/issues/types";
import type { IssueSummary } from "@/features/issues/types";
import { RelativeTime } from "@/components/shared/relative-time";
import { cn } from "@/lib/utils";

interface IssuesListProps {
  issues: IssueSummary[]
  onIssueClick?: (issueKey: string) => void
}

/**
 * Safely get status color config
 */
function getStatusColor(status: string) {
  const normalized = status?.trim().toLowerCase().replace(/\s+/g, '_') as IssueStatus;
  return STATUS_COLORS[normalized] ?? DEFAULT_STATUS_COLOR;
}

/**
 * Format date to normal date format (e.g., "Jan 5, 2026")
 */
function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * IssuesList - Pure presentational component for rendering issues table
 * 
 * NOTE: Loading state is intentionally NOT handled here.
 * The parent component (ProjectIssues) manages loading via React Query
 * to prevent duplicate skeleton layers with route-level loading.tsx
 * 
 * Features:
 * - Colored left border per status for visual scanning
 * - Preloads issue detail components on hover for faster navigation.
 */
export default function IssuesList({
  issues,
  onIssueClick,
}: IssuesListProps) {
  // Track if we've already preloaded to avoid redundant calls
  const hasPreloaded = useRef(false);

  const handleIssueClick = (issueKey: string) => {
    if (onIssueClick) {
      onIssueClick(issueKey);
    }
  };

  // Preload issue detail components on first hover
  const handleRowHover = useCallback(() => {
    if (!hasPreloaded.current) {
      hasPreloaded.current = true;
      preloadIssueDetailComponents();
    }
  }, []);

  return (
    <div className="flex flex-col overflow-hidden rounded-md border">
      <Table className="flex-1">
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow className="uppercase text-xs">
            <TableHead className="w-1"></TableHead>
            <TableHead className="text-muted-foreground">Key</TableHead>
            <TableHead className="w-full min-w-[200px] truncate text-muted-foreground">
              Title
            </TableHead>
            <TableHead className="text-muted-foreground">Status</TableHead>
            <TableHead className="text-right text-muted-foreground">Created</TableHead>
            <TableHead className="text-right text-muted-foreground">Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {issues.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                No issues recorded yet. Create one to get started.
              </TableCell>
            </TableRow>
          ) : (
            issues.map((issue) => {
              const statusColors = getStatusColor(issue.status);
              return (
                <TableRow
                  key={issue.id}
                  className={cn(
                    "cursor-pointer border-l-2 transition-colors duration-150",
                    statusColors.rowBorder,
                    statusColors.rowHoverBg
                  )}
                  onClick={() => handleIssueClick(issue.issueKey)}
                  onMouseEnter={handleRowHover}
                  onFocus={handleRowHover}
                >
                  <TableCell>
                    <PriorityBadge priority={issue.priority} />
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-muted-foreground">
                      {issue.issueKey}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {issue.type}
                      </Badge>
                      <div className="font-medium truncate">{issue.title}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <IssueStatusBadge status={issue.status} />
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {formatDate(issue.createdAt)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    <RelativeTime date={issue.updatedAt} />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

