"use client";

import type { ReactNode } from "react";

interface CanvasStateIndicatorProps {
  pointerPanEnabled: boolean;
  statusMessage?: ReactNode;
}

export function CanvasStateIndicator({ pointerPanEnabled, statusMessage }: CanvasStateIndicatorProps) {
  const defaultMessage = pointerPanEnabled
    ? "Drag to pan · Scroll to zoom"
    : "Scroll to pan · Hold Space for Hand tool";

  return (
    <div className="absolute top-4 left-4 z-10">
      <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-md px-3 py-1.5 text-xs text-muted-foreground border flex items-center gap-2">
        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
        <span>{statusMessage ?? defaultMessage}</span>
      </div>
    </div>
  );
}
