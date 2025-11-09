'use client'

import React from 'react'
import { Button } from '@components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@components/ui/alert-dialog'
import { RiLogoutBoxLine } from '@remixicon/react'

interface ProjectLeaveButtonProps {
  projectName: string
  userRole: 'owner' | 'editor' | 'member' | 'viewer'
  isLeaving?: boolean
  error?: string | null
  onLeave: () => void
  children?: React.ReactNode
}

function getLeaveWarning(projectName: string, userRole: string) {
  if (userRole === 'owner') {
    return 'As the project owner, you cannot leave unless you transfer ownership to another member first.'
  }
  return `Are you sure you want to leave "${projectName}"? You will lose access to all project content and will need to be re-invited to rejoin.`
}

export function ProjectLeaveButton({
  projectName,
  userRole,
  isLeaving = false,
  error = null,
  onLeave,
  children
}: ProjectLeaveButtonProps) {
  return (
    <>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          {children || (
            <Button variant="outline" size="sm">
              <RiLogoutBoxLine className="h-4 w-4" />
              Leave Project
            </Button>
          )}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Project</AlertDialogTitle>
            <AlertDialogDescription>
              {getLeaveWarning(projectName, userRole)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onLeave}
              disabled={isLeaving || userRole === 'owner'}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLeaving ? 'Leaving...' : 'Leave Project'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {error && (
        <p className="text-sm text-destructive mt-2">{error}</p>
      )}
    </>
  )
}
