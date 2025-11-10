"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ZoomIn, ZoomOut, Maximize, RotateCcw } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { CanvasViewState } from "@/types/issue";

interface ZoomControlsProps {
  zoomLevel: number;
  fitMode: CanvasViewState['fitMode'];
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToCanvas: () => void;
  onActualSize: () => void;
}

export function ZoomControls({
  zoomLevel,
  fitMode,
  onZoomIn,
  onZoomOut,
  onFitToCanvas,
  onActualSize
}: ZoomControlsProps) {
  const isMobile = useIsMobile();
  
  const formatZoomPercentage = (zoom: number) => {
    return `${Math.round(zoom * 100)}%`;
  };

  return (
    <TooltipProvider>
      <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-lg border shadow-sm">
        <div className={`flex flex-col gap-1 ${isMobile ? 'p-3' : 'p-2'}`}>
          {/* Zoom level display */}
          <div className={`text-xs text-center text-muted-foreground px-2 py-1 w-full ${isMobile ? 'text-sm' : ''}`}>
            {formatZoomPercentage(zoomLevel)}
          </div>
          
          {/* Zoom in */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={isMobile ? "default" : "sm"}
                onClick={onZoomIn}
                disabled={zoomLevel >= 5}
                className={isMobile ? "h-10 w-10 p-0" : "h-8 w-8 p-0"}
              >
                <ZoomIn className={isMobile ? "h-5 w-5" : "h-4 w-4"} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Zoom in</p>
            </TooltipContent>
          </Tooltip>

          {/* Zoom out */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={isMobile ? "default" : "sm"}
                onClick={onZoomOut}
                disabled={zoomLevel <= 0.1}
                className={isMobile ? "h-10 w-10 p-0" : "h-8 w-8 p-0"}
              >
                <ZoomOut className={isMobile ? "h-5 w-5" : "h-4 w-4"} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Zoom out</p>
            </TooltipContent>
          </Tooltip>

          {/* Fit to canvas */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={fitMode === 'fit' ? 'default' : 'ghost'}
                size={isMobile ? "default" : "sm"}
                onClick={onFitToCanvas}
                className={isMobile ? "h-10 w-10 p-0" : "h-8 w-8 p-0"}
              >
                <Maximize className={isMobile ? "h-5 w-5" : "h-4 w-4"} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Fit to canvas</p>
            </TooltipContent>
          </Tooltip>

          {/* Actual size (100%) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={fitMode === 'actual' && zoomLevel === 1 ? 'default' : 'ghost'}
                size={isMobile ? "default" : "sm"}
                onClick={onActualSize}
                className={isMobile ? "h-10 w-10 p-0" : "h-8 w-8 p-0"}
              >
                <RotateCcw className={isMobile ? "h-5 w-5" : "h-4 w-4"} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Actual size (100%)</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}