'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface DeleteAccountDialogProps {
  userEmail: string
  onConfirm?: () => void
}

const CONFIRM_TEXT = 'DELETE'

export function DeleteAccountDialog({
  userEmail,
  onConfirm,
}: DeleteAccountDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [understood, setUnderstood] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const isValid =
    email === userEmail &&
    confirmText === CONFIRM_TEXT &&
    understood

  const handleConfirm = async () => {
    if (!isValid) return

    setIsDeleting(true)

    // Simulate API call
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))

      toast.success('Account deletion initiated', {
        description: 'You will receive a confirmation email shortly.',
      })

      setIsOpen(false)
      onConfirm?.()

      // Reset form
      setEmail('')
      setConfirmText('')
      setUnderstood(false)
    } catch (error) {
      toast.error('Failed to delete account', {
        description: 'Please try again or contact support.',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!isDeleting) {
      setIsOpen(open)
      if (!open) {
        // Reset form when closing
        setEmail('')
        setConfirmText('')
        setUnderstood(false)
      }
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Delete account
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-destructive/10 p-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle>Delete your account</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left pt-4">
            This action cannot be undone. This will permanently delete your
            account and remove all your data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertDescription className="text-sm">
              <strong>Warning:</strong> All of your projects, issues, comments,
              and personal data will be permanently deleted. You will not be able
              to recover this information.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="confirm-email">
              Confirm your email address
            </Label>
            <Input
              id="confirm-email"
              type="email"
              placeholder={userEmail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isDeleting}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Enter your email: {userEmail}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-text">
              Type <span className="font-mono font-bold">{CONFIRM_TEXT}</span>{' '}
              to confirm
            </Label>
            <Input
              id="confirm-text"
              type="text"
              placeholder={CONFIRM_TEXT}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={isDeleting}
              autoComplete="off"
            />
          </div>

          <div className="flex items-start gap-3 pt-2">
            <Checkbox
              id="understood"
              checked={understood}
              onCheckedChange={(checked) =>
                setUnderstood(checked === true)
              }
              disabled={isDeleting}
            />
            <Label
              htmlFor="understood"
              className="text-sm font-normal leading-relaxed cursor-pointer"
            >
              I understand that this action is permanent and irreversible. All my
              data will be deleted and cannot be recovered.
            </Label>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleConfirm()
            }}
            disabled={!isValid || isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete account permanently'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
