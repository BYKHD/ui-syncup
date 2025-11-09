'use client'

import React, { useState, useEffect } from 'react'
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
  onProjectUpdated?: (project: Project) => void
  children?: React.ReactNode
}

type FormErrors = { 
  name?: string
  description?: string
}

export function ProjectSettingsDialog({ 
  project, 
  userRole, 
  onProjectUpdated, 
  children 
}: ProjectSettingsDialogProps) {
  const [open, setOpen] = useState(false)
  const [showVisibilityConfirm, setShowVisibilityConfirm] = useState(false)
  const [pendingVisibility, setPendingVisibility] = useState<'private' | 'public' | null>(null)
  const [formData, setFormData] = useState({
    name: project.name,
    description: project.description || '',
    visibility: project.visibility
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittingError, setSubmittingError] = useState<string | null>(null)

  // Reset form when project changes or dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        name: project.name,
        description: project.description || '',
        visibility: project.visibility
      })
      setErrors({})
      setSubmittingError(null)
    }
  }, [project, open])

  const canEditSettings = userRole === 'owner'

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleVisibilityChange = (newVisibility: 'private' | 'public') => {
    if (newVisibility !== project.visibility) {
      setPendingVisibility(newVisibility)
      setShowVisibilityConfirm(true)
    }
  }

  const confirmVisibilityChange = () => {
    if (pendingVisibility) {
      setFormData(prev => ({ ...prev, visibility: pendingVisibility }))
    }
    setShowVisibilityConfirm(false)
    setPendingVisibility(null)
  }

  const cancelVisibilityChange = () => {
    setShowVisibilityConfirm(false)
    setPendingVisibility(null)
  }

  const validateForm = () => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required'
    } else if (formData.name.length < 3) {
      newErrors.name = 'Project name must be at least 3 characters'
    } else if (formData.name.length > 100) {
      newErrors.name = 'Project name must be 100 characters or less'
    }

    if (formData.description.length > 500) {
      newErrors.description = 'Project description must be 500 characters or less'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const hasChanges = () => {
    return (
      formData.name !== project.name ||
      formData.description !== (project.description || '') ||
      formData.visibility !== project.visibility
    )
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!validateForm() || !hasChanges()) {
      return
    }

    setIsSubmitting(true)
    setSubmittingError(null)

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          visibility: formData.visibility
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update project')
      }

      const result = await response.json()
      onProjectUpdated?.(result.project)
      setOpen(false)
    } catch (error) {
      console.error('Error updating project', error)
      setSubmittingError(error instanceof Error ? error.message : 'Failed to update project. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      name: project.name,
      description: project.description || '',
      visibility: project.visibility
    })
    setErrors({})
    setSubmittingError(null)
    setOpen(false)
  }

  if (!canEditSettings) {
    return null // Don't render if user can't edit settings
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
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
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {/* Project Name */}
              <Field>
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
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
                  onChange={(e) => handleInputChange('description', e.target.value)}
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
                        handleVisibilityChange(checked ? 'public' : 'private')
                      }
                    />
                    <RiGlobalLine className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </Field>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !hasChanges()}
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
      <AlertDialog open={showVisibilityConfirm} onOpenChange={setShowVisibilityConfirm}>
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
            <AlertDialogCancel onClick={cancelVisibilityChange}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmVisibilityChange}>
              Change Visibility
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}