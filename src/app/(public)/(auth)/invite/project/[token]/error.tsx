'use client';

import { useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function InvitationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to error reporting service
    console.error('Invitation page error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
          </div>
          <CardTitle>Something Went Wrong</CardTitle>
          <CardDescription>
            We encountered an unexpected error while loading your invitation. Please try again.
          </CardDescription>
          {error.digest && (
            <p className="mt-2 text-xs text-muted-foreground">
              Error ID: {error.digest}
            </p>
          )}
        </CardHeader>
        <CardFooter className="flex justify-center gap-3">
          <Button variant="outline" onClick={() => window.location.href = '/projects'}>
            Go to Projects
          </Button>
          <Button onClick={reset}>
            Try Again
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
