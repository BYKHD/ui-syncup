/**
 * OptimizedImage Component (Feature-Specific)
 *
 * Issues feature wrapper for OptimizedImage that wires up feature-specific
 * business logic through hooks while keeping the presentation layer clean.
 *
 * This component follows the project scaffolding pattern:
 * - Business logic lives in hooks (use-optimized-image.ts)
 * - Presentation lives in UI components (@/components/ui/optimized-image)
 * - Feature components wire them together
 *
 * @example
 * ```tsx
 * import { AttachmentImage } from '@/features/issues/components/optimized-image';
 *
 * <AttachmentImage
 *   src="/uploads/image.jpg"
 *   alt="Description"
 *   width={800}
 *   height={600}
 * />
 * ```
 */

'use client';

import {
  OptimizedImage as UIOptimizedImage,
  AttachmentImage as UIAttachmentImage,
  AvatarImage as UIAvatarImage,
  ThumbnailImage as UIThumbnailImage,
} from '@/components/ui/optimized-image';
import {
  useOptimizedImage,
  useAttachmentImage,
  useAvatarImage,
  useThumbnailImage,
} from '@/features/issues/hooks';

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// MAIN COMPONENT (Wiring Layer)
// ============================================================================

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
  quality = 75,
}: OptimizedImageProps) {
  const {
    currentSrc,
    srcSet,
    isLoaded,
    isError,
    handleLoad,
    handleError,
    loading,
    imgRef,
  } = useOptimizedImage({
    src,
    width,
    height,
    lazy,
    priority,
    fallbackSrc,
    quality,
    blurDataURL,
    onLoad,
    onError,
  });

  return (
    <UIOptimizedImage
      src={currentSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      blurDataURL={blurDataURL}
      onLoad={handleLoad}
      onError={handleError}
      srcSet={srcSet}
      sizes={sizes}
      loading={loading}
      isLoaded={isLoaded}
      isError={isError}
      imgRef={imgRef}
    />
  );
}

// ============================================================================
// SPECIALIZED COMPONENTS (Wiring Layer)
// ============================================================================

export function AttachmentImage({
  className,
  quality = 75,
  ...props
}: Omit<OptimizedImageProps, 'lazy' | 'priority'>) {
  const {
    currentSrc,
    srcSet,
    isLoaded,
    isError,
    handleLoad,
    handleError,
    loading,
    imgRef,
  } = useAttachmentImage({
    src: props.src,
    width: props.width,
    height: props.height,
    fallbackSrc: props.fallbackSrc,
    quality,
    blurDataURL: props.blurDataURL,
    onLoad: props.onLoad,
    onError: props.onError,
  });

  return (
    <UIAttachmentImage
      src={currentSrc}
      alt={props.alt}
      width={props.width}
      height={props.height}
      className={className}
      blurDataURL={props.blurDataURL}
      onLoad={handleLoad}
      onError={handleError}
      srcSet={srcSet}
      sizes={props.sizes}
      loading={loading}
      isLoaded={isLoaded}
      isError={isError}
      imgRef={imgRef}
    />
  );
}

export function AvatarImage({
  size = 32,
  className,
  ...props
}: Omit<OptimizedImageProps, 'width' | 'height' | 'lazy'> & {
  size?: number;
}) {
  const {
    currentSrc,
    srcSet,
    isLoaded,
    isError,
    handleLoad,
    handleError,
    loading,
    imgRef,
  } = useAvatarImage({
    src: props.src,
    width: size,
    height: size,
    fallbackSrc: props.fallbackSrc,
    quality: props.quality,
    blurDataURL: props.blurDataURL,
    onLoad: props.onLoad,
    onError: props.onError,
  });

  return (
    <UIAvatarImage
      src={currentSrc}
      alt={props.alt}
      size={size}
      className={className}
      blurDataURL={props.blurDataURL}
      onLoad={handleLoad}
      onError={handleError}
      srcSet={srcSet}
      sizes={props.sizes}
      loading={loading}
      isLoaded={isLoaded}
      isError={isError}
      imgRef={imgRef}
    />
  );
}

export function ThumbnailImage({
  className,
  ...props
}: Omit<OptimizedImageProps, 'lazy'>) {
  const {
    currentSrc,
    srcSet,
    isLoaded,
    isError,
    handleLoad,
    handleError,
    loading,
    imgRef,
  } = useThumbnailImage({
    src: props.src,
    width: props.width,
    height: props.height,
    fallbackSrc: props.fallbackSrc,
    blurDataURL: props.blurDataURL,
    onLoad: props.onLoad,
    onError: props.onError,
  });

  return (
    <UIThumbnailImage
      src={currentSrc}
      alt={props.alt}
      width={props.width}
      height={props.height}
      className={className}
      blurDataURL={props.blurDataURL}
      onLoad={handleLoad}
      onError={handleError}
      srcSet={srcSet}
      sizes={props.sizes}
      loading={loading}
      isLoaded={isLoaded}
      isError={isError}
      imgRef={imgRef}
    />
  );
}
