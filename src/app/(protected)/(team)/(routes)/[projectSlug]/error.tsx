"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RiAlertLine,
  RiRefreshLine,
  RiArrowLeftLine,
} from "@remixicon/react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ProjectDetailError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Project detail error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 lg:px-8">
      <Card className="border-destructive/50">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <RiAlertLine className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">
              We encountered an error while loading this project.
            </p>
            {error.message && (
              <div className="mx-auto max-w-md">
                <div className="rounded-md bg-muted p-3 text-left">
                  <p className="text-sm font-mono text-muted-foreground break-words">
                    {error.message}
                  </p>
                </div>
              </div>
            )}
            {error.digest && (
              <p className="text-xs text-muted-foreground">
                Error ID: {error.digest}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={reset}
              variant="default"
              className="gap-2"
            >
              <RiRefreshLine className="h-4 w-4" />
              Try Again
            </Button>
            <Button
              onClick={() => window.location.href = "/projects"}
              variant="outline"
              className="gap-2"
            >
              <RiArrowLeftLine className="h-4 w-4" />
              Back to Projects
            </Button>
          </div>

          <div className="pt-4 border-t">
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                What can I do?
              </summary>
              <ul className="mt-3 space-y-2 text-muted-foreground list-disc list-inside">
                <li>Check your internet connection</li>
                <li>Verify you have access to this project</li>
                <li>Try refreshing the page</li>
                <li>Contact support if the problem persists</li>
              </ul>
            </details>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
