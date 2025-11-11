/**
 * WorkflowControl Component
 * 
 * A status transition control for issue workflow management with validation,
 * confirmation dialogs, and smooth animations.
 * 
 * Features:
 * - Validates status transitions based on current state
 * - Shows confirmation dialog for destructive actions (e.g., archiving)
 * - Provides visual feedback with loading states and animations
 * - Displays toast notifications for success/error states
 * - Supports optimistic updates with error rollback
 * 
 * @example
 * ```tsx
 * import { WorkflowControl } from '@/src/features/issues/components/workflow-control';
 * 
 * function IssueDetails() {
 *   const [issue, setIssue] = useState<IssueDetailData>(...);
 *   const permissions = useIssuePermissions(issue);
 * 
 *   const handleStatusChange = async (newStatus: IssueStatus) => {
 *     // Optimistic update
 *     const previousStatus = issue.status;
 *     setIssue({ ...issue, status: newStatus });
 * 
 *     try {
 *       await fetch(`/api/issues/${issue.id}`, {
 *         method: 'PATCH',
 *         body: JSON.stringify({ field: 'status', value: newStatus })
 *       });
 *     } catch (error) {
 *       // Rollback on error
 *       setIssue({ ...issue, status: previousStatus });
 *       throw error;
 *     }
 *   };
 * 
 *   return (
 *     <WorkflowControl
 *       currentStatus={issue.status}
 *       canChangeStatus={permissions.canChangeStatus}
 *       onStatusChange={handleStatusChange}
 *     />
 *   );
 * }
 * ```
 */

'use client';

import { useId, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/src/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/src/components/ui/command';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/src/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/src/components/ui/popover';
import { PermissionTooltip } from '@/src/components/shared/PermissionGuard';
import type { IssueStatus, WorkflowControlProps } from '@/features/issues/types';
import { STATUS_TRANSITIONS } from '@/features/issues/types';
import { DEFAULT_STATUS_ICON, STATUS_OPTIONS } from '@/src/config/issue-options';
import { RiCheckLine, RiLoader4Line } from '@remixicon/react';
import { toast } from 'sonner';
import { issueFeedback } from '@/src/lib/feedback';

// Statuses that require confirmation before transition
const REQUIRES_CONFIRMATION: IssueStatus[] = ['archived'];

interface ExtendedWorkflowControlProps extends WorkflowControlProps {
  id?: string;
  issue?: any; // For permission checking
}

export function WorkflowControl({
  currentStatus,
  onStatusChange,
  isLoading: externalLoading = false,
  disabled = false,
  id,
  issue
}: ExtendedWorkflowControlProps) {
  const generatedId = useId();
  const triggerId = id ?? generatedId;
  const [open, setOpen] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    targetStatus: IssueStatus | null;
  }>({ open: false, targetStatus: null });

  const isLoading = externalLoading || internalLoading;

  const currentOption = STATUS_OPTIONS.find(option => option.value === currentStatus);
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || [];
  const availableOptions = STATUS_OPTIONS.filter(option =>
    allowedTransitions.includes(option.value)
  );

  const handleStatusChange = async (newStatus: IssueStatus) => {
    // Check if this transition requires confirmation
    if (REQUIRES_CONFIRMATION.includes(newStatus)) {
      setOpen(false);
      setConfirmDialog({ open: true, targetStatus: newStatus });
      return;
    }

    await performStatusChange(newStatus);
  };

  const performStatusChange = async (newStatus: IssueStatus) => {
    setInternalLoading(true);
    setOpen(false);

    try {
      await onStatusChange(newStatus);
      
      const newOption = STATUS_OPTIONS.find(opt => opt.value === newStatus);
      issueFeedback.statusChangeSuccess(newOption?.label || newStatus);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to update status');
      issueFeedback.updateError(
        'status',
        err,
        () => performStatusChange(newStatus)
      );
    } finally {
      setInternalLoading(false);
    }
  };

  const handleConfirmStatusChange = async () => {
    if (confirmDialog.targetStatus) {
      setConfirmDialog({ open: false, targetStatus: null });
      await performStatusChange(confirmDialog.targetStatus);
    }
  };

  const handleCancelConfirmation = () => {
    setConfirmDialog({ open: false, targetStatus: null });
  };

  const handleSelect = (value: string) => {
    const match = STATUS_OPTIONS.find(option => option.value === value);
    if (match && allowedTransitions.includes(match.value)) {
      handleStatusChange(match.value);
    }
  };

  const isDisabled = disabled || isLoading || !canChangeStatus || availableOptions.length === 0;

  // If user doesn't have permission, show tooltip
  if (!canChangeStatus && !disabled) {
    return (
      <div className="w-fit">
        <PermissionTooltip
          issue={issue}
          permission="canChangeStatus"
          tooltipContent="You don't have permission to change the status of this issue"
          asChild
        >
          <Button
            id={triggerId}
            type="button"
            className="flex w-full items-center justify-start gap-2 opacity-60 cursor-not-allowed"
            size="sm"
            variant="secondary"
            disabled
          >
            <div className="flex items-center gap-2">
              {(() => {
                const IconComponent = currentOption?.icon ?? DEFAULT_STATUS_ICON;
                return <IconComponent className="text-muted-foreground size-4" aria-hidden="true" />;
              })()}
              <span className="truncate">
                {currentOption ? currentOption.label : 'Unknown status'}
              </span>
            </div>
          </Button>
        </PermissionTooltip>
      </div>
    );
  }

  return (
    <>
      <div className="w-fit">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={triggerId}
              type="button"
              className="flex w-full items-center justify-start gap-2"
              size="sm"
              variant="secondary"
              role="combobox"
              aria-expanded={open}
              aria-haspopup="listbox"
              disabled={isDisabled}
            >
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <RiLoader4Line className="text-muted-foreground size-4 animate-spin" aria-hidden="true" />
                  </motion.div>
                ) : (
                  <motion.div
                    key={currentStatus}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {(() => {
                      const IconComponent = currentOption?.icon ?? DEFAULT_STATUS_ICON;
                      return <IconComponent className="text-muted-foreground size-4" aria-hidden="true" />;
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>
              <span className="truncate">
                {currentOption ? currentOption.label : 'Unknown status'}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="border-input w-full min-w-[var(--radix-popper-anchor-width)] p-0"
            align="start"
          >
            <Command>
              <CommandInput placeholder="Change status..." />
              <CommandList>
                {availableOptions.length === 0 ? (
                  <CommandEmpty>No status transitions available.</CommandEmpty>
                ) : (
                  <CommandGroup>
                    {availableOptions.map(option => (
                      <CommandItem
                        key={option.value}
                        value={option.value}
                        className="flex items-center justify-between gap-3"
                        onSelect={handleSelect}
                        aria-selected={currentStatus === option.value}
                      >
                        <div className="flex items-center gap-2">
                          <option.icon className="text-muted-foreground size-4" aria-hidden="true" />
                          {option.label}
                        </div>
                        {currentStatus === option.value ? (
                          <RiCheckLine className="text-primary size-4" aria-hidden="true" />
                        ) : null}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && handleCancelConfirmation()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.targetStatus === 'archived' ? (
                <>
                  Are you sure you want to archive this issue? Archived issues are hidden from the main view
                  and cannot be modified further.
                </>
              ) : (
                <>
                  Are you sure you want to change the status to{' '}
                  {STATUS_OPTIONS.find(opt => opt.value === confirmDialog.targetStatus)?.label}?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelConfirmation}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmStatusChange}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
