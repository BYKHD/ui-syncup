/**
 * useOptimizedImage Hook (Feature-Specific Logic)
 *
 * Business logic for optimized image loading in the issues feature.
 * Handles lazy loading, URL generation, fallbacks, and state management.
 *
 * @example
 * ```tsx
 * const imageProps = useOptimizedImage({
 *   src: '/uploads/image.jpg',
 *   width: 800,
 *   quality: 75,
 *   lazy: true,
 *   fallbackSrc: '/fallback.jpg'
 * });
 *
 * return <OptimizedImage {...imageProps} alt="Description" />;
 * ```
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useImageLazyLoading } from '@/lib/performance';

interface UseOptimizedImageOptions {
  src: string;
  width?: number;
  height?: number;
  lazy?: boolean;
  priority?: boolean;
  fallbackSrc?: string;
  quality?: number;
  blurDataURL?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

interface UseOptimizedImageReturn {
  currentSrc: string | null;
  srcSet?: string;
  isLoaded: boolean;
  isError: boolean;
  handleLoad: () => void;
  handleError: () => void;
  loading: 'lazy' | 'eager';
  imgRef?: React.RefObject<HTMLImageElement | null>;
}

// ============================================================================
// URL GENERATION UTILITIES
// ============================================================================

/**
 * Generate optimized src URL with width and quality parameters
 */
export function generateOptimizedSrc(
  originalSrc: string,
  width?: number,
  quality?: number
): string {
  if (!originalSrc.startsWith('/uploads/')) {
    return originalSrc;
  }

  const params = new URLSearchParams();
  if (width) params.set('w', width.toString());
  if (quality) params.set('q', quality.toString());

  const queryString = params.toString();
  return queryString ? `${originalSrc}?${queryString}` : originalSrc;
}

/**
 * Generate responsive srcSet for multiple breakpoints
 */
export function generateSrcSet(
  originalSrc: string,
  width?: number,
  quality?: number
): string | undefined {
  if (!originalSrc.startsWith('/uploads/') || !width) {
    return undefined;
  }

  const breakpoints = [480, 768, 1024, 1280, 1920];
  return breakpoints
    .filter(bp => bp <= width * 2) // Don't generate larger than 2x original
    .map(bp => `${generateOptimizedSrc(originalSrc, bp, quality)} ${bp}w`)
    .join(', ');
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useOptimizedImage({
  src,
  width,
  height,
  lazy = true,
  priority = false,
  fallbackSrc,
  quality = 75,
  blurDataURL,
  onLoad,
  onError,
}: UseOptimizedImageOptions): UseOptimizedImageReturn {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(
    lazy && !priority ? (blurDataURL || null) : generateOptimizedSrc(src, width, quality)
  );

  const imgRef = useRef<HTMLImageElement>(null);
  const { observeImage } = useImageLazyLoading();

  // Generate srcSet for responsive images
  const srcSet = generateSrcSet(src, width, quality);

  // Handle image load success
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setIsError(false);
    onLoad?.();
  }, [onLoad]);

  // Handle image load error
  const handleError = useCallback(() => {
    setIsError(true);

    // Try fallback if available and not already tried
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setIsError(false);
      return;
    }

    const error = new Error(`Failed to load image: ${src}`);
    onError?.(error);
  }, [src, fallbackSrc, currentSrc, onError]);

  // Set up lazy loading with Intersection Observer
  useEffect(() => {
    if (!lazy || priority || !imgRef.current) return;

    const img = imgRef.current;
    const optimizedSrc = generateOptimizedSrc(src, width, quality);

    img.dataset.src = optimizedSrc;
    observeImage(img);

    // When image is loaded by the observer, update state
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
          const newSrc = img.getAttribute('src');
          if (newSrc && newSrc !== blurDataURL) {
            setCurrentSrc(newSrc);
          }
        }
      });
    });

    observer.observe(img, { attributes: true });

    return () => {
      observer.disconnect();
    };
  }, [lazy, priority, src, width, quality, blurDataURL, observeImage]);

  // Set up immediate loading for priority images
  useEffect(() => {
    if (priority || !lazy) {
      const newSrc = generateOptimizedSrc(src, width, quality);
      setCurrentSrc((prev) => (prev !== newSrc ? newSrc : prev));
    }
  }, [priority, lazy, src, width, quality]);

  return {
    currentSrc,
    srcSet,
    isLoaded,
    isError,
    handleLoad,
    handleError,
    loading: lazy && !priority ? 'lazy' : 'eager',
    imgRef: lazy && !priority ? imgRef : undefined,
  };
}

// ============================================================================
// ATTACHMENT-SPECIFIC HOOK
// ============================================================================

/**
 * Specialized hook for issue attachments
 */
export function useAttachmentImage(options: Omit<UseOptimizedImageOptions, 'lazy' | 'priority'>) {
  return useOptimizedImage({
    ...options,
    lazy: true,
    priority: false,
    quality: options.quality ?? 75,
  });
}

/**
 * Specialized hook for avatar images (eager loading)
 */
export function useAvatarImage(options: Omit<UseOptimizedImageOptions, 'lazy' | 'priority'>) {
  return useOptimizedImage({
    ...options,
    lazy: false,
    priority: true,
  });
}

/**
 * Specialized hook for thumbnail images (lower quality)
 */
export function useThumbnailImage(options: Omit<UseOptimizedImageOptions, 'lazy' | 'quality'>) {
  return useOptimizedImage({
    ...options,
    lazy: true,
    quality: 60,
  });
}
