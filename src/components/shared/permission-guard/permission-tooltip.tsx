"use client"

import * as React from "react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface PermissionTooltipProps {
  children: React.ReactNode
  tooltipContent: React.ReactNode
  permission?: string
  asChild?: boolean
  className?: string
}

export function PermissionTooltip({
  children,
  tooltipContent,
  permission,
  asChild = false,
  className,
}: PermissionTooltipProps) {
  const trigger =
    asChild && React.isValidElement(children) ? children : <span>{children}</span>

  return (
    <Tooltip>
      <TooltipTrigger asChild={asChild}>{trigger}</TooltipTrigger>
      <TooltipContent
        side="top"
        align="center"
        className={cn(
          "w-fit max-w-xs rounded-md border border-border bg-popover px-3 py-1.5 text-xs text-muted-foreground shadow-lg",
          className,
        )}
      >
        <p>{tooltipContent}</p>
        {permission ? (
          <span className="mt-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
            {permission} required
          </span>
        ) : null}
      </TooltipContent>
    </Tooltip>
  )
}
