/**
 * SuccessIndicator Component
 * 
 * A visual success indicator with animation for completed actions.
 * 
 * Features:
 * - Animated checkmark with smooth transitions
 * - Multiple sizes and variants
 * - Optional text labels
 * - Auto-hide functionality
 * - Accessible with proper ARIA attributes
 * 
 * @example
 * ```tsx
 * import { SuccessIndicator } from '@/src/components/ui/success-indicator';
 * 
 * // Basic success indicator
 * <SuccessIndicator />
 * 
 * // With text and auto-hide
 * <SuccessIndicator 
 *   text="Saved successfully" 
 *   autoHide={3000}
 *   onHide={() => setShowSuccess(false)}
 * />
 * 
 * // Inline with form field
 * <div className="flex items-center gap-2">
 *   <Input value={value} onChange={onChange} />
 *   {showSuccess && <SuccessIndicator size="sm" />}
 * </div>
 * ```
 */

'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RiCheckLine } from '@remixicon/react';
import { cn } from '@/src/lib/utils';

interface SuccessIndicatorProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'checkmark' | 'pulse' | 'bounce';
  text?: string;
  className?: string;
  autoHide?: number; // Auto-hide after milliseconds
  onHide?: () => void;
  show?: boolean;
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

export function SuccessIndicator({
  size = 'md',
  variant = 'checkmark',
  text,
  className,
  autoHide,
  onHide,
  show = true
}: SuccessIndicatorProps) {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    setVisible(show);
  }, [show]);

  useEffect(() => {
    if (autoHide && visible) {
      const timer = setTimeout(() => {
        setVisible(false);
        onHide?.();
      }, autoHide);

      return () => clearTimeout(timer);
    }
  }, [autoHide, visible, onHide]);

  const renderCheckmark = () => (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ 
        type: "spring", 
        stiffness: 500, 
        damping: 30,
        duration: 0.3
      }}
      className={cn(
        'flex items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400',
        sizeClasses[size]
      )}
    >
      <RiCheckLine 
        className={cn(
          size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'
        )} 
      />
    </motion.div>
  );

  const renderPulse = () => (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ 
        scale: [0, 1.2, 1], 
        opacity: [0, 1, 1] 
      }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ 
        duration: 0.6,
        times: [0, 0.6, 1],
        ease: "easeOut",
        type: "keyframes"
      }}
      className={cn(
        'flex items-center justify-center rounded-full bg-green-500 text-white',
        sizeClasses[size]
      )}
    >
      <RiCheckLine 
        className={cn(
          size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'
        )} 
      />
    </motion.div>
  );

  const renderBounce = () => (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ 
        y: [0, -10, 0], 
        opacity: 1,
        scale: [0.8, 1.1, 1]
      }}
      exit={{ y: 20, opacity: 0 }}
      transition={{ 
        duration: 0.8,
        times: [0, 0.4, 1],
        ease: "easeOut",
        type: "keyframes"
      }}
      className={cn(
        'flex items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400',
        sizeClasses[size]
      )}
    >
      <RiCheckLine 
        className={cn(
          size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'
        )} 
      />
    </motion.div>
  );

  const renderIndicator = () => {
    switch (variant) {
      case 'pulse':
        return renderPulse();
      case 'bounce':
        return renderBounce();
      default:
        return renderCheckmark();
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div 
          className={cn(
            'flex items-center gap-2',
            text ? 'justify-start' : 'justify-center',
            className
          )}
          role="status"
          aria-label={text ? `Success: ${text}` : 'Success'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {renderIndicator()}
          {text && (
            <motion.span 
              className={cn(
                'text-green-600 dark:text-green-400 font-medium',
                textSizeClasses[size]
              )}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ delay: 0.1 }}
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
export function InlineSuccessIndicator({ 
  className, 
  ...props 
}: Omit<SuccessIndicatorProps, 'size'>) {
  return (
    <SuccessIndicator 
      size="sm" 
      className={cn('inline-flex', className)} 
      {...props} 
    />
  );
}

export function FormSuccessIndicator({ 
  className, 
  ...props 
}: SuccessIndicatorProps) {
  return (
    <SuccessIndicator 
      variant="bounce"
      autoHide={3000}
      className={cn('justify-start', className)} 
      {...props} 
    />
  );
}

export function ToastSuccessIndicator({ 
  className, 
  ...props 
}: Omit<SuccessIndicatorProps, 'size' | 'variant'>) {
  return (
    <SuccessIndicator 
      size="sm"
      variant="pulse"
      className={cn('inline-flex', className)} 
      {...props} 
    />
  );
}
