"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@components/ui/table";
import { Badge } from "@components/ui/badge";
import IssueStatusBadge from "./issues-status-badge";
import PriorityBadge from "./issues-priority-badge";
import type { Issue } from "@/mocks/issue.fixtures";

interface IssuesListProps {
  issues: Issue[]
  isLoading?: boolean
  onIssueClick?: (issueKey: string) => void
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

export default function IssuesList({
  issues,
  isLoading = false,
  onIssueClick,
}: IssuesListProps) {
  const handleIssueClick = (issueKey: string) => {
    if (onIssueClick) {
      onIssueClick(issueKey);
    }
  };

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
            <TableHead className="text-right text-muted-foreground">Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                Loading issues…
              </TableCell>
            </TableRow>
          ) : issues.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                No issues recorded yet. Create one to get started.
              </TableCell>
            </TableRow>
          ) : (
            issues.map((issue) => (
              <TableRow
                key={issue.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleIssueClick(issue.issueKey)}
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
                  {formatDate(issue.updatedAt)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
