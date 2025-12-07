'use client';

import { useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { STATUS_OPTIONS } from '@/features/issues/config';
import { ISSUE_WORKFLOW } from '@/features/issues/config';
import type { IssueStatus } from '@/features/issues/types';
import { STATUS_TRANSITIONS } from '@/features/issues/types';
import { cn } from '@/lib/utils';
import { RiArrowDownSLine, RiCheckLine, RiLoader4Line, RiShieldKeyholeLine } from '@remixicon/react';
import { toast } from 'sonner';

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

export function StatusSelector({
  value,
  onChange,
  canChange = true,
  disabled = false,
  id,
  className,
}: StatusSelectorProps) {
  const generatedId = useId();
  const triggerId = id ?? `status-selector-${generatedId}`;
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  const currentIndex = Math.max(statusOrder.indexOf(value), 0);
  const denominator = Math.max(statusOrder.length - 1, 1);
  const progressPercent = Math.min(100, Math.max(0, (currentIndex / denominator) * 100));

  const stage = ISSUE_WORKFLOW[value]?.stage;
  const stageLabel = formatStageLabel(stage);
  const stageDescription = ISSUE_WORKFLOW[value]?.description;

  const handleStatusChange = async (nextStatus: IssueStatus) => {
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
  };

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
            <option.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
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

  const triggerButton = (
    <Button
      id={triggerId}
      type="button"
      variant="default"
      size="lg"
      className={cn(
        'min-w-[9rem] justify-between gap-3 border border-border text-left',
        !canChange && 'opacity-80',
      )}
      aria-label={`Current status: ${currentOption.label}`}
      aria-haspopup="listbox"
      aria-expanded={open}
      disabled={disabled || isSaving}
    >
      <span className="flex items-center gap-2">
        {isSaving ? (
          <RiLoader4Line className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <currentOption.icon className="h-4 w-4" aria-hidden="true" />
        )}
        <span className="text-sm font-medium">{currentOption.label}</span>
      </span>
      <RiArrowDownSLine className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
    </Button>
  );

  return (
    <div className={cn('flex min-w-[10rem] flex-1 flex-col gap-1', className)}>
      <span className="sr-only text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Status
      </span>
      <div className="flex flex-wrap items-center gap-3">
        <Popover open={open && !disabled} onOpenChange={setOpen}>
          {canChange ? (
            <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                You need edit access to move this issue forward.
              </TooltipContent>
            </Tooltip>
          )}
          <PopoverContent
            className="w-[340px] p-0"
            align="end"
            collisionPadding={16}
          >
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
          </PopoverContent>
        </Popover>


      </div>
    </div>
  );
}
