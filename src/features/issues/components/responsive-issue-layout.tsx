"use client";

import React, {
  useState,
  useEffect,
  lazy,
  Suspense,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Image, FileText, Keyboard } from "lucide-react";
import {
  formatShortcut,
  type KeyboardShortcut,
} from "@/features/issues/hooks/use-keyboard-shortcuts";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type {
  IssueDetailData,
  IssuePermissions,
  ActivityEntry,
  IssueAttachment,
  AttachmentAnnotation,
} from "@/features/issues/types";

// Motion configuration constants
const motionPresets = {
  slow: { duration: 2 },
  gentle: { duration: 1 },
  normal: { duration: 0.5 },
  quick: { duration: 0.25 },
  instant: { duration: 0 },
};

const performanceProps = {
  layoutId: undefined as string | undefined,
};

type AnnotationThread = AttachmentAnnotation & {
  attachmentName?: string;
  attachmentVariant?: IssueAttachment["reviewVariant"];
  attachmentPreview?: string | null;
};

const mapAttachmentsToAnnotations = (
  sources: IssueAttachment[]
): AnnotationThread[] => {
  return sources.flatMap((attachment) =>
    (attachment.annotations ?? []).map((annotation) => ({
      ...annotation,
      attachmentName: attachment.fileName,
      attachmentVariant: attachment.reviewVariant,
      attachmentPreview: attachment.thumbnailUrl ?? attachment.url,
    }))
  );
};

// Lazy load heavy components for better performance
const IssueAttachmentView = lazy(() => import("./optimized-attachment-view"));
const IssueDetailsPanel = lazy(() => import("./issue-details-panel"));

interface ResponsiveIssueLayoutProps {
  issueId: string;
  issueData: IssueDetailData;
  attachments: IssueAttachment[];
  permissions: IssuePermissions;
  activities: ActivityEntry[];
  activitiesLoading: boolean;
  hasMoreActivities: boolean;
  onLoadMoreActivities: () => void;
  onUpdate: (field: string, value: any) => Promise<void>;
  onDelete: () => Promise<void>;
  isLoading: boolean;
  // Error handling props
  attachmentError?: Error | null;
  activityError?: Error | null;
  onRetryActivity?: () => void;
  onRetryAttachments?: () => void;
  // Keyboard shortcuts and accessibility props
  isEditingTitle?: boolean;
  isEditingDescription?: boolean;
  onEditingTitleChange?: (editing: boolean) => void;
  onEditingDescriptionChange?: (editing: boolean) => void;
  showShortcutsHelp?: boolean;
  onToggleShortcutsHelp?: () => void;
  shortcuts?: KeyboardShortcut[];
}

