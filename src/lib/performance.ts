/**
 * Performance utilities for monitoring and optimization
 * 
 * Features:
 * - Performance monitoring for key user flows
 * - Memory usage tracking
 * - Time to Interactive measurement
 * - SWR cache optimization
 * - Image lazy loading utilities
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

interface PerformanceMetrics {
  timeToInteractive: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
}

interface UserFlowMetrics {
  issueDetailLoad: number;
  attachmentLoad: number;
  activityLoad: number;
  optimisticUpdate: number;
}

class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {};
  private userFlowMetrics: Partial<UserFlowMetrics> = {};
  private observers: PerformanceObserver[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeObservers();
    }
  }

  private initializeObservers() {
    // Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
        this.metrics.largestContentfulPaint = lastEntry.startTime;
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.metrics.firstInputDelay = entry.processingStart - entry.startTime;
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);

      // Cumulative Layout Shift
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.metrics.cumulativeLayoutShift = clsValue;
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);
    }
  }

  // Measure user flow performance
  startUserFlow(flowName: keyof UserFlowMetrics): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      this.userFlowMetrics[flowName] = endTime - startTime;
      
      // Log performance metrics in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`🚀 ${flowName}: ${(endTime - startTime).toFixed(2)}ms`);
      }
    };
  }

  // Get current metrics
  getMetrics(): { core: Partial<PerformanceMetrics>; userFlow: Partial<UserFlowMetrics> } {
    return {
      core: { ...this.metrics },
      userFlow: { ...this.userFlowMetrics }
    };
  }

  // Check if performance is within acceptable thresholds
  isPerformanceGood(): boolean {
    const { largestContentfulPaint, firstInputDelay, cumulativeLayoutShift } = this.metrics;
    
    return (
      (!largestContentfulPaint || largestContentfulPaint < 2500) &&
      (!firstInputDelay || firstInputDelay < 100) &&
      (!cumulativeLayoutShift || cumulativeLayoutShift < 0.1)
    );
  }

  // Cleanup observers
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();

// ============================================================================
// PERFORMANCE HOOKS
// ============================================================================

export function usePerformanceMonitoring(flowName: keyof UserFlowMetrics) {
  const endMeasurement = useRef<(() => void) | null>(null);

  useEffect(() => {
    endMeasurement.current = performanceMonitor.startUserFlow(flowName);
    
    return () => {
      if (endMeasurement.current) {
        endMeasurement.current();
      }
    };
  }, [flowName]);

  return useCallback(() => {
    if (endMeasurement.current) {
      endMeasurement.current();
      endMeasurement.current = null;
    }
  }, []);
}

// ============================================================================
// MEMORY OPTIMIZATION
// ============================================================================

export function useMemoryOptimization() {
  const cleanupFunctions = useRef<(() => void)[]>([]);

  const addCleanup = useCallback((cleanup: () => void) => {
    cleanupFunctions.current.push(cleanup);
  }, []);

  const forceCleanup = useCallback(() => {
    cleanupFunctions.current.forEach(cleanup => cleanup());
    cleanupFunctions.current = [];
    
    // Force garbage collection in development
    if (process.env.NODE_ENV === 'development' && 'gc' in window) {
      (window as any).gc();
    }
  }, []);

  useEffect(() => {
    return () => {
      forceCleanup();
    };
  }, [forceCleanup]);

  return { addCleanup, forceCleanup };
}

// ============================================================================
// SWR CACHE OPTIMIZATION
// ============================================================================

export const optimizedSWRConfig = {
  // Reduce memory usage by limiting cache size
  provider: () => new Map(),
  
  // Optimize revalidation timing
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  revalidateIfStale: true,
  
  // Reduce network requests
  dedupingInterval: 2000,
  focusThrottleInterval: 5000,
  
  // Error handling
  shouldRetryOnError: false,
  errorRetryCount: 0,
  
  // Performance optimizations
  keepPreviousData: true,
  compare: (a: any, b: any) => {
    // Custom comparison to prevent unnecessary re-renders
    return JSON.stringify(a) === JSON.stringify(b);
  }
};

// Issue-specific SWR config
export const issueDetailSWRConfig = {
  ...optimizedSWRConfig,
  refreshInterval: 0, // Disable polling for issue details
  revalidateOnMount: true,
};

// Activity timeline SWR config with polling
export const activityTimelineSWRConfig = {
  ...optimizedSWRConfig,
  refreshInterval: 10000, // Poll every 10 seconds
  refreshWhenHidden: false, // Don't poll when tab is hidden
  refreshWhenOffline: false, // Don't poll when offline
};

// ============================================================================
// IMAGE LAZY LOADING
// ============================================================================

export function useImageLazyLoading(options?: {
  rootMargin?: string;
  threshold?: number;
}) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const imageRefs = useRef<Set<HTMLImageElement>>(new Set());

  const observeImage = useCallback((img: HTMLImageElement | null) => {
    if (!img) return;

    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement;
              const src = img.dataset.src;

              if (src) {
                img.src = src;
                img.removeAttribute('data-src');
                observerRef.current?.unobserve(img);
                imageRefs.current.delete(img);
              }
            }
          });
        },
        {
          rootMargin: options?.rootMargin || '50px', // Start loading 50px before image enters viewport
          threshold: options?.threshold || 0.1
        }
      );
    }

    imageRefs.current.add(img);
    observerRef.current.observe(img);
  }, [options?.rootMargin, options?.threshold]);

  const cleanup = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    imageRefs.current.clear();
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return { observeImage, cleanup };
}

// ============================================================================
// PREFETCHING UTILITIES
// ============================================================================

export function prefetchIssueData(issueId: string) {
  if (typeof window === 'undefined') return;

  // Prefetch issue details
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = `/api/issues/${issueId}`;
  document.head.appendChild(link);

  // Prefetch activity timeline
  const activityLink = document.createElement('link');
  activityLink.rel = 'prefetch';
  activityLink.href = `/api/issues/${issueId}/activity`;
  document.head.appendChild(activityLink);

  // Cleanup after 5 seconds
  setTimeout(() => {
    document.head.removeChild(link);
    document.head.removeChild(activityLink);
  }, 5000);
}

// ============================================================================
// PERFORMANCE UTILITIES
// ============================================================================

export function measureTimeToInteractive(): Promise<number> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(0);
      return;
    }

    // Use requestIdleCallback if available
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        resolve(performance.now());
      });
    } else {
      // Fallback to setTimeout
      setTimeout(() => {
        resolve(performance.now());
      }, 0);
    }
  });
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}


// ============================================================================
// CLEANUP
// ============================================================================

export function cleanupPerformanceMonitoring() {
  performanceMonitor.cleanup();
}