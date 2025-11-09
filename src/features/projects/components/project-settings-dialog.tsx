'use client'

import React from 'react'
import { Button } from '@components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@components/ui/dialog'
import { Input } from '@components/ui/input'
import { Textarea } from '@components/ui/textarea'
import { Field, FieldDescription } from '@components/ui/field'
import { Switch } from '@components/ui/switch'
import { Label } from '@components/ui/label'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@components/ui/alert-dialog'
import { RiSettingsLine, RiLockLine, RiGlobalLine, RiSaveLine } from '@remixicon/react'

interface Project {
  id: string
  name: string
  description: string | null
  visibility: 'private' | 'public'
  status: 'active' | 'archived' | 'deleted'
}

interface ProjectSettingsDialogProps {
  project: Project
  userRole: 'owner' | 'editor' | 'member' | 'viewer' | null
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: {
    name: string
    description: string
    visibility: 'private' | 'public'
  }
  errors?: {
    name?: string
    description?: string
  }
  isSubmitting?: boolean
  submittingError?: string | null
  showVisibilityConfirm: boolean
  pendingVisibility: 'private' | 'public' | null
  onInputChange: (field: string, value: string) => void
  onVisibilityChange: (visibility: 'private' | 'public') => void
  onConfirmVisibilityChange: () => void
  onCancelVisibilityChange: () => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  onCancel: () => void
  hasChanges: boolean
  children?: React.ReactNode
}

export function ProjectSettingsDialog({
  project,
  userRole,
  open,
  onOpenChange,
  formData,
  errors = {},
  isSubmitting = false,
  submittingError = null,
  showVisibilityConfirm,
  pendingVisibility,
  onInputChange,
  onVisibilityChange,
  onConfirmVisibilityChange,
  onCancelVisibilityChange,
  onSubmit,
  onCancel,
  hasChanges,
  children
}: ProjectSettingsDialogProps) {
  const canEditSettings = userRole === 'owner'

  if (!canEditSettings) {
    return null
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          {children || (
            <Button variant="outline" size="sm">
              <RiSettingsLine className="h-4 w-4" />
              Settings
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Project Settings</DialogTitle>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-4">
              {/* Project Name */}
              <Field>
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  value={formData.name}
                  onChange={(e) => onInputChange('name', e.target.value)}
                  placeholder="Enter project name"
                  maxLength={100}
                  className={errors.name ? 'border-destructive' : ''}
                />
                <FieldDescription className="flex justify-between text-xs text-muted-foreground">
                  <span className={errors.name ? 'text-destructive' : ''}>
                    {errors.name || 'Choose a clear, descriptive name'}
                  </span>
                  <span>{formData.name.length}/100</span>
                </FieldDescription>
              </Field>

              {/* Project Description */}
              <Field>
                <Label htmlFor="project-description">Description</Label>
                <Textarea
                  id="project-description"
                  value={formData.description}
                  onChange={(e) => onInputChange('description', e.target.value)}
                  placeholder="Describe what this project is about"
                  maxLength={500}
                  rows={3}
                  className={errors.description ? 'border-destructive' : ''}
                />
                <FieldDescription className="flex justify-between text-xs text-muted-foreground">
                  <span className={errors.description ? 'text-destructive' : ''}>
                    {errors.description || 'Brief description of the project goals'}
                  </span>
                  <span>{formData.description.length}/500</span>
                </FieldDescription>
              </Field>

              {/* Project Visibility */}
              <Field>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Project Visibility</Label>
                    <FieldDescription className="text-xs text-muted-foreground">
                      {formData.visibility === 'private'
                        ? 'Only invited members can access this project'
                        : 'All team members can see and join this project'
                      }
                    </FieldDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RiLockLine className="h-4 w-4 text-muted-foreground" />
                    <Switch
                      checked={formData.visibility === 'public'}
                      onCheckedChange={(checked) =>
                        onVisibilityChange(checked ? 'public' : 'private')
                      }
                    />
                    <RiGlobalLine className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </Field>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !hasChanges}
              >
                <RiSaveLine className="h-4 w-4" />
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>

          {submittingError && (
            <p className="text-sm text-destructive mt-2">{submittingError}</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Visibility Change Confirmation Dialog */}
      <AlertDialog open={showVisibilityConfirm} onOpenChange={(open) => !open && onCancelVisibilityChange()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Project Visibility</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingVisibility === 'public' ? (
                <>
                  You're about to make this project <strong>public</strong>. All team members will be able to see and join this project.
                </>
              ) : (
                <>
                  You're about to make this project <strong>private</strong>. Only invited members will be able to access this project. Existing members will retain their access.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onCancelVisibilityChange}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmVisibilityChange}>
              Change Visibility
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
