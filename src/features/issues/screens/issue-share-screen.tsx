'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import IssueDetailsScreen from './issue-details-screen';
import type { IssuePermissions } from '@/features/issues/types';
import { CalendarClock } from 'lucide-react';

interface IssueShareScreenProps {
  issueId: string;
  issueKey: string;
  expiresAt?: string;
}

const READ_ONLY_PERMISSIONS: IssuePermissions = {
  canEdit: false,
  canDelete: false,
  canComment: false,
  canAssign: false,
  canChangeStatus: false,
};

/**
 * Public, read-only wrapper for sharing an issue preview without authentication.
 * Uses the same IssueDetailsScreen and responsive layout, but locks down actions.
 */
export default function IssueShareScreen({ issueId, issueKey, expiresAt }: IssueShareScreenProps) {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 lg:py-10">
        <Alert className="flex flex-col gap-3 border-dashed sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="uppercase tracking-wide">
              Public preview
            </Badge>
            <AlertTitle className="text-sm font-semibold text-foreground">
              {issueKey}
            </AlertTitle>
          </div>
          {expiresAt && (
            <AlertDescription className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
              Link expires {new Date(expiresAt).toLocaleString()}
            </AlertDescription>
          )}
        </Alert>

        <IssueDetailsScreen
          issueId={issueId}
          userId="public_viewer"
          permissions={READ_ONLY_PERMISSIONS}
        />
      </div>
    </div>
  );
}
