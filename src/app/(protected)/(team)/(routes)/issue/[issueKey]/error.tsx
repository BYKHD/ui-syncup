'use client';

// ============================================================================
// ISSUE ERROR BOUNDARY
// Handles errors that occur while loading the issue page
// ============================================================================

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';

interface IssueErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function IssueError({ error, reset }: IssueErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Issue page error:', error);
  }, [error]);

  return (
    <div className="flex h-screen items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription className="mt-2">
            {error.message || 'An unexpected error occurred while loading the issue.'}
          </AlertDescription>
          {error.digest && (
            <div className="mt-2 text-xs text-muted-foreground">
              Error ID: {error.digest}
            </div>
          )}
        </Alert>

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button onClick={reset} variant="default" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>

          <Button
            onClick={() => (window.location.href = '/issues')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Issues
          </Button>
        </div>
      </div>
    </div>
  );
}
