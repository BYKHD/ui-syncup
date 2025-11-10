// ============================================================================
// ISSUE NOT FOUND PAGE
// Displayed when an issue key doesn't exist
// ============================================================================

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';

export default function IssueNotFound() {
  return (
    <div className="flex h-screen items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Issue Not Found</AlertTitle>
          <AlertDescription className="mt-2">
            The issue you're looking for doesn't exist or you don't have permission to view it.
          </AlertDescription>
        </Alert>

        <div className="text-center space-y-4">
          <div className="text-sm text-muted-foreground">
            The issue key might be incorrect, or the issue may have been deleted.
          </div>

          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button asChild variant="default">
              <Link href="/issues" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Issues
              </Link>
            </Button>

            <Button asChild variant="outline">
              <Link href="/issues" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search Issues
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
