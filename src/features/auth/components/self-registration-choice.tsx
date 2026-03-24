'use client';

/**
 * SelfRegistrationChoice Component
 * @description Displays self-registration options based on workspace mode.
 * - Single-workspace mode: Auto-join default workspace (no choice UI)
 * - Multi-workspace mode: Show "Create a new workspace" and "I have an invite code" options
 * 
 * @requirements 8.1, 8.2, 8.3, 12.3, 13.5
 */

import { useEffect } from 'react';
import { Building2, KeyRound, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { isSingleWorkspaceMode, isMultiWorkspaceMode } from '@/config/workspace';

export type SelfRegistrationPath = 'create-workspace' | 'join-with-code';

interface SelfRegistrationChoiceProps {
  /** Called when user selects a path in multi-workspace mode */
  onSelectPath: (path: SelfRegistrationPath) => void;
  /** Called when auto-joining default workspace in single-workspace mode */
  onAutoJoin: () => void;
  /** Whether auto-join or path selection is in progress */
  isLoading?: boolean;
  /** Error message to display */
  error?: string | null;
}

export function SelfRegistrationChoice({
  onSelectPath,
  onAutoJoin,
  isLoading = false,
  error = null,
}: SelfRegistrationChoiceProps) {
  // In single-workspace mode, auto-join default workspace
  useEffect(() => {
    if (isSingleWorkspaceMode()) {
      onAutoJoin();
    }
  }, [onAutoJoin]);

  // In single-workspace mode, show loading while auto-joining
  if (isSingleWorkspaceMode()) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Setting up your team...
        </p>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    );
  }

  // Multi-workspace mode: Show choice UI
  return (
    <div className="w-full max-w-2xl space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Welcome!</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose how you&apos;d like to get started
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Create Workspace Option */}
        <Card
          className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
          onClick={() => !isLoading && onSelectPath('create-workspace')}
        >
          <CardHeader className="pb-3">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Create a new team</CardTitle>
            <CardDescription>
              Set up your own team and invite members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              disabled={isLoading}
              onClick={(e) => {
                e.stopPropagation();
                onSelectPath('create-workspace');
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Create team'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Join with Invite Code Option */}
        <Card
          className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
          onClick={() => !isLoading && onSelectPath('join-with-code')}
        >
          <CardHeader className="pb-3">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
              <KeyRound className="h-6 w-6 text-secondary-foreground" />
            </div>
            <CardTitle className="text-lg">I have an invite code</CardTitle>
            <CardDescription>
              Join an existing team with an invitation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full" 
              disabled={isLoading}
              onClick={(e) => {
                e.stopPropagation();
                onSelectPath('join-with-code');
              }}
            >
              Enter invite code
            </Button>
          </CardContent>
        </Card>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        You can always create more teams or join others later from your settings.
      </p>
    </div>
  );
}
