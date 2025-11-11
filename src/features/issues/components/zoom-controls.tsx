"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ZoomIn, ZoomOut, Maximize, RotateCcw } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { CanvasViewState } from "@/types/issue";
import { cn } from "@/lib/utils";

interface ZoomControlsProps {
  zoomLevel: number;
  fitMode: CanvasViewState["fitMode"];
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToCanvas: () => void;
  onActualSize: () => void;
}

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 5;

export function ZoomControls({
  zoomLevel,
  fitMode,
  onZoomIn,
  onZoomOut,
  onFitToCanvas,
  onActualSize,
}: ZoomControlsProps) {
  const isMobile = useIsMobile();
  const zoomPercentage = `${Math.round(zoomLevel * 100)}%`;
  const zoomProgress = Math.min(Math.max((zoomLevel - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN), 0), 1);

  const buttons = [
    {
      id: "zoom-in",
      label: "Zoom in",
      icon: ZoomIn,
      action: onZoomIn,
      disabled: zoomLevel >= ZOOM_MAX,
    },
    {
      id: "zoom-out",
      label: "Zoom out",
      icon: ZoomOut,
      action: onZoomOut,
      disabled: zoomLevel <= ZOOM_MIN,
    },
    {
      id: "fit",
      label: "Fit to canvas",
      icon: Maximize,
      action: onFitToCanvas,
      variant: fitMode === "fit" ? "default" : "ghost",
    },
    {
      id: "actual",
      label: "Actual size (100%)",
      icon: RotateCcw,
      action: onActualSize,
      variant: fitMode === "actual" && zoomLevel === 1 ? "default" : "ghost",
    },
  ] as const;

  const buttonSize = isMobile ? "default" : "icon";
  const tooltipSide = isMobile ? "top" : "left";

  return (
    <TooltipProvider>
      <div
        className={cn(
          "w-full min-w-[220px] rounded-2xl border border-border/60 bg-background/90 p-3 text-xs shadow-lg backdrop-blur-md",
          !isMobile && "min-w-[140px]"
        )}
      >
        <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
          <span>Canvas</span>
          <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] text-foreground">{zoomPercentage}</span>
        </div>

        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-200"
            style={{ width: `${zoomProgress * 100}%` }}
          />
        </div>

        <div
          className={cn(
            "mt-3 flex items-center gap-2",
            !isMobile && "flex-col items-stretch gap-1"
          )}
        >
          {buttons.map(({ id, label, icon: Icon, action, disabled, variant }) => (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <Button
                  variant={variant ?? "ghost"}
                  size={buttonSize}
                  onClick={action}
                  disabled={disabled}
                  className={cn(
                    "transition-all",
                    buttonSize === "icon" ? "h-9 w-9" : "h-10 w-10",
                    variant === "default" && "shadow-inner"
                  )}
                  aria-label={label}
                >
                  <Icon className={buttonSize === "icon" ? "h-4 w-4" : "h-5 w-5"} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side={tooltipSide}>
                <p>{label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
