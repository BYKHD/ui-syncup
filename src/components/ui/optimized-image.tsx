/**
 * OptimizedImage Component (Presentation Layer)
 *
 * A presentation-only image component with progressive loading states.
 * All business logic (lazy loading, intersection observers) should be
 * handled by feature-specific hooks.
 *
 * Features:
 * - Progressive image loading with blur-up effect
 * - Loading and error states
 * - Responsive image sizing
 * - Smooth animations
 *
 * @example
 * ```tsx
 * import { OptimizedImage } from '@/components/ui/optimized-image';
 *
 * // Basic usage
 * <OptimizedImage
 *   src="/uploads/image.jpg"
 *   alt="Description"
 *   width={800}
 *   height={600}
 *   isLoaded={true}
 * />
 *
 * // With blur placeholder
 * <OptimizedImage
 *   src="/uploads/image.jpg"
 *   alt="Description"
 *   width={800}
 *   height={600}
 *   blurDataURL="data:image/jpeg;base64,..."
 *   isLoaded={false}
 * />
 * ```
 */

'use client';

import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string | null;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  blurDataURL?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  srcSet?: string;
  sizes?: string;
  loading?: 'lazy' | 'eager';
  isLoaded?: boolean;
  isError?: boolean;
  imgRef?: React.RefObject<HTMLImageElement | null>;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  blurDataURL,
  onLoad,
  onError,
  srcSet,
  sizes,
  loading = 'lazy',
  isLoaded = false,
  isError = false,
  imgRef,
}: OptimizedImageProps) {
  const aspectRatio = width && height ? height / width : undefined;

  const handleError = () => {
    const error = new Error(`Failed to load image: ${src}`);
    onError?.(error);
  };

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
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'blur(10px)' }}
          initial={{ opacity: 1 }}
          animate={{ opacity: isLoaded ? 0 : 1 }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Main image */}
      <AnimatePresence>
        {!isError && src && (
          <motion.img
            ref={imgRef}
            src={src}
            srcSet={srcSet}
            sizes={sizes}
            alt={alt}
            className="absolute inset-0 w-full h-full object-cover"
            onLoad={onLoad}
            onError={handleError}
            loading={loading}
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
                aria-hidden="true"
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
    </div>
  );
}

// ============================================================================
// SPECIALIZED IMAGE COMPONENTS (Presentation Only)
// ============================================================================

export function AttachmentImage({
  className,
  ...props
}: OptimizedImageProps) {
  return (
    <OptimizedImage
      className={cn('rounded-lg border', className)}
      {...props}
    />
  );
}

export function AvatarImage({
  size = 32,
  className,
  ...props
}: Omit<OptimizedImageProps, 'width' | 'height'> & {
  size?: number;
}) {
  return (
    <OptimizedImage
      width={size}
      height={size}
      className={cn('rounded-full', className)}
      loading="eager"
      {...props}
    />
  );
}

export function ThumbnailImage({
  className,
  ...props
}: OptimizedImageProps) {
  return (
    <OptimizedImage
      className={cn('rounded border', className)}
      {...props}
    />
  );
}
