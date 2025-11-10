"use client";

import React, { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useIsMobile } from "@/src/hooks/use-mobile";
import { Tabs, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { Button } from "@/src/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/src/components/ui/dialog";
import { ArrowLeft, Image, FileText, PanelRightClose, PanelRightOpen, Keyboard } from "lucide-react";
import { formatShortcut, type KeyboardShortcut } from "@/src/hooks/use-keyboard-shortcuts";
import { usePerformanceMonitoring, useMemoryOptimization } from "@/src/lib/performance";
import { motionPresets, performanceProps } from "@/src/lib/motion-utils";
import { LoadingIndicator } from "@/src/components/ui/loading-indicator";
import { cn } from "@/src/lib/utils";
import type { IssueDetailData, IssuePermissions, ActivityEntry, IssueAttachment } from "@/src/types/issue";

// Hook for window dimensions
function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  return windowSize;
}

// Lazy load heavy components for better performance
const IssueAttachmentView = lazy(() => import("./issue-attachments-view"));
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
  shortcuts = []
}: ResponsiveIssueLayoutProps) {
  const isMobile = useIsMobile();
  const { width: windowWidth } = useWindowSize();
  const [activeTab, setActiveTab] = useState("attachments");
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  
  // Performance monitoring
  const endMeasurement = usePerformanceMonitoring('issueDetailLoad');
  const { addCleanup } = useMemoryOptimization();

  // Reset to attachments tab when switching to mobile
  useEffect(() => {
    if (isMobile && activeTab !== "attachments" && activeTab !== "details") {
      setActiveTab("attachments");
    }
  }, [isMobile]); // Remove activeTab from dependencies to avoid cascading renders
  
  // Performance monitoring cleanup
  useEffect(() => {
    addCleanup(() => {
      endMeasurement();
    });
  }, [addCleanup, endMeasurement]);

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

  const handleBackToIssues = () => {
    window.location.href = '/issues';
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
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-none border-t h-12" role="tablist">
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
                <Suspense fallback={
                  <div className="flex-1 flex items-center justify-center">
                    <LoadingIndicator variant="spinner" text="Loading attachments..." delay={0} />
                  </div>
                }>
                  <IssueAttachmentView 
                    issueId={issueId} 
                    attachments={attachments}
                    isLoading={isLoading}
                    error={attachmentError}
                    onRetry={onRetryAttachments}
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
                <Suspense fallback={
                  <div className="flex-1 flex items-center justify-center">
                    <LoadingIndicator variant="spinner" text="Loading details..." delay={0} />
                  </div>
                }>
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
                Use these keyboard shortcuts to navigate and edit the issue efficiently.
              </div>
              <div className="space-y-2">
                {shortcuts
                  .filter(shortcut => !shortcut.disabled)
                  .map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between py-1">
                      <span className="text-sm">{shortcut.description}</span>
                      <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded border">
                        {formatShortcut(shortcut)}
                      </kbd>
                    </div>
                  ))}
              </div>
              <div className="text-xs text-muted-foreground pt-2 border-t">
                Press <kbd className="px-1 py-0.5 text-xs font-mono bg-muted rounded">?</kbd> to toggle this help, 
                or <kbd className="px-1 py-0.5 text-xs font-mono bg-muted rounded">Esc</kbd> to close.
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Desktop/tablet split layout
  return (
    <motion.div 
      className="flex h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={motionPresets.instant}
    >
      {/* Attachment canvas - flexible width */}
      <div className="flex-1 min-w-0 relative">
        <Suspense fallback={
          <div className="h-full flex items-center justify-center bg-muted/30">
            <LoadingIndicator variant="spinner" text="Loading attachments..." delay={0} />
          </div>
        }>
          <IssueAttachmentView 
            issueId={issueId} 
            attachments={attachments}
            isLoading={isLoading}
            error={attachmentError}
            onRetry={onRetryAttachments}
          />
        </Suspense>

        {/* Panel toggle button for tablet */}
        <div className="md:block lg:hidden">
          <motion.div
            className="absolute top-4 right-4 z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={motionPresets.quick}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
                className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border shadow-sm"
                aria-label={isPanelCollapsed ? "Show details panel" : "Hide details panel"}
              >
                <motion.div
                  animate={{ rotate: isPanelCollapsed ? 180 : 0 }}
                  transition={motionPresets.quick}
                >
                  {isPanelCollapsed ? (
                    <>
                      <PanelRightOpen className="h-4 w-4 mr-2" />
                      Show Details
                    </>
                  ) : (
                    <>
                      <PanelRightClose className="h-4 w-4 mr-2" />
                      Hide Details
                    </>
                  )}
                </motion.div>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>
      
      {/* Details panel - fixed width with collapsible option */}
      <div 
        className={cn(
          "flex-shrink-0 transition-all duration-75 ease-out",
          isPanelCollapsed 
            ? windowWidth >= 1024 ? "w-[480px]" : "w-0"
            : windowWidth >= 768 ? "w-[360px]" : "w-[480px]"
        )}
      >
        <AnimatePresence>
          {(!isPanelCollapsed || windowWidth >= 1024) && (
            <motion.div 
              className="h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={motionPresets.instant}
            >
              <Suspense fallback={
                <div className="h-full flex items-center justify-center border-l">
                  <LoadingIndicator variant="spinner" text="Loading details..." delay={0} />
                </div>
              }>
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
                />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
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
              Use these keyboard shortcuts to navigate and edit the issue efficiently.
            </div>
            <div className="space-y-2">
              {shortcuts
                .filter(shortcut => !shortcut.disabled)
                .map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between py-1">
                    <span className="text-sm">{shortcut.description}</span>
                    <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded border">
                      {formatShortcut(shortcut)}
                    </kbd>
                  </div>
                ))}
            </div>
            <div className="text-xs text-muted-foreground pt-2 border-t">
              Press <kbd className="px-1 py-0.5 text-xs font-mono bg-muted rounded">?</kbd> to toggle this help, 
              or <kbd className="px-1 py-0.5 text-xs font-mono bg-muted rounded">Esc</kbd> to close.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}