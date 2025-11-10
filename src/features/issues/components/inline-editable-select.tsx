'use client';

import React, { useState } from 'react';
import { RiCheckLine, RiArrowDownSLine, RiLoader4Line } from '@remixicon/react';
import { Button } from '@/src/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/src/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/src/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/src/components/ui/tooltip';
import { toast } from 'sonner';
import { issueFeedback } from '@/src/lib/feedback';
import { cn } from '@/src/lib/utils';

interface SelectOption {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface InlineEditableSelectProps {
  value: string;
  options: SelectOption[];
  onSave: (value: string) => Promise<void>;
  canEdit: boolean;
  placeholder?: string;
  className?: string;
  displayClassName?: string;
  renderValue?: (option: SelectOption) => React.ReactNode;
}

export function InlineEditableSelect({
  value,
  options,
  onSave,
  canEdit,
  placeholder = 'Select option',
  className,
  displayClassName,
  renderValue
}: InlineEditableSelectProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedOption = options.find(option => option.value === value);

  const handleSelect = async (newValue: string) => {
    if (newValue === value) {
      setOpen(false);
      return;
    }

    setIsSaving(true);
    setOpen(false);

    try {
      await onSave(newValue);
      
      const newOption = options.find(opt => opt.value === newValue);
      toast.success('Updated', {
        description: `Changed to ${newOption?.label || newValue}`,
        duration: 2000,
        action: {
          label: 'Undo',
          onClick: () => handleUndo()
        }
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save';
      toast.error('Failed to update', {
        description: errorMessage
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUndo = async () => {
    try {
      await onSave(value);
      toast.success('Undone');
    } catch (err) {
      toast.error('Failed to undo');
    }
  };

  if (!canEdit) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('text-sm cursor-not-allowed opacity-75', displayClassName)}>
            {renderValue && selectedOption ? renderValue(selectedOption) : selectedOption?.label || placeholder}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>You don&apos;t have permission to edit this field</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className={cn('w-fit', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'h-auto justify-start p-2 hover:bg-accent/50 -mx-2',
              displayClassName
            )}
            disabled={isSaving}
            data-editable="true"
          >
            <div className="flex items-center gap-2">
              {isSaving ? (
                <RiLoader4Line className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {renderValue && selectedOption ? (
                    renderValue(selectedOption)
                  ) : (
                    <>
                      {selectedOption?.icon && (
                        <selectedOption.icon className="h-4 w-4" />
                      )}
                      <span className="text-sm">
                        {selectedOption?.label || placeholder}
                      </span>
                    </>
                  )}
                  <RiArrowDownSLine className="h-3 w-3 opacity-50" />
                </>
              )}
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} />
            <CommandList>
              <CommandEmpty>No options found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleSelect(option.value)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {option.icon && <option.icon className="h-4 w-4" />}
                      {option.label}
                    </div>
                    {value === option.value && (
                      <RiCheckLine className="h-4 w-4" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}