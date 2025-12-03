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
} from "@/components/ui/command"
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
          variant="secondary"
          role="combobox"
          aria-expanded={open}
          className={cn("aspect-square h-12 w-12 p-0", className)}
        >
          {React.createElement(getIconComponent(value), { className: "size-5" })}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search icons..." />
          <CommandList>
            <CommandEmpty>No icons found.</CommandEmpty>
            <CommandGroup>
              <div className="grid grid-cols-5 gap-2 p-2">
                {iconOptions.map((option) => {
                  const IconComponent = option.component
                  const isSelected = value === option.name

                  return (
                    <CommandItem
                      key={option.name}
                      value={option.label}
                      onSelect={() => handleSelect(option.name)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1 rounded-md p-2 text-xs cursor-pointer",
                        isSelected && "bg-accent text-accent-foreground"
                      )}
                      title={option.label}
                    >
                      <IconComponent className="size-5" />
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
