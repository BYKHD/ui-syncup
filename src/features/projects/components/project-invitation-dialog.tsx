'use client'

import React from 'react'
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
  projectName: string
  email: string
  role: 'editor' | 'member' | 'viewer'
  errors?: {
    email?: string
    role?: string
  }
  isSubmitting?: boolean
  submittingError?: string | null
  onEmailChange: (email: string) => void
  onRoleChange: (role: 'editor' | 'member' | 'viewer') => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  onCancel: () => void
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

export function ProjectInvitationDialog({
  open,
  onOpenChange,
  projectName,
  email,
  role,
  errors = {},
  isSubmitting = false,
  submittingError = null,
  onEmailChange,
  onRoleChange,
  onSubmit,
  onCancel
}: ProjectInvitationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite to {projectName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-4">
            {/* Email Input */}
            <Field>
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
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
              <Select value={role} onValueChange={onRoleChange}>
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
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
