'use client'

import React, { useState } from 'react'
import { Button } from '@components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@components/ui/alert-dialog'
import { 
  RiMoreLine, 
  RiArchiveLine, 
  RiArchiveDrawerLine, 
  RiDeleteBinLine, 
  RiHistoryLine,
  RiSettingsLine
} from '@remixicon/react'

interface Project {
  id: string
  name: string
  status: 'active' | 'archived' | 'deleted'
  deletedAt?: Date | null
}

interface ProjectActionsMenuProps {
  project: Project
  userRole: 'owner' | 'editor' | 'member' | 'viewer' | null
  teamRole: 'owner' | 'admin' | 'editor' | 'member' | 'viewer'
  onProjectUpdated?: (project: Project) => void
  onOpenSettings?: () => void
}

type ActionType = 'archive' | 'unarchive' | 'delete' | 'recover' | 'permanent_delete'

export function ProjectActionsMenu({ 
  project, 
  userRole, 
  teamRole, 
  onProjectUpdated,
  onOpenSettings 
}: ProjectActionsMenuProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingAction, setPendingAction] = useState<ActionType | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const canArchive = project.status === 'active' && (userRole === 'owner' || ['owner', 'admin'].includes(teamRole))
  const canUnarchive = project.status === 'archived' && ['owner', 'admin'].includes(teamRole)
  const canDelete = project.status === 'active' && (userRole === 'owner' || ['owner', 'admin'].includes(teamRole))
  const canRecover = project.status === 'deleted' && ['owner', 'admin'].includes(teamRole)
  const canPermanentDelete = project.status === 'deleted' && teamRole === 'owner'
  const canEditSettings = userRole === 'owner'

  const isWithinRecoveryPeriod = () => {
    if (!project.deletedAt) return false
    const deletedDate = new Date(project.deletedAt)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return deletedDate >= thirtyDaysAgo
  }

  const handleAction = (action: ActionType) => {
    setPendingAction(action)
    setShowConfirmDialog(true)
  }

  const executeAction = async () => {
    if (!pendingAction) return

    setIsLoading(true)
    try {
      let endpoint = ''
      let method = 'POST'
      
      switch (pendingAction) {
        case 'archive':
          endpoint = `/api/projects/${project.id}/archive`
          break
        case 'unarchive':
          endpoint = `/api/projects/${project.id}/unarchive`
          break
        case 'delete':
          endpoint = `/api/projects/${project.id}`
          method = 'DELETE'
          break
        case 'recover':
          endpoint = `/api/projects/${project.id}/recover`
          break
        case 'permanent_delete':
          endpoint = `/api/projects/${project.id}?permanent=true`
          method = 'DELETE'
          break
      }

      const response = await fetch(endpoint, { method })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Action failed')
      }

      const result = await response.json()
      
      if (pendingAction === 'permanent_delete') {
        // For permanent delete, we might want to remove from list entirely
        onProjectUpdated?.({ ...project, status: 'deleted' })
      } else if (result.project) {
        onProjectUpdated?.(result.project)
      }
    } catch (error) {
      console.error('Action failed:', error)
      // You might want to show a toast notification here
    } finally {
      setIsLoading(false)
      setShowConfirmDialog(false)
      setPendingAction(null)
    }
  }

  const getActionTitle = () => {
    switch (pendingAction) {
      case 'archive':
        return 'Archive Project'
      case 'unarchive':
        return 'Unarchive Project'
      case 'delete':
        return 'Delete Project'
      case 'recover':
        return 'Recover Project'
      case 'permanent_delete':
        return 'Permanently Delete Project'
      default:
        return 'Confirm Action'
    }
  }

  const getActionDescription = () => {
    switch (pendingAction) {
      case 'archive':
        return `Are you sure you want to archive "${project.name}"? The project will become read-only but can be unarchived later.`
      case 'unarchive':
        return `Are you sure you want to unarchive "${project.name}"? The project will become active again.`
      case 'delete':
        return `Are you sure you want to delete "${project.name}"? The project will be hidden but can be recovered within 30 days.`
      case 'recover':
        return `Are you sure you want to recover "${project.name}"? The project will become active again.`
      case 'permanent_delete':
        return `Are you sure you want to permanently delete "${project.name}"? This action cannot be undone and will remove all project data including issues, comments, and attachments.`
      default:
        return 'This action cannot be undone.'
    }
  }

  const getActionButtonText = () => {
    if (isLoading) return 'Processing...'
    
    switch (pendingAction) {
      case 'archive':
        return 'Archive'
      case 'unarchive':
        return 'Unarchive'
      case 'delete':
        return 'Delete'
      case 'recover':
        return 'Recover'
      case 'permanent_delete':
        return 'Permanently Delete'
      default:
        return 'Confirm'
    }
  }

  // Don't show menu if user has no available actions
  const hasAnyAction = canArchive || canUnarchive || canDelete || canRecover || canPermanentDelete || canEditSettings

  if (!hasAnyAction) {
    return null
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <RiMoreLine className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canEditSettings && (
            <>
              <DropdownMenuItem onClick={onOpenSettings}>
                <RiSettingsLine className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          
          {canArchive && (
            <DropdownMenuItem onClick={() => handleAction('archive')}>
              <RiArchiveLine className="h-4 w-4 mr-2" />
              Archive
            </DropdownMenuItem>
          )}
          
          {canUnarchive && (
            <DropdownMenuItem onClick={() => handleAction('unarchive')}>
              <RiArchiveDrawerLine className="h-4 w-4 mr-2" />
              Unarchive
            </DropdownMenuItem>
          )}
          
          {canDelete && (
            <DropdownMenuItem 
              onClick={() => handleAction('delete')}
              className="text-destructive focus:text-destructive"
            >
              <RiDeleteBinLine className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          )}
          
          {canRecover && isWithinRecoveryPeriod() && (
            <DropdownMenuItem onClick={() => handleAction('recover')}>
              <RiHistoryLine className="h-4 w-4 mr-2" />
              Recover
            </DropdownMenuItem>
          )}
          
          {canPermanentDelete && (
            <DropdownMenuItem 
              onClick={() => handleAction('permanent_delete')}
              className="text-destructive focus:text-destructive"
            >
              <RiDeleteBinLine className="h-4 w-4 mr-2" />
              Delete Permanently
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getActionTitle()}</AlertDialogTitle>
            <AlertDialogDescription>
              {getActionDescription()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={executeAction}
              disabled={isLoading}
              className={pendingAction === 'permanent_delete' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {getActionButtonText()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}