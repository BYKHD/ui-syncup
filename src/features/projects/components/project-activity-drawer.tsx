"use client";

import { RiHistoryLine, RiLoader4Line } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProjectActivitiesInfinite } from "../hooks/use-project-activities-infinite";
import {
  ProjectActivityEmpty,
  ProjectActivityError,
  ProjectActivityItems,
  ProjectActivitySkeleton,
} from "./project-detail-activity-feed";

interface ProjectActivityDrawerProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * ProjectActivityDrawer
 *
 * Right-side sheet showing the project's Recent Activity, opened from the
 * project header's "More actions" menu. Loads 25 events per page with a
 * "Load more" button; the list scrolls within the sheet. Controlled by the
 * parent (the trigger lives in the dropdown menu).
 *
 * The data-fetching body lives in a child that only mounts while the sheet is
 * open — Radix unmounts `SheetContent`'s subtree when closed — so the activity
 * query never runs until the drawer is first opened.
 */
export function ProjectActivityDrawer({
  projectId,
  open,
  onOpenChange,
}: ProjectActivityDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2">
            <RiHistoryLine className="h-4 w-4" />
            Recent Activity
          </SheetTitle>
          <SheetDescription>
            Member, invitation, and project lifecycle events
          </SheetDescription>
        </SheetHeader>
        <ActivityDrawerBody projectId={projectId} />
      </SheetContent>
    </Sheet>
  );
}

/**
 * ActivityDrawerBody — the scrollable, paginated content. Split out so the
 * `useProjectActivitiesInfinite` query only runs while the sheet is mounted/open.
 */
function ActivityDrawerBody({ projectId }: { projectId: string }) {
  const {
    activities,
    isPending,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useProjectActivitiesInfinite({ projectId, pageSize: 25 });

  return (
    <ScrollArea className="flex-1">
      <div className="p-4">
        {isPending ? (
          <ProjectActivitySkeleton />
        ) : isError ? (
          <ProjectActivityError />
        ) : activities.length === 0 ? (
          <ProjectActivityEmpty />
        ) : (
          <>
            <ProjectActivityItems activities={activities} />
            {hasNextPage && (
              <div className="pt-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? (
                    <>
                      <RiLoader4Line className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load more"
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </ScrollArea>
  );
}
