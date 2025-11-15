"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Image, FileText } from "lucide-react";

const DETAIL_ROWS = Array.from({ length: 3 });

export function ResponsiveIssueLayoutSkeleton() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="flex h-full flex-col">
        {/* Mobile header matching actual layout */}
        <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between px-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              disabled
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Issues
            </Button>
            <Skeleton className="h-4 w-16" />
          </div>

          <Tabs defaultValue="attachments" className="w-full">
            <TabsList
              className="grid w-full grid-cols-2 rounded-none border-t h-12"
              role="tablist"
            >
              <TabsTrigger
                value="attachments"
                className="flex items-center gap-2 data-[state=active]:bg-background h-full text-sm"
                disabled
              >
                <Image className="h-4 w-4" />
                Attachments
              </TabsTrigger>
              <TabsTrigger
                value="details"
                className="flex items-center gap-2 data-[state=active]:bg-background h-full text-sm"
                disabled
              >
                <FileText className="h-4 w-4" />
                Details
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Tab content area matching actual layout structure */}
        <div className="flex-1 overflow-y-auto">
          {/* Attachments tab content */}
          <div className="h-full flex flex-col items-center justify-center gap-4 p-6 bg-muted/10">
            <Skeleton className="h-[280px] w-full rounded-lg" />
            <div className="flex gap-3">
              <Skeleton className="h-8 w-24 rounded-full" />
              <Skeleton className="h-8 w-24 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Match the responsive panel width from actual layout
  const windowWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
  const panelWidth = windowWidth >= 1200 ? 380 : 320;

  return (
    <div className="flex h-full relative">
      {/* Attachment canvas - flexible width matching actual layout */}
      <div
        className="flex-1 min-w-0 relative bg-muted/10"
        style={{
          marginRight: panelWidth,
        }}
      >
        <div className="h-full flex flex-col items-center justify-center gap-4 p-6">
          <Skeleton className="h-[400px] w-full max-w-3xl rounded-lg" />
          <div className="flex gap-3">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
        </div>
      </div>

      {/* Details panel - fixed width with absolute positioning matching actual layout */}
      <div
        className="absolute top-0 right-0 h-full flex-shrink-0 z-20 border-l border-border bg-card"
        style={{ width: panelWidth }}
      >
        <div className="flex flex-col gap-4 p-6 h-full">
          {/* Panel header with collapse button area */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>

          {/* Issue details form */}
          <div className="space-y-4">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>

          {/* Metadata badges */}
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>

          {/* Details section */}
          <div className="space-y-3 border-t border-border pt-4">
            <Skeleton className="h-5 w-24" />
            <div className="space-y-2">
              {DETAIL_ROWS.map((_, index) => (
                <Skeleton key={`panel-${index}`} className="h-4 w-full" />
              ))}
            </div>
          </div>

          {/* Activity section */}
          <div className="flex-1 space-y-3 border-t border-border pt-4 overflow-hidden">
            <Skeleton className="h-5 w-20" />
            {DETAIL_ROWS.map((_, index) => (
              <Skeleton key={`activity-${index}`} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
