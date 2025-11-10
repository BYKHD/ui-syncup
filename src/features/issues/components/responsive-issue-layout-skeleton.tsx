"use client";

import { useIsMobile } from "@/src/hooks/use-mobile";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { Button } from "@/src/components/ui/button";
import { ArrowLeft, Image, FileText } from "lucide-react";

export function ResponsiveIssueLayoutSkeleton() {
  const isMobile = useIsMobile();

  // Mobile skeleton
  if (isMobile) {
    return (
      <div className="flex h-full flex-col">
        {/* Mobile header skeleton */}
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
            <TabsList className="grid w-full grid-cols-2 rounded-none border-t">
              <TabsTrigger 
                value="attachments" 
                className="flex items-center gap-2"
                disabled
              >
                <Image className="h-4 w-4" />
                Attachments
              </TabsTrigger>
              <TabsTrigger 
                value="details" 
                className="flex items-center gap-2"
                disabled
              >
                <FileText className="h-4 w-4" />
                Details
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content skeleton */}
        <div className="flex-1 p-6">
          <Skeleton className="h-full w-full rounded-lg" />
        </div>
      </div>
    );
  }

  // Desktop skeleton
  return (
    <div className="flex h-full">
      {/* Attachment canvas skeleton */}
      <div className="flex-1 bg-muted/30 p-6">
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
      
      {/* Details panel skeleton */}
      <div className="md:w-[360px] lg:w-[480px] border-l border-border bg-card p-6">
        <Skeleton className="mb-4 h-8 w-32" />
        <Skeleton className="mb-2 h-6 w-full" />
        <Skeleton className="mb-4 h-20 w-full" />
        <Skeleton className="mb-2 h-4 w-24" />
        <Skeleton className="mb-4 h-6 w-32" />
        <Skeleton className="mb-2 h-4 w-24" />
        <Skeleton className="h-6 w-32" />
      </div>
    </div>
  );
}