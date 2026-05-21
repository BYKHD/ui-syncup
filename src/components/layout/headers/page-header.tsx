import React from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  actionsSlot?: React.ReactNode
}

export default function PageHeader({
  title,
  description,
  actionsSlot,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-base text-muted-foreground">{description}</p>
        )}
      </div>
      {actionsSlot && <div className="flex items-center gap-2">{actionsSlot}</div>}
    </div>
  )
}
