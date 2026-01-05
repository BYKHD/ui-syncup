'use client';

import { useId, useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { STATUS_OPTIONS, STATUS_COLORS, ISSUE_WORKFLOW } from '@/features/issues/config';
import type { IssueStatus } from '@/features/issues/types';
import { STATUS_TRANSITIONS } from '@/features/issues/types';
import { cn } from '@/lib/utils';
import { RiArrowDownSLine, RiCheckLine, RiLoader4Line, RiShieldKeyholeLine } from '@remixicon/react';
import { toast } from 'sonner';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';

interface StatusSelectorProps {
  value: IssueStatus;
  onChange: (nextStatus: IssueStatus) => Promise<void>;
  canChange?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
}

const statusOrder = STATUS_OPTIONS.map((option) => option.value);

const formatStageLabel = (stage?: string) => {
  if (!stage) return 'Workflow';
  return stage
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};

// Spring transition for the morphing effect
const springTransition = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,
};

// Content fade transition
const contentTransition = {
  duration: 0.15,
  ease: 'easeOut' as const,
};

// Variants for button content with separate enter/exit delays
const buttonContentVariants = {
  hidden: { opacity: 0, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    filter: 'blur(0px)',
    transition: { ...springTransition, delay: 0.15 },
  },
  exit: {
    opacity: 0,
    filter: 'blur(16px)',
    transition: { ...springTransition, delay: 0 },
  },
};

// Variants for menu content with separate enter/exit delays
const menuContentVariants = {
  hidden: { opacity: 0, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    filter: 'blur(0px)',
    transition: { ...springTransition, delay: 0.1 },
  },
  exit: {
    opacity: 0,
    filter: 'blur(16px)',
    transition: { ...springTransition, delay: 0 },
  },
};

export function StatusSelector({
  value,
  onChange,
  canChange = true,
  disabled = false,
  id,
  className,
}: StatusSelectorProps) {
  const generatedId = useId();
  const layoutId = `status-selector-${generatedId}`;
  const triggerId = id ?? layoutId;
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentOption =
    STATUS_OPTIONS.find((option) => option.value === value) ?? STATUS_OPTIONS[0];

  const actionableStatuses = useMemo(() => {
    const transitions = STATUS_TRANSITIONS[value] ?? [];
    return new Set<IssueStatus>([value, ...transitions]);
  }, [value]);

  const actionableOptions = STATUS_OPTIONS.filter((option) =>
    actionableStatuses.has(option.value),
  );
  const lockedOptions = STATUS_OPTIONS.filter(
    (option) => !actionableStatuses.has(option.value),
  );

  const stage = ISSUE_WORKFLOW[value]?.stage;
  const stageLabel = formatStageLabel(stage);
  const stageDescription = ISSUE_WORKFLOW[value]?.description;

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const handleStatusChange = useCallback(async (nextStatus: IssueStatus) => {
    if (nextStatus === value || isSaving) {
      setOpen(false);
      return;
    }

    setIsSaving(true);
    try {
      await onChange(nextStatus);
      const label = STATUS_OPTIONS.find((option) => option.value === nextStatus)?.label;
      toast.success('Status updated', {
        description: label ? `Moved to ${label}` : `Moved to ${nextStatus}`,
      });
      setOpen(false);
    } catch (error) {
      const description =
        error instanceof Error ? error.message : 'Please try again in a moment.';
      toast.error('Unable to update status', { description });
    } finally {
      setIsSaving(false);
    }
  }, [value, isSaving, onChange]);

  const renderCommandItem = (option: (typeof STATUS_OPTIONS)[number], isLocked: boolean) => {
    const isActive = option.value === value;
    const selectable = canChange && !isLocked;

    return (
      <CommandItem
        key={option.value}
        value={option.value}
        onSelect={() => {
          if (!selectable) return;
          void handleStatusChange(option.value);
        }}
        className={cn(
          'flex items-start justify-between gap-3 py-3',
          !selectable && !isActive && 'opacity-60',
        )}
        aria-disabled={!selectable && !isActive}
      >
        <div className="flex flex-col gap-1 text-left">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <option.icon className={`h-4 w-4 ${STATUS_COLORS[option.value].text}`} aria-hidden="true" />
            {option.label}
            {isActive && (
              <Badge variant="outline" className="text-[10px] uppercase">
                Current
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{option.description}</p>
        </div>
        {isActive ? (
          <RiCheckLine className="h-4 w-4 text-primary" aria-hidden="true" />
        ) : (
          !selectable && <RiShieldKeyholeLine className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        )}
      </CommandItem>
    );
  };

  return (
    <LayoutGroup>
      <div ref={containerRef} className={cn('relative flex min-w-[10rem] flex-1 flex-col gap-1', className)}>
        <span className="sr-only text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Status
        </span>

        {/* Click-outside handler (invisible) */}
        <AnimatePresence>
          {open && (
            <motion.div
              className="fixed inset-0 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
          )}
        </AnimatePresence>

        {/* Fixed-size wrapper to prevent parent height changes */}
        <div className="relative z-50 h-[44px] min-w-[9rem]">
          <AnimatePresence mode="popLayout">
            {!open ? (
              /* Collapsed: Trigger Button */
              <motion.button
                key="trigger"
                layoutId={layoutId}
                id={triggerId}
                type="button"
                onClick={() => !disabled && !isSaving && setOpen(true)}
                className={cn(
                  'absolute inset-0 inline-flex items-center justify-between gap-3 rounded-md border border-border bg-primary px-4 text-left text-primary-foreground shadow-sm transition-colors',
                  'hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  !canChange && 'opacity-80',
                  (disabled || isSaving) && 'pointer-events-none opacity-60',
                )}
                aria-label={`Current status: ${currentOption.label}`}
                aria-haspopup="listbox"
                aria-expanded={open}
                disabled={disabled || isSaving}
                transition={springTransition}
                style={{ borderRadius: 8 }}
              >
                <motion.span
                  className="flex items-center gap-2"
                  variants={buttonContentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {isSaving ? (
                    <RiLoader4Line className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <currentOption.icon className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span className="text-sm font-medium">{currentOption.label}</span>
                </motion.span>
                <motion.span
                  variants={buttonContentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <RiArrowDownSLine className="h-3.5 w-3.5 text-primary-foreground/70" aria-hidden="true" />
                </motion.span>
              </motion.button>
            ) : (
              /* Expanded: Menu Container */
              <motion.div
                key="menu"
                layoutId={layoutId}
                className="absolute top-0 left-0 w-[340px] overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg"
                transition={springTransition}
                style={{ borderRadius: 12 }}
              >
                {/* Blur in content */}
                <motion.div
                  variants={menuContentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {/* Current stage header */}
                  <div className="border-b border-border px-4 py-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Current stage</p>
                    <div className="mt-2 flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <currentOption.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          {currentOption.label}
                        </div>
                        {stageDescription && (
                          <p className="mt-1 text-xs text-muted-foreground">{stageDescription}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                        {stageLabel}
                      </Badge>
                    </div>
                  </div>

                  {/* Command menu */}
                  <Command>
                    <CommandInput placeholder="Search status..." />
                    <CommandList>
                      <CommandEmpty>No status available.</CommandEmpty>
                      {actionableOptions.length > 0 && (
                        <CommandGroup heading="Next steps">
                          {actionableOptions.map((option) => renderCommandItem(option, false))}
                        </CommandGroup>
                      )}
                      {lockedOptions.length > 0 && (
                        <CommandGroup heading="Other states">
                          {lockedOptions.map((option) => renderCommandItem(option, true))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </LayoutGroup>
  );
}
