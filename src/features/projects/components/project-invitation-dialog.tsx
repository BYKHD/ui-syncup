'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Field, FieldDescription } from '@/components/ui/field'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { RiMailSendLine, RiUserLine } from '@remixicon/react'
import { toast } from 'sonner'
import { useTeamMemberSuggestions, type TeamMemberSuggestion } from '../hooks/use-team-member-suggestions'
import { cn } from '@/lib/utils'

interface ProjectInvitationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  teamId: string
  projectName: string
  onInvitationSent?: () => void
}

function getRoleDescription(role: string) {
  switch (role) {
    case 'editor':
      return 'Can invite members, create and edit issues, and comment'
    case 'developer':
      return 'Can update issue status and comment on issues'
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
  if (!['editor', 'developer', 'viewer'].includes(role)) {
    return 'Invalid role selected'
  }
  return null
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function ProjectInvitationDialog({
  open,
  onOpenChange,
  projectId,
  teamId,
  projectName,
  onInvitationSent
}: ProjectInvitationDialogProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'editor' | 'developer' | 'viewer'>('developer')
  const [errors, setErrors] = useState<{ email?: string; role?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Fetch team member suggestions
  const { suggestions, isLoading: isLoadingSuggestions } = useTeamMemberSuggestions({
    teamId,
    query: email,
    excludeProjectId: projectId,
    enabled: open && showSuggestions && email.length >= 1,
  })

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setEmail('')
      setRole('developer')
      setErrors({})
      setSubmitError(null)
      setShowSuggestions(false)
      setSelectedIndex(0)
    }
  }, [open])

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(0)
  }, [suggestions])

  const handleEmailChange = (value: string) => {
    setEmail(value)
    setShowSuggestions(true)
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: undefined }))
    }
    setSubmitError(null)
  }

  const handleSelectSuggestion = (suggestion: TeamMemberSuggestion) => {
    setEmail(suggestion.email)
    setShowSuggestions(false)
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: undefined }))
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % suggestions.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length)
        break
      case 'Enter':
        if (suggestions[selectedIndex]) {
          e.preventDefault()
          handleSelectSuggestion(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        break
    }
  }

  const handleRoleChange = (value: 'editor' | 'developer' | 'viewer') => {
    setRole(value)
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
          errorData?.error?.message ||
          errorData?.message ||
          `Failed to send invitation (${response.status})`
        )
      }

      // Success - close dialog and notify parent
      toast.success('Invitation sent successfully')
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
            {/* Email Input with Autocomplete */}
            <Field>
              <Label htmlFor="invite-email">Email Address</Label>
              <div className="relative">
                <Input
                  ref={inputRef}
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => email.length >= 1 && setShowSuggestions(true)}
                  onBlur={() => {
                    // Delay to allow clicking on suggestions
                    setTimeout(() => setShowSuggestions(false), 200)
                  }}
                  placeholder="Search team members or enter email"
                  className={errors.email ? 'border-destructive' : ''}
                  autoComplete="off"
                  disabled={isSubmitting}
                />
                
                {/* Suggestions Dropdown */}
                {showSuggestions && (email.length >= 1) && (
                  <div 
                    ref={suggestionsRef}
                    className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-md border bg-popover p-1 shadow-md"
                  >
                    {isLoadingSuggestions ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        Searching...
                      </div>
                    ) : suggestions.length > 0 ? (
                      <>
                        <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                          Team Members
                        </div>
                        {suggestions.map((suggestion, index) => (
                          <button
                            key={suggestion.userId}
                            type="button"
                            className={cn(
                              "flex w-full items-center gap-3 rounded-sm px-2 py-2 text-sm outline-none cursor-pointer",
                              index === selectedIndex
                                ? "bg-accent text-accent-foreground"
                                : "hover:bg-accent hover:text-accent-foreground"
                            )}
                            onMouseEnter={() => setSelectedIndex(index)}
                            onClick={() => handleSelectSuggestion(suggestion)}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={suggestion.image || undefined} alt={suggestion.name} />
                              <AvatarFallback className="text-xs">
                                {getInitials(suggestion.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col items-start min-w-0">
                              <span className="font-medium truncate max-w-[250px]">
                                {suggestion.name}
                              </span>
                              <span className="text-xs text-muted-foreground truncate max-w-[250px]">
                                {suggestion.email}
                              </span>
                            </div>
                          </button>
                        ))}
                      </>
                    ) : email.includes('@') ? (
                      <div className="px-3 py-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <RiUserLine className="h-4 w-4" />
                          <span>Press Enter to invite <strong>{email}</strong></span>
                        </div>
                      </div>
                    ) : (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        No team members found. Enter a full email address.
                      </div>
                    )}
                  </div>
                )}
              </div>
              <FieldDescription className={errors.email ? 'text-destructive' : ''}>
                {errors.email || 'Search your team or enter an email address'}
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
                  <SelectItem value="developer">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Developer</span>
                      <span className="text-xs text-muted-foreground">Can update status and comment</span>
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
