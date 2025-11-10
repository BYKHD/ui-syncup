'use client';

import { useState } from 'react';
import { RiMore2Line, RiDeleteBinLine, RiKeyboardBoxLine } from '@remixicon/react';

// UI Components
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

// Issue Components
import { IssueDeleteDialog } from './issue-deletion-dialog';

// Types
import type { IssueDetailData } from '@/types/issue';

interface PanelHeaderProps {
  issueKey: string;
  issue: IssueDetailData | null;
  onDelete: () => Promise<void>;
  isLoading?: boolean;
  onToggleShortcutsHelp?: () => void;
}

export function PanelHeader({
  issueKey,
  issue,
  onDelete,
  isLoading = false,
  onToggleShortcutsHelp
}: PanelHeaderProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  if (isLoading) {
    return (
      <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </header>
    );
  }

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
        <h2 className="text-base font-semibold text-foreground">
          {issueKey}
        </h2>

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
