'use client'

import React, { useState } from 'react'
import { Button } from '@components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@components/ui/alert-dialog'
import { RiLogoutBoxLine } from '@remixicon/react'

interface ProjectLeaveButtonProps {
  projectId: string
  projectName: string
  userRole: 'owner' | 'editor' | 'member' | 'viewer'
  onLeft?: () => void
  children?: React.ReactNode
}

export function ProjectLeaveButton({ 
  projectId, 
  projectName, 
  userRole,
  onLeft,
  children 
}: ProjectLeaveButtonProps) {
  const [isLeaving, setIsLeaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLeave = async () => {
    setIsLeaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to leave project')
      }

      onLeft?.()
    } catch (error) {
      console.error('Error leaving project:', error)
      setError(error instanceof Error ? error.message : 'Failed to leave project')
    } finally {
      setIsLeaving(false)
    }
  }

  const getLeaveWarning = () => {
    if (userRole === 'owner') {
      return 'As the project owner, you cannot leave unless you transfer ownership to another member first.'
    }
    return `Are you sure you want to leave "${projectName}"? You will lose access to all project content and will need to be re-invited to rejoin.`
  }

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
              {getLeaveWarning()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleLeave}
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