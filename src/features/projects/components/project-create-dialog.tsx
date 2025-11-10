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
import { RiAddLine } from '@remixicon/react'
import {
  RiRocketFill,
  RiLightbulbFill,
  RiCodeBoxFill,
  RiDashboardFill,
  RiPuzzleFill,
  RiBrainFill,
  RiFlashlightFill,
  RiCompassFill,
  RiLeafFill,
  RiFireFill,
  RiThunderstormsFill,
  RiMagicFill,
  RiSparklingFill,
  RiFolderFill,
  RiPlanetFill,
  RiMeteorFill,
  RiCactusFill,
  RiFlowerFill,
  RiCupFill,
  RiAnchorFill,
  RiStarFill,
  RiHeartFill,
  RiTrophyFill,
  RiShieldFill,
  RiTargetFill,
  RiBugFill,
  RiPaletteFill,
  RiCameraFill,
  RiBookFill,
  RiGamepadFill,
  RiShoppingCartFill,
  RiSmartphoneFill,
  RiTvFill,
  RiMusicFill,
  RiGiftFill,
  RiMailFill,
  RiBellFill,
  RiTimeFill,
  RiHomeFill,
  RiMapPinFill,
  RiLockLine,
  RiGlobalLine,
  RiSearchLine
} from '@remixicon/react'
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

const iconOptions = [
  { name: 'RiFolderFill', component: RiFolderFill, label: 'Folder' },
  { name: 'RiRocketFill', component: RiRocketFill, label: 'Rocket' },
  { name: 'RiLightbulbFill', component: RiLightbulbFill, label: 'Lightbulb' },
  { name: 'RiCodeBoxFill', component: RiCodeBoxFill, label: 'Code Box' },
  { name: 'RiDashboardFill', component: RiDashboardFill, label: 'Dashboard' },
  { name: 'RiPuzzleFill', component: RiPuzzleFill, label: 'Puzzle' },
  { name: 'RiBrainFill', component: RiBrainFill, label: 'Brain' },
  { name: 'RiFlashlightFill', component: RiFlashlightFill, label: 'Flashlight' },
  { name: 'RiCompassFill', component: RiCompassFill, label: 'Compass' },
  { name: 'RiLeafFill', component: RiLeafFill, label: 'Leaf' },
  { name: 'RiFireFill', component: RiFireFill, label: 'Fire' },
  { name: 'RiThunderstormsFill', component: RiThunderstormsFill, label: 'Storm' },
  { name: 'RiMagicFill', component: RiMagicFill, label: 'Magic' },
  { name: 'RiSparklingFill', component: RiSparklingFill, label: 'Sparkle' },
  { name: 'RiPlanetFill', component: RiPlanetFill, label: 'Planet' },
  { name: 'RiMeteorFill', component: RiMeteorFill, label: 'Meteor' },
  { name: 'RiCactusFill', component: RiCactusFill, label: 'Cactus' },
  { name: 'RiFlowerFill', component: RiFlowerFill, label: 'Flower' },
  { name: 'RiCupFill', component: RiCupFill, label: 'Cup' },
  { name: 'RiAnchorFill', component: RiAnchorFill, label: 'Anchor' },
  { name: 'RiStarFill', component: RiStarFill, label: 'Star' },
  { name: 'RiHeartFill', component: RiHeartFill, label: 'Heart' },
  { name: 'RiTrophyFill', component: RiTrophyFill, label: 'Trophy' },
  { name: 'RiShieldFill', component: RiShieldFill, label: 'Shield' },
  { name: 'RiTargetFill', component: RiTargetFill, label: 'Target' },
  { name: 'RiBugFill', component: RiBugFill, label: 'Bug' },
  { name: 'RiPaletteFill', component: RiPaletteFill, label: 'Palette' },
  { name: 'RiCameraFill', component: RiCameraFill, label: 'Camera' },
  { name: 'RiBookFill', component: RiBookFill, label: 'Book' },
  { name: 'RiGamepadFill', component: RiGamepadFill, label: 'Game' },
  { name: 'RiShoppingCartFill', component: RiShoppingCartFill, label: 'Cart' },
  { name: 'RiSmartphoneFill', component: RiSmartphoneFill, label: 'Mobile' },
  { name: 'RiTvFill', component: RiTvFill, label: 'TV' },
  { name: 'RiMusicFill', component: RiMusicFill, label: 'Music' },
  { name: 'RiGiftFill', component: RiGiftFill, label: 'Gift' },
  { name: 'RiMailFill', component: RiMailFill, label: 'Mail' },
  { name: 'RiBellFill', component: RiBellFill, label: 'Bell' },
  { name: 'RiTimeFill', component: RiTimeFill, label: 'Time' },
  { name: 'RiHomeFill', component: RiHomeFill, label: 'Home' },
  { name: 'RiMapPinFill', component: RiMapPinFill, label: 'Location' }
]

export function ProjectCreateDialog({ children, onProjectAdded }: ProjectCreateDialogProps) {
  const [open, setOpen] = useState(false)
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const [iconSearch, setIconSearch] = useState('')
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
    setIconSearch('')
  }

  const filteredIcons = iconOptions.filter(icon =>
    icon.label.toLowerCase().includes(iconSearch.toLowerCase())
  )

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

      setFormData({ key: '', name: '', desc: '', icon: 'RiFolderFill', visibility: 'public' })
      setErrors({})
      setKeyStatus('idle')
      setKeyHelper('Use 2-6 uppercase letters')
      setIconSearch('')
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
    setKeyHelper('Use 2-6 uppercase letters')
    setIconSearch('')
    setOpen(false)
  }

  const selectedIcon = iconOptions.find(option => option.name === formData.icon)
  const SelectedIconComponent = selectedIcon?.component || RiFolderFill
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
                  <button
                    type="button"
                    className="flex items-start transition-all hover:scale-105"
                  >
                    <div className="p-3 bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors">
                      <SelectedIconComponent className="h-6 w-6 text-primary" />
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-80">
                  <div className="p-4">
                    <div className="text-sm font-medium mb-3">
                      Choose an icon for your project
                    </div>

                    {/* Search Input */}
                    <div className="relative mb-3">
                      <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search icons..."
                        value={iconSearch}
                        onChange={(e) => setIconSearch(e.target.value)}
                        className="pl-9 h-9"
                      />
                    </div>

                    {/* Icon Grid */}
                    <div
                      className="grid grid-cols-5 gap-1.5 max-h-[480px] overflow-y-visible pr-2 "
                      style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: 'rgba(0, 0, 0, 0.2) transparent'
                      }}
                    >
                      {filteredIcons.length > 0 ? (
                        filteredIcons.map(({ name, component: IconComponent, label }) => {
                          const isSelected = formData.icon === name;
                          return (
                            <button
                              type="button"
                              key={name}
                              title={label}
                              className={`
                                h-12 w-12 flex items-center justify-center rounded-md
                                transition-all hover:scale-110
                                ${isSelected
                                  ? 'bg-primary text-primary-foreground shadow-sm'
                                  : 'hover:bg-accent'
                                }
                              `}
                              onClick={() => handleIconSelect(name)}
                            >
                              <IconComponent className="h-5 w-5" />
                            </button>
                          );
                        })
                      ) : (
                        <div className="col-span-5 text-center py-8 text-sm text-muted-foreground">
                          No icons found
                        </div>
                      )}
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
