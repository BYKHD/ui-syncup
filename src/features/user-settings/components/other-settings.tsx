'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { DeleteAccountDialog } from './delete-account-dialog'
import type { UserProfile } from '../types'

interface OtherSettingsProps {
  userProfile: UserProfile
}

export function OtherSettings({ userProfile }: OtherSettingsProps) {
  const handleAccountDeleted = () => {
    // Mock: In production, this would redirect to sign-out or goodbye page
    console.log('Account deletion confirmed')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Data export</CardTitle>
          <CardDescription>
            Download a copy of your personal data and activity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Request an export of your account data including projects, issues,
            comments, and profile information. You'll receive an email with a
            download link when your export is ready.
          </p>
          <div>
            <button
              className="text-sm font-medium text-primary hover:underline"
              onClick={() => {
                // Mock interaction
                alert('Data export request would be triggered here')
              }}
            >
              Request data export
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session management</CardTitle>
          <CardDescription>
            Manage active sessions and sign out from other devices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">Current session</p>
                <p className="text-xs text-muted-foreground">
                  MacBook Pro • San Francisco, CA
                </p>
              </div>
              <span className="text-xs text-muted-foreground">Active now</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">iPhone 15</p>
                <p className="text-xs text-muted-foreground">
                  Mobile • Last seen 2 hours ago
                </p>
              </div>
              <button
                className="text-xs font-medium text-destructive hover:underline"
                onClick={() => {
                  // Mock interaction
                  alert('Sign out from device would be triggered here')
                }}
              >
                Sign out
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertDescription>
              Once you delete your account, there is no going back. Please be
              certain.
            </AlertDescription>
          </Alert>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h4 className="text-sm font-medium mb-1">Delete this account</h4>
              <p className="text-sm text-muted-foreground">
                Permanently remove your account and all associated data. This
                action cannot be undone.
              </p>
            </div>
            <DeleteAccountDialog
              userEmail={userProfile.email}
              onConfirm={handleAccountDeleted}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
