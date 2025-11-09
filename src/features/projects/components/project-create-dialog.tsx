'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@components/ui/dialog'
import { Input } from '@components/ui/input'
import { Textarea } from '@components/ui/textarea'
import { Field, FieldDescription } from '@components/ui/field'
import { Popover, PopoverContent, PopoverTrigger } from '@components/ui/popover'
import { Switch } from '@components/ui/switch'
import { Label } from '@components/ui/label'
import { RiAddLine } from '@remixicon/react'
import { 
  RiBox2Fill, 
  RiNotification2Fill, 
  RiPaletteFill, 
  RiServerFill, 
  RiSmartphoneFill,
  RiCodeFill,
  RiDatabaseFill,
  RiSettingsFill,
  RiUserFill,
  RiTeamFill,
  RiShieldFill,
  RiRocketFill,
  RiLightbulbFill,
  RiStarFill,
  RiHeartFill,
  RiBookmarkFill,
  RiFlagFill,
  RiTargetFill,
  RiTrophyFill,
  RiAwardFill,
  RiLockLine,
  RiGlobalLine
} from '@remixicon/react'
import { useTeam } from '@hooks/use-team'

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

const iconOptions = [
  { name: 'RiBox2Fill', component: RiBox2Fill, label: 'Box' },
  { name: 'RiNotification2Fill', component: RiNotification2Fill, label: 'Notification' },
  { name: 'RiPaletteFill', component: RiPaletteFill, label: 'Palette' },
  { name: 'RiServerFill', component: RiServerFill, label: 'Server' },
  { name: 'RiSmartphoneFill', component: RiSmartphoneFill, label: 'Mobile' },
  { name: 'RiCodeFill', component: RiCodeFill, label: 'Code' },
  { name: 'RiDatabaseFill', component: RiDatabaseFill, label: 'Database' },
  { name: 'RiSettingsFill', component: RiSettingsFill, label: 'Settings' },
  { name: 'RiUserFill', component: RiUserFill, label: 'User' },
  { name: 'RiTeamFill', component: RiTeamFill, label: 'Team' },
  { name: 'RiShieldFill', component: RiShieldFill, label: 'Shield' },
  { name: 'RiRocketFill', component: RiRocketFill, label: 'Rocket' },
  { name: 'RiLightbulbFill', component: RiLightbulbFill, label: 'Lightbulb' },
  { name: 'RiStarFill', component: RiStarFill, label: 'Star' },
  { name: 'RiHeartFill', component: RiHeartFill, label: 'Heart' },
  { name: 'RiBookmarkFill', component: RiBookmarkFill, label: 'Bookmark' },
  { name: 'RiFlagFill', component: RiFlagFill, label: 'Flag' },
  { name: 'RiTargetFill', component: RiTargetFill, label: 'Target' },
  { name: 'RiTrophyFill', component: RiTrophyFill, label: 'Trophy' },
  { name: 'RiAwardFill', component: RiAwardFill, label: 'Award' }
]

export function ProjectCreateDialog({ children, onProjectAdded }: ProjectCreateDialogProps) {
  const [open, setOpen] = useState(false) 
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const [formData, setFormData] = useState({
    key: '',
    name: '',
    desc: '',
    icon: 'RiBox2Fill',
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
  const [keyStatus, setKeyStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'error'>(
    'idle'
  )
  const [keyHelper, setKeyHelper] = useState('Use 2-6 uppercase letters')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittingError, setSubmittingError] = useState<string | null>(null)
  const { currentTeam } = useTeam()

  const handleInputChange = (field: string, value: string) => {
    if (field === 'key') {
      const sanitized = value.replace(/[^a-zA-Z]/g, '').toUpperCase()
      setFormData(prev => ({ ...prev, key: sanitized }))
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
    setIconPickerOpen(false)
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
    } else if (keyStatus === 'error') {
      newErrors.key = 'Unable to validate project key'
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

  useEffect(() => {
    if (!formData.key) {
      setKeyStatus('idle')
      setKeyHelper('Use 2-6 uppercase letters')
      setErrors(prev => ({ ...prev, key: undefined }))
      return
    }

    if (!KEY_PATTERN.test(formData.key)) {
      setKeyStatus('invalid')
      setKeyHelper('')
      setErrors(prev => ({ ...prev, key: 'Project key must be 2-6 uppercase letters' }))
      return
    }

    let cancelled = false
    const controller = new AbortController()

    setKeyStatus('checking')
    setKeyHelper('Checking availability...')
    setErrors(prev => ({ ...prev, key: undefined }))

    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(`/api/projects?projectKey=${encodeURIComponent(formData.key)}`, {
          signal: controller.signal
        })

        if (!response.ok) {
          throw new Error('Request failed')
        }

        const result = await response.json()

        if (cancelled) {
          return
        }

        if (result.exists) {
          setKeyStatus('taken')
          setKeyHelper('')
          setErrors(prev => ({ ...prev, key: 'Project key already exists' }))
        } else {
          setKeyStatus('available')
          setKeyHelper('Project key is available')
          setErrors(prev => ({ ...prev, key: undefined }))
        }
      } catch (error) {
        if (cancelled || controller.signal.aborted) {
          return
        }
        console.error('Failed to validate project key', error)
        setKeyStatus('error')
        setKeyHelper('')
        setErrors(prev => ({ ...prev, key: 'Unable to validate project key' }))
      }
    }, 300)

    return () => {
      cancelled = true
      controller.abort()
      clearTimeout(timeoutId)
    }
  }, [formData.key])

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
          projectKey: formData.key.trim(),
          name: formData.name.trim(),
          description: formData.desc.trim(),
          icon: formData.icon,
          visibility: formData.visibility,
          teamId: currentTeam.id
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create project')
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

      setFormData({ key: '', name: '', desc: '', icon: 'RiBox2Fill', visibility: 'public' })
      setErrors({})
      setKeyStatus('idle')
      setKeyHelper('Use 2-6 uppercase letters')
      setOpen(false)
    } catch (error) {
      console.error('Error creating project', error)
      setSubmittingError(error instanceof Error ? error.message : 'Failed to create project. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setFormData({ key: '', name: '', desc: '', icon: 'RiBox2Fill', visibility: 'public' })
    setErrors({})
    setKeyStatus('idle')
    setKeyHelper('Use 2-6 uppercase letters')
    setOpen(false)
  }

  const selectedIcon = iconOptions.find(option => option.name === formData.icon)
  const SelectedIconComponent = selectedIcon?.component || RiBox2Fill
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
              <Popover open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
                <PopoverTrigger className="w-fit" asChild>
                  <div className="flex items-start">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <SelectedIconComponent className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </PopoverTrigger>
                <PopoverContent className="p-0">
                  <div className="p-3">
                    <div className="text-xs font-medium text-muted-foreground mb-3">
                      Choose an icon for your project
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {iconOptions.map(({ name, component: IconComponent }) => {
                        const isSelected = formData.icon === name;
                        return (
                          <Button
                            key={name}
                            variant={isSelected ? 'secondary' : 'ghost'}
                            className="h-10 w-10 flex items-center justify-center p-1"
                            onClick={() => handleIconSelect(name)}
                          >
                            <IconComponent/>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
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
                placeholder="Enter project key"
                maxLength={6}
                className={errors.key ? 'border-destructive' : ''}
              />
              <FieldDescription className="flex justify-between text-xs text-muted-foreground">
                <span className={errors.key ? 'text-destructive' : ''}>
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
