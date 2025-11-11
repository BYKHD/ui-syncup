"use client";

import { useState } from "react";
import {
  RiMore2Line,
  RiDeleteBinLine,
  RiKeyboardBoxLine,
} from "@remixicon/react";

// UI Components
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

// Issue Components
import { IssueDeleteDialog } from "./issue-deletion-dialog";
import { StatusSelector } from "./status-selector";

// Types
import type {
  IssueDetailData,
  IssuePermissions,
  IssueStatus,
} from "@/features/issues/types";

interface PanelHeaderProps {
  issueKey: string;
  issue: IssueDetailData | null;
  onDelete: () => Promise<void>;
  isLoading?: boolean;
  onToggleShortcutsHelp?: () => void;
  permissions?: IssuePermissions;
  onStatusChange?: (status: IssueStatus) => Promise<void>;
}

export function PanelHeader({
  issueKey,
  issue,
  onDelete,
  isLoading = false,
  onToggleShortcutsHelp,
  permissions,
  onStatusChange,
}: PanelHeaderProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  if (isLoading) {
    return (
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-background px-6 py-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-36 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </header>
    );
  }

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const canChangeStatus = permissions?.canChangeStatus ?? true;

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-background px-6 py-4">
        <div className="flex items-center justify-between w-full">
        <div className="flex flex-col items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="sr-only text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Issue
            </p>
            <h2 className="mt-1 truncate text-base font-semibold text-foreground">
              {issueKey}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
            {issue && onStatusChange ? (
              <StatusSelector
                value={issue.status}
                canChange={canChangeStatus}
                disabled={isLoading}
                onChange={onStatusChange}
                className="flex-none"
              />
            ) : (
              <Skeleton className="h-10 w-40 rounded-md" />
            )}
          </div>
          </div>

          {/* TODO: wire permission guards when implemented */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Issue actions"
              >
                <RiMore2Line className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {onToggleShortcutsHelp && (
                <>
                  <DropdownMenuItem onClick={onToggleShortcutsHelp}>
                    <RiKeyboardBoxLine className="mr-2 h-4 w-4" />
                    Keyboard Shortcuts
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                onClick={handleDeleteClick}
                className="text-destructive focus:text-destructive"
              >
                <RiDeleteBinLine className="text-destructive mr-2 h-4 w-4" />
                Delete Issue
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <IssueDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        issueKey={issueKey}
        onConfirm={onDelete}
      />
    </>
  );
}
