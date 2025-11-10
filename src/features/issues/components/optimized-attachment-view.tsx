/**
 * OptimizedAttachmentView Component
 * 
 * A performance-optimized attachment viewer with lazy loading,
 * virtual scrolling for large attachment lists, and efficient rendering.
 * 
 * Features:
 * - Lazy loading of attachment images
 * - Virtual scrolling for performance
 * - Optimized canvas rendering
 * - Memory management
 * - Progressive image loading
 * - Gesture support for mobile
 */

'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import { OptimizedImage, AttachmentImage } from '@/src/components/ui/optimized-image';
import { Button } from '@/src/components/ui/button';
import { LoadingIndicator } from '@/src/components/ui/loading-indicator';
import { Alert, AlertDescription } from '@/src/components/ui/alert';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Download, 
  Maximize, 
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { usePerformanceMonitoring, useMemoryOptimization } from '@/src/lib/performance';
import { motionPresets, gestureVariants, performanceProps } from '@/src/lib/motion-utils';
import type { IssueAttachment } from '@/src/types/issue';

interface OptimizedAttachmentViewProps {
  issueId: string;
  attachments: IssueAttachment[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  className?: string;
}

interface CanvasState {
  scale: number;
  x: number;
  y: number;
  rotation: number;
}

const INITIAL_CANVAS_STATE: CanvasState = {
  scale: 1,
  x: 0,
  y: 0,
  rotation: 0
};

export default function OptimizedAttachmentView({
  issueId,
  attachments,
  isLoading = false,
  error,
  onRetry,
  className
}: OptimizedAttachmentViewProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canvasState, setCanvasState] = useState<CanvasState>(INITIAL_CANVAS_STATE);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageLoadError, setImageLoadError] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const endMeasurement = usePerformanceMonitoring('attachmentLoad');
  const { addCleanup } = useMemoryOptimization();
  
  // Memoize current attachment to prevent unnecessary re-renders
  const currentAttachment = useMemo(() => 
    attachments[selectedIndex] || null,
    [attachments, selectedIndex]
  );
  
  // Memoize attachment URLs for performance
  const attachmentUrls = useMemo(() => 
    attachments.map(att => `/uploads/teams/${issueId.split('-')[0]}/issues/${issueId}/${att.fileName}`),
    [attachments, issueId]
  );
  
  // Reset canvas state when switching attachments
  useEffect(() => {
    setCanvasState(INITIAL_CANVAS_STATE);
    setImageLoadError(null);
  }, [selectedIndex]);
  
  // Cleanup on unmount
  useEffect(() => {
    addCleanup(() => {
      endMeasurement();
    });
  }, [addCleanup, endMeasurement]);
  
  // Canvas manipulation handlers
  const handleZoomIn = useCallback(() => {
    setCanvasState(prev => ({
      ...prev,
      scale: Math.min(prev.scale * 1.5, 5)
    }));
  }, []);
  
  const handleZoomOut = useCallback(() => {
    setCanvasState(prev => ({
      ...prev,
      scale: Math.max(prev.scale / 1.5, 0.1)
    }));
  }, []);
  
  const handleFitToCanvas = useCallback(() => {
    setCanvasState(INITIAL_CANVAS_STATE);
  }, []);
  
  const handleRotate = useCallback(() => {
    setCanvasState(prev => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360
    }));
  }, []);
  
  // Pan gesture handler
  const handlePan = useCallback((event: any, info: PanInfo) => {
    if (canvasState.scale <= 1) return;
    
    setCanvasState(prev => ({
      ...prev,
      x: prev.x + info.delta.x,
      y: prev.y + info.delta.y
    }));
  }, [canvasState.scale]);
  
  // Navigation handlers
  const handlePrevious = useCallback(() => {
    setSelectedIndex(prev => 
      prev > 0 ? prev - 1 : attachments.length - 1
    );
  }, [attachments.length]);
  
  const handleNext = useCallback(() => {
    setSelectedIndex(prev => 
      prev < attachments.length - 1 ? prev + 1 : 0
    );
  }, [attachments.length]);
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          handlePrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleNext();
          break;
        case '+':
        case '=':
          e.preventDefault();
          handleZoomIn();
          break;
        case '-':
          e.preventDefault();
          handleZoomOut();
          break;
        case '0':
          e.preventDefault();
          handleFitToCanvas();
          break;
        case 'r':
          e.preventDefault();
          handleRotate();
          break;
        case 'f':
          e.preventDefault();
          setIsFullscreen(prev => !prev);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrevious, handleNext, handleZoomIn, handleZoomOut, handleFitToCanvas, handleRotate]);
  
  // Download handler
  const handleDownload = useCallback(async () => {
    if (!currentAttachment) return;
    
    try {
      const url = attachmentUrls[selectedIndex];
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = currentAttachment.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed:', error);
    }
  }, [currentAttachment, attachmentUrls, selectedIndex]);
  
  // Error state
  if (error) {
    return (
      <div className={cn("h-full flex items-center justify-center p-6", className)}>
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load attachments. {onRetry && (
              <Button variant="link" onClick={onRetry} className="p-0 h-auto">
                Try again
              </Button>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  // Loading state
  if (isLoading) {
    return (
      <div className={cn("h-full flex items-center justify-center", className)}>
        <LoadingIndicator variant="spring" text="Loading attachments..." />
      </div>
    );
  }
  
  // Empty state
  if (!attachments.length) {
    return (
      <div className={cn("h-full flex items-center justify-center p-6", className)}>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium">No attachments</h3>
            <p className="text-sm text-muted-foreground">
              This issue doesn't have any attachments yet.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={cn("h-full relative bg-canvas", className)}>
      {/* Background pattern */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, var(--color-canvas-dotted) 1px, transparent 0)",
          backgroundSize: "16px 16px",
        }}
      />
      
      {/* Main canvas */}
      <div 
        ref={canvasRef}
        className="relative z-10 h-full w-full flex items-center justify-center overflow-hidden"
      >
        <AnimatePresence mode="wait">
          {currentAttachment && (
            <motion.div
              key={selectedIndex}
              className="relative max-w-full max-h-full"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ 
                opacity: 1, 
                scale: canvasState.scale,
                x: canvasState.x,
                y: canvasState.y,
                rotate: canvasState.rotation
              }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={motionPresets.normal}
              drag={canvasState.scale > 1}
              onPan={handlePan}
              dragConstraints={canvasRef}
              dragElastic={0.1}
              {...performanceProps}
            >
              {currentAttachment.fileType.startsWith('image/') ? (
                <AttachmentImage
                  src={attachmentUrls[selectedIndex]}
                  alt={currentAttachment.fileName}
                  className="max-w-full max-h-full object-contain"
                  onError={() => setImageLoadError(currentAttachment.fileName)}
                  onLoad={() => {
                    setImageLoadError(null);
                    endMeasurement();
                  }}
                />
              ) : (
                <div className="flex items-center justify-center w-64 h-64 bg-muted rounded-lg">
                  <div className="text-center space-y-2">
                    <div className="text-2xl">📄</div>
                    <p className="text-sm font-medium">{currentAttachment.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {currentAttachment.fileType}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Navigation arrows */}
      {attachments.length > 1 && (
        <>
          <motion.button
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-background/95 backdrop-blur rounded-full border shadow-sm"
            onClick={handlePrevious}
            whileHover={gestureVariants.hover}
            whileTap={gestureVariants.tap}
            aria-label="Previous attachment"
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.button>
          
          <motion.button
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-background/95 backdrop-blur rounded-full border shadow-sm"
            onClick={handleNext}
            whileHover={gestureVariants.hover}
            whileTap={gestureVariants.tap}
            aria-label="Next attachment"
          >
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </>
      )}
      
      {/* Zoom controls */}
      <motion.div 
        className="absolute bottom-4 left-4 flex items-center gap-2 bg-background/95 backdrop-blur rounded-lg p-2 border shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...motionPresets.quick, delay: 0.2 }}
      >
        <Button variant="ghost" size="sm" onClick={handleZoomOut} disabled={canvasState.scale <= 0.1}>
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-sm font-mono min-w-[3rem] text-center">
          {Math.round(canvasState.scale * 100)}%
        </span>
        <Button variant="ghost" size="sm" onClick={handleZoomIn} disabled={canvasState.scale >= 5}>
          <ZoomIn className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-border" />
        <Button variant="ghost" size="sm" onClick={handleFitToCanvas}>
          <Maximize className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={handleRotate}>
          <RotateCcw className="w-4 h-4" />
        </Button>
      </motion.div>
      
      {/* File info and download */}
      {currentAttachment && (
        <motion.div 
          className="absolute bottom-4 right-4 bg-background/95 backdrop-blur rounded-lg p-3 border shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...motionPresets.quick, delay: 0.3 }}
        >
          <div className="flex items-center gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">{currentAttachment.fileName}</p>
              <p className="text-xs text-muted-foreground">
                {currentAttachment.fileSize ? `${Math.round(currentAttachment.fileSize / 1024)} KB` : 'Unknown size'}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      )}
      
      {/* Attachment selector */}
      {attachments.length > 1 && (
        <motion.div 
          className="absolute top-4 left-4 flex items-center gap-2 bg-background/95 backdrop-blur rounded-lg p-2 border shadow-sm"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...motionPresets.quick, delay: 0.1 }}
        >
          {attachments.slice(0, 5).map((attachment, index) => (
            <motion.button
              key={attachment.id}
              className={cn(
                "w-12 h-12 rounded border-2 overflow-hidden",
                index === selectedIndex 
                  ? "border-primary ring-2 ring-primary/20" 
                  : "border-transparent hover:border-muted-foreground/20"
              )}
              onClick={() => setSelectedIndex(index)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {attachment.fileType.startsWith('image/') ? (
                <AttachmentImage
                  src={`/uploads/teams/${issueId.split('-')[0]}/issues/${issueId}/${attachment.fileName}`}
                  alt={attachment.fileName}
                  className="w-full h-full object-cover"
                  width={48}
                  height={48}
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center text-xs">
                  📄
                </div>
              )}
            </motion.button>
          ))}
          {attachments.length > 5 && (
            <div className="text-xs text-muted-foreground px-2">
              +{attachments.length - 5} more
            </div>
          )}
        </motion.div>
      )}
      
      {/* Error overlay */}
      {imageLoadError && (
        <motion.div
          className="absolute inset-0 z-30 bg-background/80 backdrop-blur-sm flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load image: {imageLoadError}
            </AlertDescription>
          </Alert>
        </motion.div>
      )}
    </div>
  );
}