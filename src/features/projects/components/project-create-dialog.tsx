'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldDescription } from '@/components/ui/field'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { RiAddLine, RiFolderFill, RiLockLine, RiGlobalLine } from '@remixicon/react'
import { ProjectIconSelector } from './project-icon-selector'
import { useTeam } from '@/hooks/use-team'

type ProjectPreview = {
  id: string
  name: string
  description: string
  icon: string | null
  progressPercent: number
  tickets: number
  ticketsDone: number
}

interface ProjectCreateDialogProps {
  children?: React.ReactNode
  onProjectAdded?: (project: ProjectPreview) => void
}

const KEY_PATTERN = /^[A-Z]{2,6}$/



export function ProjectCreateDialog({ children, onProjectAdded }: ProjectCreateDialogProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    key: '',
    name: '',
    desc: '',
    icon: 'RiFolderFill',
    visibility: 'public' as 'private' | 'public'
  })
  type FormErrors = { key?: string; name?: string; desc?: string }

  type ProjectPreview = {
    id: string
    name: string
    description: string
    icon: string | null
    progressPercent: number
    tickets: number
    ticketsDone: number
  }

  const [errors, setErrors] = useState<FormErrors>({})
  const [keyStatus, setKeyStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>(
    'idle'
  )
  const [keyHelper, setKeyHelper] = useState('Auto-generated from project name')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittingError, setSubmittingError] = useState<string | null>(null)
  const [isKeyManuallyEdited, setIsKeyManuallyEdited] = useState(false)
  const { currentTeam } = useTeam()

  // Auto-generate project key from name
  const generateKeyFromName = (name: string): string => {
    if (!name.trim()) return ''
    
    // Remove special characters and split into words
    const words = name
      .replace(/[^a-zA-Z\s]/g, '')
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0)
    
    if (words.length === 0) return ''
    
    // Take first letter of each word, up to 6 letters
    let key = words.map(word => word[0].toUpperCase()).join('').slice(0, 6)
    
    // If result is less than 2 chars, take first 2-6 chars of first word
    if (key.length < 2 && words[0]) {
      key = words[0].slice(0, 6).toUpperCase()
    }
    
    return key
  }

  const handleInputChange = (field: string, value: string) => {
    if (field === 'key') {
      const sanitized = value.replace(/[^a-zA-Z]/g, '').toUpperCase()
      setFormData(prev => ({ ...prev, key: sanitized }))
      setIsKeyManuallyEdited(true)
      // Reset status when manually editing
      setKeyStatus('idle')
      setKeyHelper('Press Tab or click away to validate')
    } else if (field === 'name') {
      setFormData(prev => ({ ...prev, name: value }))
      // Auto-generate key from name if not manually edited
      if (!isKeyManuallyEdited) {
        const autoKey = generateKeyFromName(value)
        setFormData(prev => ({ ...prev, key: autoKey }))
        if (autoKey) {
          setKeyHelper('Auto-generated (you can edit)')
        } else {
          setKeyHelper('Auto-generated from project name')
        }
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
    
    // Clear error when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleIconSelect = (iconName: string) => {
    setFormData(prev => ({ ...prev, icon: iconName }))
  }

  // Validate project key on blur
  const handleKeyBlur = async () => {
    if (!formData.key) {
      setKeyStatus('idle')
      setKeyHelper(isKeyManuallyEdited ? 'Use 2-6 uppercase letters' : 'Auto-generated from project name')
      return
    }

    if (!KEY_PATTERN.test(formData.key)) {
      setKeyStatus('invalid')
      setKeyHelper('')
      setErrors(prev => ({ ...prev, key: 'Project key must be 2-6 uppercase letters' }))
      return
    }

    try {
      setKeyStatus('checking')
      setKeyHelper('Checking availability...')
      setErrors(prev => ({ ...prev, key: undefined }))

      const response = await fetch(`/api/projects?projectKey=${encodeURIComponent(formData.key)}`)

      if (!response.ok) {
        // If API fails, don't block the user - validate on submit instead
        setKeyStatus('idle')
        setKeyHelper('Will validate on submit')
        return
      }

      const result = await response.json()

      if (result.exists) {
        setKeyStatus('taken')
        setKeyHelper('')
        setErrors(prev => ({ ...prev, key: 'Project key already exists. Try a different one.' }))
      } else {
        setKeyStatus('available')
        setKeyHelper('✓ Available')
      }
    } catch (error) {
      // Network error - fail gracefully
      console.error('Failed to validate project key', error)
      setKeyStatus('idle')
      setKeyHelper('Will validate on submit')
    }
  }

  const validateForm = () => {
    const newErrors: FormErrors = {}

    if (!formData.key.trim()) {
      newErrors.key = 'Project key is required'
    } else if (!KEY_PATTERN.test(formData.key)) {
      newErrors.key = 'Project key must be 2-6 uppercase letters'
    } else if (keyStatus === 'taken') {
      newErrors.key = 'Project key already exists'
    } else if (keyStatus === 'checking') {
      newErrors.key = 'Please wait while the project key is validated'
    }
    
    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required'
    } else if (formData.name.length > 32) {
      newErrors.name = 'Project name must be 32 characters or less'
    }
    
    if (!formData.desc.trim()) {
      newErrors.desc = 'Project description is required'
    } else if (formData.desc.length > 140) {
      newErrors.desc = 'Project description must be 140 characters or less'
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
      if (!currentTeam?.id) {
        throw new Error('No active team selected')
      }

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          key: formData.key.trim(),
          name: formData.name.trim(),
          description: formData.desc.trim(),
          icon: formData.icon,
          visibility: formData.visibility,
          teamId: currentTeam.id
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        
        // Handle duplicate key error specifically
        // Handle duplicate key error specifically
        if (response.status === 409 || errorData?.error?.code === 'DUPLICATE_KEY' || errorData?.error?.message?.includes('key')) {
          setKeyStatus('taken')
          setErrors(prev => ({ ...prev, key: `Key "${formData.key}" is already in use. Try "${formData.key}2" or a different key.` }))
          setIsSubmitting(false)
          return
        }
        
        throw new Error(errorData?.error?.message || 'Failed to create project')
      }

      const result = await response.json()

      const newProject: ProjectPreview = {
        id: result.id,
        name: formData.name.trim(),
        description: formData.desc.trim(),
        icon: formData.icon,
        progressPercent: 0,
        tickets: 0,
        ticketsDone: 0
      }

      onProjectAdded?.(newProject)

      // Reset form
      setFormData({ key: '', name: '', desc: '', icon: 'RiFolderFill', visibility: 'public' })
      setErrors({})
      setKeyStatus('idle')
      setKeyHelper('Auto-generated from project name')
      setIsKeyManuallyEdited(false)
      setOpen(false)
    } catch (error) {
      console.error('Error creating project', error)
      setSubmittingError(error instanceof Error ? error.message : 'Failed to create project. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setFormData({ key: '', name: '', desc: '', icon: 'RiFolderFill', visibility: 'public' })
    setErrors({})
    setKeyStatus('idle')
    setKeyHelper('Auto-generated from project name')
    setIsKeyManuallyEdited(false)
    setSubmittingError(null)
    setOpen(false)
  }


  const isCheckingKey = keyStatus === 'checking'
  const disableSubmit = isSubmitting || isCheckingKey || !currentTeam?.id

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            Create project
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {/* Project Icon Selection */}
            <Field className="w-fit">
              <ProjectIconSelector
                value={formData.icon}
                onChange={handleIconSelect}
              />
            </Field>

            {/* Project Name */}
            <Field>
              <Input
                id="project-name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter project name"
                maxLength={32}
                className={errors.name ? 'border-destructive' : ''}
                autoFocus
              />

              <FieldDescription className="flex justify-between text-xs text-muted-foreground">
                <span className={errors.name ? 'text-destructive' : ''}>
                  {errors.name || 'Choose a clear, descriptive name'}
                </span>
                <span>{formData.name.length}/32</span>
              </FieldDescription>
            </Field>

            {/* Project Key */}
            <Field>
              <Input
                id="project-key"
                value={formData.key}
                onChange={(e) => handleInputChange('key', e.target.value)}
                onBlur={handleKeyBlur}
                placeholder="Auto-generated from name"
                maxLength={6}
                className={errors.key ? 'border-destructive' : keyStatus === 'available' ? 'border-green-500' : ''}
              />
              <FieldDescription className="flex justify-between text-xs text-muted-foreground">
                <span className={errors.key ? 'text-destructive' : keyStatus === 'available' ? 'text-green-600' : ''}>
                  {errors.key || keyHelper}
                </span>
                <span>{formData.key.length}/6</span>
              </FieldDescription>
            </Field>

            {/* Project Description */}
            <Field>
              <Textarea
                id="project-desc"
                value={formData.desc}
                onChange={(e) => handleInputChange('desc', e.target.value)}
                placeholder="Describe what this project is about"
                maxLength={140}
                rows={3}
                className={errors.desc ? 'border-destructive' : ''}
              />
              <FieldDescription className="flex justify-between text-xs text-muted-foreground">
                <span className={errors.desc ? 'text-destructive' : ''}>
                  {errors.desc || 'Brief description of the project goals'}
                </span>
                <span>{formData.desc.length}/140</span>
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
                      setFormData(prev => ({ ...prev, visibility: checked ? 'public' : 'private' }))
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
            <Button type="submit" disabled={disableSubmit}>
              <RiAddLine className="size-4" />
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
        {submittingError ? (
          <p className="text-sm text-destructive">{submittingError}</p>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
