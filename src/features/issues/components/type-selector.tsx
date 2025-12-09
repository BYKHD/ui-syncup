'use client'

import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { IssueType } from '@/features/issues/types'
import { TYPE_OPTIONS } from '@/features/issues/config'
import { RiCheckLine } from '@remixicon/react'

interface TypeSelectorProps {
  value?: IssueType | null
  onChange: (type: IssueType) => void
  id?: string
}

export function TypeSelector({ value, onChange, id }: TypeSelectorProps) {
  const generatedId = useId()
  const triggerId = id ?? generatedId
  const [open, setOpen] = useState(false)
  const selected = value ?? null

  const selectedOption = selected ? TYPE_OPTIONS.find(option => option.value === selected) : undefined

  const handleTypeChange = (nextValue: IssueType) => {
    setOpen(false)
    onChange(nextValue)
  }

  const handleSelect = (currentValue: string) => {
    const match = TYPE_OPTIONS.find(option => option.value === currentValue)
    if (match) {
      handleTypeChange(match.value)
    }
  }

  return (
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
          >
            {selectedOption ? (
              <selectedOption.icon className="text-muted-foreground size-4" aria-hidden="true" />
            ) : null}
            <span className="truncate">
              {selectedOption ? selectedOption.label : 'Select type'}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="border-input w-full min-w-[var(--radix-popper-anchor-width)] p-0"
          align="start"
        >
          <Command>
            <CommandInput placeholder="Search type..." />
            <CommandList>
              <CommandEmpty>No type found.</CommandEmpty>
              <CommandGroup>
                {TYPE_OPTIONS.map(option => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    className="flex items-center justify-between gap-3"
                    onSelect={handleSelect}
                    aria-selected={selected === option.value}
                  >
                    <div className="flex items-center gap-2">
                      <option.icon className="text-muted-foreground size-4" aria-hidden="true" />
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      </div>
                    </div>
                    {selected === option.value ? (
                      <RiCheckLine className="text-primary size-4" aria-hidden="true" />
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
