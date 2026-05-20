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
import { useDeleteAccount } from '@/features/auth'

const CONFIRM_TEXT = 'DELETE'

export function DeleteAccountDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [understood, setUnderstood] = useState(false)

  const { deleteAccount, isLoading } = useDeleteAccount({
    onSuccess: () => {
      toast.success('Account deleted', {
        description: 'You have been signed out.',
      })
    },
    onError: () => {
      toast.error('Failed to delete account', {
        description: 'Please try again or contact support.',
      })
    },
  })

  const isValid = confirmText === CONFIRM_TEXT && understood

  const handleConfirm = () => {
    if (!isValid) return
    deleteAccount()
  }

  const handleOpenChange = (open: boolean) => {
    if (isLoading) return
    setIsOpen(open)
    if (!open) {
      // Reset form when closing
      setConfirmText('')
      setUnderstood(false)
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
              disabled={isLoading}
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
              disabled={isLoading}
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
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleConfirm()
            }}
            disabled={!isValid || isLoading}
            variant="destructive"
          >
            {isLoading ? 'Deleting...' : 'Delete account permanently'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
