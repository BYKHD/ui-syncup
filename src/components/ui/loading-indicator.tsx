/**
 * LoadingIndicator Component
 * 
 * A flexible loading indicator component with various sizes and styles.
 * Enhanced with motion animations and performance optimizations.
 * 
 * Features:
 * - Multiple sizes (sm, md, lg)
 * - Different variants (spinner, dots, pulse, skeleton)
 * - Optional text labels
 * - Accessible with proper ARIA attributes
 * - Optimized animations with motion
 * - Performance monitoring integration
 * 
 * @example
 * ```tsx
 * import { LoadingIndicator } from '@/src/components/ui/loading-indicator';
 * 
 * // Basic spinner
 * <LoadingIndicator />
 * 
 * // With text and spring animation
 * <LoadingIndicator size="md" text="Loading..." variant="spring" />
 * 
 * // Inline with button
 * <Button disabled={isLoading}>
 *   {isLoading && <LoadingIndicator size="sm" />}
 *   Save Changes
 * </Button>
 * ```
 */

'use client';

import { motion, AnimatePresence } from 'motion/react';
import { RiLoader4Line } from '@remixicon/react';
import { cn } from '@/src/lib/utils';

interface LoadingIndicatorProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'dots' | 'pulse' | 'spring' | 'skeleton';
  text?: string;
  className?: string;
  'aria-label'?: string;
  show?: boolean;
  delay?: number; // Delay before showing (prevents flash for quick loads)
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8'
};

const textSizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg'
};

export function LoadingIndicator({
  size = 'md',
  variant = 'spinner',
  text,
  className,
  'aria-label': ariaLabel,
  show = true,
  delay = 0
}: LoadingIndicatorProps) {
  const renderSpinner = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.1 }}
    >
      <RiLoader4Line 
        className={cn(sizeClasses[size], 'text-muted-foreground')}
        style={{
          animation: 'spin 1s linear infinite'
        }}
        aria-hidden="true"
      />
    </motion.div>
  );

  const renderDots = () => (
    <motion.div 
      className="flex items-center gap-1" 
      aria-hidden="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={cn(
            'rounded-full bg-muted-foreground',
            size === 'sm' ? 'h-1 w-1' : size === 'md' ? 'h-1.5 w-1.5' : 'h-2 w-2'
          )}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.4, 1, 0.4]
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut"
          }}
        />
      ))}
    </motion.div>
  );

  const renderPulse = () => (
    <motion.div
      className={cn(
        'rounded-full bg-muted-foreground',
        sizeClasses[size]
      )}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        scale: [0.8, 1.1, 0.8],
        opacity: [0.4, 1, 0.4]
      }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      aria-hidden="true"
    />
  );

  const renderSpring = () => (
    <motion.div
      className={cn(
        'rounded-full bg-primary',
        sizeClasses[size]
      )}
      initial={{ scale: 0 }}
      animate={{ scale: [0, 1.2, 1] }}
      exit={{ scale: 0 }}
      transition={{
        duration: 0.6,
        times: [0, 0.6, 1],
        type: "keyframes",
        ease: "easeOut"
      }}
      aria-hidden="true"
    />
  );

  const renderSkeleton = () => (
    <motion.div
      className={cn(
        'rounded bg-muted',
        size === 'sm' ? 'h-4 w-16' : size === 'md' ? 'h-6 w-24' : 'h-8 w-32'
      )}
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      aria-hidden="true"
    />
  );

  const renderIndicator = () => {
    switch (variant) {
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      case 'spring':
        return renderSpring();
      case 'skeleton':
        return renderSkeleton();
      default:
        return renderSpinner();
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div 
          className={cn(
            'flex items-center gap-2',
            text ? 'justify-start' : 'justify-center',
            className
          )}
          role="status"
          aria-label={ariaLabel || (text ? `Loading: ${text}` : 'Loading')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ delay: Math.max(0, delay / 1000), duration: 0.1 }}
        >
          {renderIndicator()}
          {text && (
            <motion.span 
              className={cn(
                'text-muted-foreground',
                textSizeClasses[size]
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
            >
              {text}
            </motion.span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Convenience components for common use cases
export function ButtonLoadingIndicator({ 
  className, 
  ...props 
}: Omit<LoadingIndicatorProps, 'size'>) {
  return (
    <LoadingIndicator 
      size="sm" 
      className={cn('mr-2', className)} 
      {...props} 
    />
  );
}

export function PageLoadingIndicator({ 
  className, 
  ...props 
}: LoadingIndicatorProps) {
  return (
    <div className={cn('flex h-32 items-center justify-center', className)}>
      <LoadingIndicator 
        size="lg" 
        text="Loading..." 
        {...props} 
      />
    </div>
  );
}

export function InlineLoadingIndicator({ 
  className, 
  ...props 
}: Omit<LoadingIndicatorProps, 'size'>) {
  return (
    <LoadingIndicator 
      size="sm" 
      variant="dots"
      className={cn('inline-flex', className)} 
      {...props} 
    />
  );
}
