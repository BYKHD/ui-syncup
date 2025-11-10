'use client';

import React, { useState } from 'react';
import { RiCheckLine, RiArrowDownSLine, RiLoader4Line, RiUserLine } from '@remixicon/react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/src/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/src/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/src/lib/utils';

interface UserOption {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

interface InlineEditableUserSelectProps {
  value: string | null;
  users: UserOption[];
  onSave: (userId: string | null) => Promise<void>;
  canEdit: boolean;
  placeholder?: string;
  allowUnassigned?: boolean;
  className?: string;
  displayClassName?: string;
}

function UserDisplay({ user, fallbackText = 'Unassigned' }: { user: UserOption | null; fallbackText?: string }) {
  if (!user) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <RiUserLine className="h-4 w-4" />
        <span className="text-sm">{fallbackText}</span>
      </div>
    );
  }

  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-6 w-6">
        <AvatarImage src={user.image || undefined} alt={user.name} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <span className="text-sm">{user.name}</span>
    </div>
  );
}

export function InlineEditableUserSelect({
  value,
  users,
  onSave,
  canEdit,
  placeholder = 'Select assignee',
  allowUnassigned = true,
  className,
  displayClassName
}: InlineEditableUserSelectProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedUser = users.find(user => user.id === value) || null;

  const handleSelect = async (newValue: string) => {
    const userId = newValue === 'unassigned' ? null : newValue;
    
    if (userId === value) {
      setOpen(false);
      return;
    }

    setIsSaving(true);
    setOpen(false);

    try {
      await onSave(userId);
      
      const newUser = userId ? users.find(u => u.id === userId) : null;
      toast.success('Assignee updated', {
        description: newUser ? `Assigned to ${newUser.name}` : 'Unassigned',
        duration: 2000,
        action: {
          label: 'Undo',
          onClick: () => handleUndo()
        }
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save';
      toast.error('Failed to update assignee', {
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
            <UserDisplay user={selectedUser} />
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
                  <UserDisplay user={selectedUser} />
                  <RiArrowDownSLine className="h-3 w-3 opacity-50" />
                </>
              )}
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[250px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search team members..." />
            <CommandList>
              <CommandEmpty>No team members found.</CommandEmpty>
              <CommandGroup>
                {allowUnassigned && (
                  <CommandItem
                    value="unassigned"
                    onSelect={() => handleSelect('unassigned')}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <RiUserLine className="h-4 w-4" />
                      <span>Unassigned</span>
                    </div>
                    {value === null && <RiCheckLine className="h-4 w-4" />}
                  </CommandItem>
                )}
                {users.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={user.id}
                    onSelect={() => handleSelect(user.id)}
                    className="flex items-center justify-between"
                  >
                    <UserDisplay user={user} />
                    {value === user.id && <RiCheckLine className="h-4 w-4" />}
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