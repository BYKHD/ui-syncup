"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ZoomIn, ZoomOut, Maximize, RotateCcw } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { CanvasViewState } from "@/features/issues/types";
import { motion } from "motion/react";
import { RiAlignVertically, RiAspectRatioLine, RiFullscreenLine, RiZoomInLine, RiZoomOutLine } from "@remixicon/react";

interface ZoomControlsProps {
  zoomLevel: number;
  /** True when image is centered at fit-calculated zoom */
  isFitted: boolean;
  /** True when zoom === 1 (100%) */
  isActualSize: boolean;
  onRecenterView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  /** Fit image to be fully contained within the viewport */
  onFitToCanvas: () => void;
  /** Set zoom to 100% (1:1 pixel), pivoting around viewport center */
  onActualSize: () => void;
}

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 5;

export function ZoomControls({
  zoomLevel,
  isFitted,
  isActualSize,
  onRecenterView,
  onZoomIn,
  onZoomOut,
  onFitToCanvas,
  onActualSize,
}: ZoomControlsProps) {
  const isMobile = useIsMobile();
  const formatZoomPercentage = (zoom: number) => `${Math.round(zoom * 100)}%`;

  const buttonSize = isMobile ? "default" : "sm";
  const buttonClass = isMobile ? "h-10 w-10 p-0" : "h-8 w-8 p-0";
  const iconClass = isMobile ? "h-5 w-5" : "h-4 w-4";
  const isAtMinZoom = zoomLevel <= ZOOM_MIN;
  const isAtMaxZoom = zoomLevel >= ZOOM_MAX;

  return (
    <TooltipProvider>
      <motion.div
        className="flex items-center gap-2 rounded-xl border bg-background/95 p-1 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size={buttonSize}
              className={buttonClass}
              aria-label="Zoom out"
              onClick={onZoomOut}
              disabled={isAtMinZoom}
            >
              <RiZoomOutLine className={iconClass} aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Zoom out</TooltipContent>
        </Tooltip>

        <span className="min-w-[3rem] text-center text-sm font-mono tabular-nums">
          {formatZoomPercentage(zoomLevel)}
        </span>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size={buttonSize}
              className={buttonClass}
              aria-label="Zoom in"
              onClick={onZoomIn}
              disabled={isAtMaxZoom}
            >
              <RiZoomInLine className={iconClass} aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Zoom in</TooltipContent>
        </Tooltip>

        <div className="h-6 w-px bg-border" aria-hidden="true" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size={buttonSize}
              className={buttonClass}
              aria-label="Re-center"
              onClick={onRecenterView}
            >
              <RiAlignVertically className={iconClass} aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Re-center</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size={buttonSize}
              className={buttonClass}
              aria-label="Fit to canvas"
              onClick={onFitToCanvas}
              aria-pressed={isFitted}
              disabled={isFitted}
            >
              <RiAspectRatioLine className={iconClass} aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Fit to canvas</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size={buttonSize}
              className={buttonClass}
              aria-label="Actual size"
              onClick={onActualSize}
              aria-pressed={isActualSize}
              disabled={isActualSize}
            >
              <RiFullscreenLine className={iconClass} aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Actual size</TooltipContent>
        </Tooltip>
      </motion.div>
    </TooltipProvider>
  );
}
