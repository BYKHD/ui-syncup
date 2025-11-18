'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Field, FieldDescription } from '@/components/ui/field'
import { RiMailSendLine } from '@remixicon/react'

interface ProjectInvitationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName: string
  onInvitationSent?: () => void
}

function getRoleDescription(role: string) {
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

function validateEmail(email: string): string | null {
  if (!email) {
    return 'Email is required'
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Enter a valid email address'
  }
  return null
}

function validateRole(role: string): string | null {
  if (!role) {
    return 'Role is required'
  }
  if (!['editor', 'member', 'viewer'].includes(role)) {
    return 'Invalid role selected'
  }
  return null
}

export function ProjectInvitationDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  onInvitationSent
}: ProjectInvitationDialogProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'editor' | 'member' | 'viewer'>('member')
  const [errors, setErrors] = useState<{ email?: string; role?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      // Reset on close
      setEmail('')
      setRole('member')
      setErrors({})
      setSubmitError(null)
    }
  }, [open])

  const handleEmailChange = (value: string) => {
    setEmail(value)
    // Clear email error on change
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: undefined }))
    }
    setSubmitError(null)
  }

  const handleRoleChange = (value: 'editor' | 'member' | 'viewer') => {
    setRole(value)
    // Clear role error on change
    if (errors.role) {
      setErrors(prev => ({ ...prev, role: undefined }))
    }
    setSubmitError(null)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // Validate form
    const emailError = validateEmail(email)
    const roleError = validateRole(role)

    if (emailError || roleError) {
      setErrors({
        email: emailError || undefined,
        role: roleError || undefined
      })
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim(),
          role
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(
          errorData?.message ||
          errorData?.error ||
          `Failed to send invitation (${response.status})`
        )
      }

      // Success - close dialog and notify parent
      onOpenChange(false)
      onInvitationSent?.()
    } catch (error) {
      console.error('Error sending invitation:', error)
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Failed to send invitation. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
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
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="Enter email address"
                className={errors.email ? 'border-destructive' : ''}
                autoComplete="email"
                disabled={isSubmitting}
              />
              <FieldDescription className={errors.email ? 'text-destructive' : ''}>
                {errors.email || 'The user must have an existing account to receive invitations'}
              </FieldDescription>
            </Field>

            {/* Role Selection */}
            <Field>
              <Label htmlFor="invite-role">Role</Label>
              <Select value={role} onValueChange={handleRoleChange} disabled={isSubmitting}>
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
                {errors.role || getRoleDescription(role)}
              </FieldDescription>
            </Field>
          </div>

          {submitError && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {submitError}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <RiMailSendLine className="h-4 w-4" />
              {isSubmitting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