export default function ResponsiveIssueLayout({
  issueId,
  issueData,
  attachments,
  permissions,
  activities,
  activitiesLoading,
  hasMoreActivities,
  onLoadMoreActivities,
  onUpdate,
  onDelete,
  isLoading,
  attachmentError,
  activityError,
  onRetryActivity,
  onRetryAttachments,
  isEditingTitle,
  isEditingDescription,
  onEditingTitleChange,
  onEditingDescriptionChange,
  showShortcutsHelp,
  onToggleShortcutsHelp,
  shortcuts = [],
}: ResponsiveIssueLayoutProps) {
  const annotationSeed = useMemo(
    () => mapAttachmentsToAnnotations(attachments),
    [attachments]
  );
  const isMobile = useIsMobile();
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );
  const [activeTab, setActiveTab] = useState("attachments");
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  // Initialize panel state based on viewport width
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    const width = window.innerWidth;
    // Auto-collapse on initial load if viewport is 768-991px
    return width < 992;
  });
  const [annotationThreads, setAnnotationThreads] =
    useState<AnnotationThread[]>(annotationSeed);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(
    annotationSeed[0]?.id ?? null
  );

  // Track previous width to detect threshold crossings
  const prevWidthRef = useRef<number>(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );

  // Track window width for responsive behavior
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    if (typeof window !== "undefined") {
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  // Auto-collapse/expand panel based on viewport width threshold crossings
  useEffect(() => {
    if (isMobile) return;

    const prevWidth = prevWidthRef.current;
    const currentWidth = windowWidth;

    // Early return if width hasn't changed
    if (prevWidth === currentWidth) return;

    const wasAboveThreshold = prevWidth >= 992;
    const isAboveThreshold = currentWidth >= 992;

    // Only act when threshold is crossed
    if (wasAboveThreshold !== isAboveThreshold) {
      setIsPanelCollapsed(!isAboveThreshold);
      prevWidthRef.current = currentWidth;
    } else {
      // Still update ref for accurate tracking
      prevWidthRef.current = currentWidth;
    }
  }, [windowWidth, isMobile]);

  // Reset to attachments tab when switching to mobile
  useEffect(() => {
    if (isMobile && activeTab !== "attachments" && activeTab !== "details") {
      setActiveTab("attachments");
    }
  }, [isMobile]); // Remove activeTab from dependencies to avoid cascading renders

  useEffect(() => {
    setAnnotationThreads(annotationSeed);
    setActiveAnnotationId((prev) => {
      if (prev && annotationSeed.some((annotation) => annotation.id === prev)) {
        return prev;
      }
      return annotationSeed[0]?.id ?? null;
    });
  }, [annotationSeed]);

  // Handle swipe gestures for mobile tab switching
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isMobile || touchStartX === null || touchStartY === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Only handle horizontal swipes (ignore vertical scrolling)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0 && activeTab === "details") {
        // Swipe right: details -> attachments
        setActiveTab("attachments");
      } else if (deltaX < 0 && activeTab === "attachments") {
        // Swipe left: attachments -> details
        setActiveTab("details");
      }
    }

    setTouchStartX(null);
    setTouchStartY(null);
  };

  const handleAnnotationSelect = useCallback((annotationId: string) => {
    setActiveAnnotationId(annotationId);
  }, []);

  const handleAnnotationMove = useCallback(
    (annotationId: string, coords: { x: number; y: number }) => {
      setAnnotationThreads((prev) =>
        prev.map((annotation) =>
          annotation.id === annotationId
            ? { ...annotation, x: coords.x, y: coords.y }
            : annotation
        )
      );
    },
    []
  );

  const handleBackToIssues = () => {
    window.location.href = "/issues";
  };

  // Mobile layout with tabs
  if (isMobile) {
    return (
      <div
        className="flex h-full flex-col"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Mobile header with back button and tabs */}
        <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between px-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToIssues}
              className="flex items-center gap-2"
              aria-label="Go back to issues list"
            >
              <ArrowLeft className="h-4 w-4" />
              Issues
            </Button>
            <div className="text-sm font-medium text-muted-foreground">
              {issueData.issueKey}
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList
              className="grid w-full grid-cols-2 rounded-none border-t h-12"
              role="tablist"
            >
              <TabsTrigger
                value="attachments"
                className="flex items-center gap-2 data-[state=active]:bg-background h-full text-sm"
                id="attachments-tab"
                role="tab"
                aria-controls="attachments-panel"
                aria-selected={activeTab === "attachments"}
              >
                <Image className="h-4 w-4" />
                Attachments
                {attachments.length > 0 && (
                  <span
                    className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs"
                    aria-label={`${attachments.length} attachments`}
                  >
                    {attachments.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="details"
                className="flex items-center gap-2 data-[state=active]:bg-background h-full text-sm"
                id="details-tab"
                role="tab"
                aria-controls="details-panel"
                aria-selected={activeTab === "details"}
              >
                <FileText className="h-4 w-4" />
                Details
                {activities.length > 0 && (
                  <span
                    className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs"
                    aria-label={`${activities.length} activity entries`}
                  >
                    {activities.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Tab content with optimized animations */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <AnimatePresence mode="wait">
            {activeTab === "attachments" && (
              <motion.div
                key="attachments"
                className="h-full flex flex-col"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={motionPresets.quick}
                {...performanceProps}
              >
                <Suspense
                  fallback={
                    <div className="flex-1 flex flex-col items-center justify-center gap-3">
                      <Spinner className="size-6" />
                      <p className="text-sm text-muted-foreground">
                        Loading attachments...
                      </p>
                    </div>
                  }
                >
                  <IssueAttachmentView
                    issueId={issueId}
                    attachments={attachments}
                    isLoading={isLoading}
                    error={attachmentError}
                    onRetry={onRetryAttachments}
                    annotationThreads={annotationThreads}
                    activeAnnotationId={activeAnnotationId}
                    onAnnotationSelect={handleAnnotationSelect}
                    onAnnotationMove={handleAnnotationMove}
                  />
                </Suspense>
              </motion.div>
            )}

            {activeTab === "details" && (
              <motion.div
                key="details"
                className="h-full flex flex-col"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={motionPresets.quick}
                {...performanceProps}
              >
                <Suspense
                  fallback={
                    <div className="flex-1 flex flex-col items-center justify-center gap-3">
                      <Spinner className="size-6" />
                      <p className="text-sm text-muted-foreground">
                        Loading details...
                      </p>
                    </div>
                  }
                >
                  <IssueDetailsPanel
                    issueData={issueData}
                    permissions={permissions}
                    activities={activities}
                    activitiesLoading={activitiesLoading}
                    hasMoreActivities={hasMoreActivities}
                    onLoadMoreActivities={onLoadMoreActivities}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    isLoading={isLoading}
                    activityError={activityError}
                    onRetryActivity={onRetryActivity}
                    isEditingTitle={isEditingTitle}
                    isEditingDescription={isEditingDescription}
                    onEditingTitleChange={onEditingTitleChange}
                    onEditingDescriptionChange={onEditingDescriptionChange}
                    onToggleShortcutsHelp={onToggleShortcutsHelp}
                    annotations={annotationThreads}
                    activeAnnotationId={activeAnnotationId}
                    onAnnotationSelect={handleAnnotationSelect}
                  />
                </Suspense>
              </motion.div>
            )}
          </AnimatePresence>
        </Tabs>

        {/* Keyboard shortcuts help */}
        <Dialog open={showShortcutsHelp} onOpenChange={onToggleShortcutsHelp}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Keyboard className="h-5 w-5" />
                Keyboard Shortcuts
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Use these keyboard shortcuts to navigate and edit the issue
                efficiently.
              </div>
              <div className="space-y-2">
                {shortcuts
                  .filter((shortcut) => !shortcut.disabled)
                  .map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-1"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded border">
                        {formatShortcut(shortcut)}
                      </kbd>
                    </div>
                  ))}
              </div>
              <div className="text-xs text-muted-foreground pt-2 border-t">
                Press{" "}
                <kbd className="px-1 py-0.5 text-xs font-mono bg-muted rounded">
                  ?
                </kbd>{" "}
                to toggle this help, or{" "}
                <kbd className="px-1 py-0.5 text-xs font-mono bg-muted rounded">
                  Esc
                </kbd>{" "}
                to close.
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Desktop/tablet split layout
  const panelWidth = windowWidth >= 1200 ? 380 : 320;
  const panelOverlap = 16;

  return (
    <motion.div
      className="flex h-full relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={motionPresets.instant}
    >
      {/* Attachment canvas - flexible width */}
      <motion.div
        className="flex-1 min-w-0 relative transition-all duration-500 ease-out"
        style={{
          marginRight: panelWidth,
        }}
        animate={{
          marginRight: isPanelCollapsed ? 0+panelOverlap : window.innerWidth>992 ? panelWidth : 0+panelOverlap,
        }}
      >
        <Suspense
          fallback={
            <div className="h-full flex flex-col items-center justify-center gap-3 bg-muted/30">
              <Spinner className="size-6" />
              <p className="text-sm text-muted-foreground">
                Loading attachments...
              </p>
            </div>
          }
        >
          <IssueAttachmentView
            issueId={issueId}
            attachments={attachments}
            isLoading={isLoading}
            error={attachmentError}
            onRetry={onRetryAttachments}
            annotationThreads={annotationThreads}
            activeAnnotationId={activeAnnotationId}
            onAnnotationSelect={handleAnnotationSelect}
            onAnnotationMove={handleAnnotationMove}
          />
        </Suspense>
        
      </motion.div>

      {/* Details panel - fixed width with position-based collapse */}
      <motion.div
        className={cn(
          "absolute top-0 right-0 h-full flex-shrink-0 z-20 ease-out",
          isPanelCollapsed ? "duration-800 " : "duration-500"
        )}
        style={{ width: panelWidth }}
        initial={false}
        animate={{
          x: isPanelCollapsed ? panelWidth-panelOverlap : 0,
        }}
      >
        <Suspense
          fallback={
            <div className="h-full flex flex-col items-center justify-center gap-3 border-l bg-card">
              <Spinner className="size-6" />
              <p className="text-sm text-muted-foreground">
                Loading details...
              </p>
            </div>
          }
        >
          <IssueDetailsPanel
            issueData={issueData}
            permissions={permissions}
            activities={activities}
            activitiesLoading={activitiesLoading}
            hasMoreActivities={hasMoreActivities}
            onLoadMoreActivities={onLoadMoreActivities}
            onUpdate={onUpdate}
            onDelete={onDelete}
            isLoading={isLoading}
            activityError={activityError}
            onRetryActivity={onRetryActivity}
            isEditingTitle={isEditingTitle}
            isEditingDescription={isEditingDescription}
            onEditingTitleChange={onEditingTitleChange}
            onEditingDescriptionChange={onEditingDescriptionChange}
            onToggleShortcutsHelp={onToggleShortcutsHelp}
            annotations={annotationThreads}
            activeAnnotationId={activeAnnotationId}
            onAnnotationSelect={handleAnnotationSelect}
            isPanelCollapsed={isPanelCollapsed}
            onPanelToggle={() => setIsPanelCollapsed(!isPanelCollapsed)}
          />
        </Suspense>
      </motion.div>

      {/* Keyboard shortcuts help */}
      <Dialog open={showShortcutsHelp} onOpenChange={onToggleShortcutsHelp}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Keyboard Shortcuts
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Use these keyboard shortcuts to navigate and edit the issue
              efficiently.
            </div>
            <div className="space-y-2">
              {shortcuts
                .filter((shortcut) => !shortcut.disabled)
                .map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded border">
                      {formatShortcut(shortcut)}
                    </kbd>
                  </div>
                ))}
            </div>
            <div className="text-xs text-muted-foreground pt-2 border-t">
              Press{" "}
              <kbd className="px-1 py-0.5 text-xs font-mono bg-muted rounded">
                ?
              </kbd>{" "}
              to toggle this help, or{" "}
              <kbd className="px-1 py-0.5 text-xs font-mono bg-muted rounded">
                Esc
              </kbd>{" "}
              to close.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
