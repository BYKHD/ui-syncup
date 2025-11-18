"use client";

import type { ReactNode } from "react";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import type { AnnotationSaveStatus } from "@/features/annotations/types";

interface CanvasStateIndicatorProps {
  pointerPanEnabled: boolean;
  statusMessage?: ReactNode;
  saveStatus?: AnnotationSaveStatus;
  saveError?: string;
}

export function CanvasStateIndicator({
  pointerPanEnabled,
  statusMessage,
  saveStatus = "idle",
  saveError,
}: CanvasStateIndicatorProps) {
  // Priority: save status > custom message > default pan/zoom message
  const shouldShowSaveStatus = saveStatus !== "idle";

  const defaultMessage = pointerPanEnabled
    ? "Drag to pan · Scroll to zoom"
    : "Scroll to pan · Hold Space for Hand tool";

  // Determine message and icon based on save status
  const message = shouldShowSaveStatus
    ? getSaveMessage(saveStatus, saveError)
    : statusMessage ?? defaultMessage;

  const icon = shouldShowSaveStatus ? getSaveIcon(saveStatus) : getDefaultIcon();
  const statusColor = shouldShowSaveStatus ? getSaveStatusColor(saveStatus) : "text-muted-foreground";

  return (
    <div className="absolute top-4 left-4 z-10">
      <div className={`bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-md px-3 py-1.5 text-xs border flex items-center gap-2 transition-colors ${statusColor}`}>
        {icon}
        <span>{message}</span>
      </div>
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function getSaveMessage(status: AnnotationSaveStatus, error?: string): string {
  switch (status) {
    case "saving":
      return "Saving annotation...";
    case "success":
      return "Annotation saved";
    case "error":
      return error ?? "Failed to save annotation";
    default:
      return "";
  }
}

function getSaveIcon(status: AnnotationSaveStatus): ReactNode {
  switch (status) {
    case "saving":
      return <Loader2 className="w-3 h-3 animate-spin" />;
    case "success":
      return <CheckCircle2 className="w-3 h-3" />;
    case "error":
      return <AlertCircle className="w-3 h-3" />;
    default:
      return null;
  }
}

function getDefaultIcon(): ReactNode {
  return <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />;
}

function getSaveStatusColor(status: AnnotationSaveStatus): string {
  switch (status) {
    case "saving":
      return "text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800";
    case "success":
      return "text-green-600 dark:text-green-400 border-green-200 dark:border-green-800";
    case "error":
      return "text-destructive border-destructive/20";
    default:
      return "text-muted-foreground";
  }
}
