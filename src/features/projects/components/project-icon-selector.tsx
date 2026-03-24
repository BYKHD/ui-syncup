'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { iconOptions, getIconComponent } from '../config/icons'

interface ProjectIconSelectorProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function ProjectIconSelector({ value, onChange, className }: ProjectIconSelectorProps) {
  const [open, setOpen] = useState(false)

  const handleSelect = (iconName: string) => {
    onChange(iconName)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          role="combobox"
          aria-expanded={open}
          aria-label="Select project icon"
          className={cn('aspect-square h-12 w-12 p-0', className)}
        >
          {React.createElement(getIconComponent(value), { className: 'size-5' })}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search icons..." />
          <CommandList className="max-h-[220px]">
            <CommandEmpty>No icons found.</CommandEmpty>
            <CommandGroup>
              <div className="grid grid-cols-8 gap-0.5 p-1">
                {iconOptions.map((option) => {
                  const IconComponent = option.component
                  const isSelected = value === option.name
                  return (
                    <CommandItem
                      key={option.name}
                      value={option.label}
                      onSelect={() => handleSelect(option.name)}
                      title={option.label}
                      className={cn(
                        'flex aspect-square cursor-pointer items-center justify-center rounded-md p-1.5 aria-selected:bg-accent',
                        isSelected && 'bg-accent text-accent-foreground'
                      )}
                    >
                      <IconComponent className="size-4" />
                    </CommandItem>
                  )
                })}
              </div>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
