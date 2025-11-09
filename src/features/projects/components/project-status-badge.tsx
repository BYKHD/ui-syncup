'use client'

import React from 'react'
import { Badge } from '@components/ui/badge'
import { RiArchiveLine, RiDeleteBinLine, RiCheckLine } from '@remixicon/react'

interface ProjectStatusBadgeProps {
  status: 'active' | 'archived' | 'deleted'
  className?: string
}

export function ProjectStatusBadge({ status, className }: ProjectStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'active':
        return {
          label: 'Active',
          variant: 'default' as const,
          icon: RiCheckLine,
          className: 'bg-green-100 text-green-800 hover:bg-green-100'
        }
      case 'archived':
        return {
          label: 'Archived',
          variant: 'secondary' as const,
          icon: RiArchiveLine,
          className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
        }
      case 'deleted':
        return {
          label: 'Deleted',
          variant: 'destructive' as const,
          icon: RiDeleteBinLine,
          className: 'bg-red-100 text-red-800 hover:bg-red-100'
        }
      default:
        return {
          label: 'Unknown',
          variant: 'outline' as const,
          icon: RiCheckLine,
          className: ''
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  // Don't show badge for active projects (default state)
  if (status === 'active') {
    return null
  }

  return (
    <Badge 
      variant={config.variant}
      className={`${config.className} ${className || ''}`}
    >
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  )
}