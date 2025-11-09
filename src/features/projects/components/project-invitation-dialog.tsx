'use client'

import React, { useState } from 'react'
import { Button } from '@components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@components/ui/dialog'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select'
import { Field, FieldDescription } from '@components/ui/field'
import { RiMailSendLine } from '@remixicon/react'

interface ProjectInvitationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName: string
  onInvitationSent?: () => void
}

type FormErrors = {
  email?: string
  role?: string
}

export function ProjectInvitationDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  onInvitationSent
}: ProjectInvitationDialogProps) {
  const [formData, setFormData] = useState({
    email: '',
    role: 'member' as 'editor' | 'member' | 'viewer'
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittingError, setSubmittingError] = useState<string | null>(null)

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
    setSubmittingError(null)
  }

  const validateForm = () => {
    const newErrors: FormErrors = {}

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.role) {
      newErrors.role = 'Please select a role'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setSubmittingError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          role: formData.role
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        
        if (errorData.error === 'USER_NOT_FOUND') {
          setErrors({ email: errorData.message })
          return
        }
        
        if (errorData.error === 'ALREADY_MEMBER') {
          setErrors({ email: 'This user is already a member of the project' })
          return
        }
        
        if (errorData.error === 'INVITATION_EXISTS') {
          setErrors({ email: 'This user already has a pending invitation' })
          return
        }

        throw new Error(errorData.message || 'Failed to send invitation')
      }

      // Reset form and close dialog
      setFormData({ email: '', role: 'member' })
      setErrors({})
      onOpenChange(false)
      onInvitationSent?.()
    } catch (error) {
      console.error('Error sending invitation:', error)
      setSubmittingError(error instanceof Error ? error.message : 'Failed to send invitation. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setFormData({ email: '', role: 'member' })
    setErrors({})
    setSubmittingError(null)
    onOpenChange(false)
  }

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'editor':
        return 'Can invite members, create and edit issues, and comment'
      case 'member':
        return 'Can view project content and comment on issues'
      case 'viewer':
        return 'Can only view project content (read-only access)'
      default:
        return ''
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite to {projectName}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {/* Email Input */}
            <Field>
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter email address"
                className={errors.email ? 'border-destructive' : ''}
                autoComplete="email"
              />
              <FieldDescription className={errors.email ? 'text-destructive' : ''}>
                {errors.email || 'The user must have an existing account to receive invitations'}
              </FieldDescription>
            </Field>

            {/* Role Selection */}
            <Field>
              <Label htmlFor="invite-role">Role</Label>
              <Select 
                value={formData.role} 
                onValueChange={(value) => handleInputChange('role', value)}
              >
                <SelectTrigger className={errors.role ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Editor</span>
                      <span className="text-xs text-muted-foreground">Can invite members and edit content</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="member">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Member</span>
                      <span className="text-xs text-muted-foreground">Can view and comment on content</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Viewer</span>
                      <span className="text-xs text-muted-foreground">Read-only access to project</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <FieldDescription className={errors.role ? 'text-destructive' : ''}>
                {errors.role || getRoleDescription(formData.role)}
              </FieldDescription>
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <RiMailSendLine className="h-4 w-4" />
              {isSubmitting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </form>
        
        {submittingError && (
          <p className="text-sm text-destructive mt-2">{submittingError}</p>
        )}
      </DialogContent>
    </Dialog>
  )
}