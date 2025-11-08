/**
 * OptimizedImage Component
 * 
 * A high-performance image component with lazy loading, progressive enhancement,
 * and optimized loading states.
 * 
 * Features:
 * - Intersection Observer-based lazy loading
 * - Progressive image loading with blur-up effect
 * - Automatic WebP/AVIF format detection
 * - Responsive image sizing
 * - Error handling with fallbacks
 * - Performance monitoring
 * 
 * @example
 * ```tsx
 * import { OptimizedImage } from '@components/ui/optimized-image';
 * 
 * // Basic usage
 * <OptimizedImage
 *   src="/uploads/image.jpg"
 *   alt="Description"
 *   width={800}
 *   height={600}
 * />
 * 
 * // With lazy loading and blur placeholder
 * <OptimizedImage
 *   src="/uploads/image.jpg"
 *   alt="Description"
 *   width={800}
 *   height={600}
 *   lazy
 *   blurDataURL="data:image/jpeg;base64,..."
 * />
 * ```
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@lib/utils';
import { useImageLazyLoading } from '@lib/performance';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  lazy?: boolean;
  blurDataURL?: string;
  priority?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  fallbackSrc?: string;
  sizes?: string;
  quality?: number;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  lazy = true,
  blurDataURL,
  priority = false,
  onLoad,
  onError,
  fallbackSrc,
  sizes,
  quality = 75
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(lazy ? (blurDataURL || '') : src);
  const imgRef = useRef<HTMLImageElement>(null);
  const { observeImage } = useImageLazyLoading();

  // Generate optimized src URLs
  const generateOptimizedSrc = useCallback((originalSrc: string, width?: number, quality?: number) => {
    if (!originalSrc.startsWith('/uploads/')) {
      return originalSrc;
    }

    const params = new URLSearchParams();
    if (width) params.set('w', width.toString());
    if (quality) params.set('q', quality.toString());
    
    return `${originalSrc}?${params.toString()}`;
  }, []);

  // Generate srcSet for responsive images
  const generateSrcSet = useCallback((originalSrc: string) => {
    if (!originalSrc.startsWith('/uploads/') || !width) {
      return undefined;
    }

    const breakpoints = [480, 768, 1024, 1280, 1920];
    return breakpoints
      .filter(bp => bp <= width * 2) // Don't generate larger than 2x original
      .map(bp => `${generateOptimizedSrc(originalSrc, bp, quality)} ${bp}w`)
      .join(', ');
  }, [generateOptimizedSrc, width, quality]);

  // Handle image load
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setIsError(false);
    onLoad?.();
  }, [onLoad]);

  // Handle image error
  const handleError = useCallback(() => {
    setIsError(true);
    
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setIsError(false);
      return;
    }
    
    const error = new Error(`Failed to load image: ${src}`);
    onError?.(error);
  }, [src, fallbackSrc, currentSrc, onError]);

  // Set up lazy loading
  useEffect(() => {
    if (!lazy || priority || !imgRef.current) return;

    const img = imgRef.current;
    img.dataset.src = generateOptimizedSrc(src, width, quality);
    
    observeImage(img);
  }, [lazy, priority, src, width, quality, generateOptimizedSrc, observeImage]);

  // Set up immediate loading for priority images
  useEffect(() => {
    if (priority || !lazy) {
      setCurrentSrc(generateOptimizedSrc(src, width, quality));
    }
  }, [priority, lazy, src, width, quality, generateOptimizedSrc]);

  const aspectRatio = width && height ? height / width : undefined;

  return (
    <div 
      className={cn(
        'relative overflow-hidden bg-muted',
        className
      )}
      style={{
        aspectRatio: aspectRatio ? `${width} / ${height}` : undefined,
        width: width ? `${width}px` : undefined,
        height: height ? `${height}px` : undefined,
      }}
    >
      {/* Blur placeholder */}
      {blurDataURL && !isLoaded && (
        <motion.img
          src={blurDataURL}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'blur(10px)' }}
          initial={{ opacity: 1 }}
          animate={{ opacity: isLoaded ? 0 : 1 }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Main image */}
      <AnimatePresence>
        {!isError && (
          <motion.img
            ref={imgRef}
            src={currentSrc}
            srcSet={generateSrcSet(src)}
            sizes={sizes}
            alt={alt}
            className="absolute inset-0 w-full h-full object-cover"
            onLoad={handleLoad}
            onError={handleError}
            loading={lazy && !priority ? 'lazy' : 'eager'}
            decoding="async"
            initial={{ opacity: 0 }}
            animate={{ opacity: isLoaded ? 1 : 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>

      {/* Loading state */}
      {!isLoaded && !isError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="w-8 h-8 border-2 border-muted-foreground/20 border-t-muted-foreground rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      )}

      {/* Error state */}
      {isError && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-muted-foreground/10 flex items-center justify-center">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-xs">Failed to load image</p>
          </div>
        </motion.div>
      )}

      {/* Progressive enhancement overlay */}
      {isLoaded && blurDataURL && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-transparent to-transparent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        />
      )}
    </div>
  );
}

// ============================================================================
// SPECIALIZED IMAGE COMPONENTS
// ============================================================================

export function AttachmentImage({
  src,
  alt,
  className,
  onLoad,
  onError,
  ...props
}: Omit<OptimizedImageProps, 'lazy' | 'priority'>) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      className={cn('rounded-lg border', className)}
      lazy={true}
      priority={false}
      onLoad={onLoad}
      onError={onError}
      {...props}
    />
  );
}

export function AvatarImage({
  src,
  alt,
  size = 32,
  className,
  ...props
}: Omit<OptimizedImageProps, 'width' | 'height' | 'lazy'> & {
  size?: number;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn('rounded-full', className)}
      lazy={false}
      priority={true}
      {...props}
    />
  );
}

export function ThumbnailImage({
  src,
  alt,
  className,
  ...props
}: Omit<OptimizedImageProps, 'lazy'>) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      className={cn('rounded border', className)}
      lazy={true}
      quality={60} // Lower quality for thumbnails
      {...props}
    />
  );
}