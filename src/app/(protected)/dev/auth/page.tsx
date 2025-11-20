"use client";

import { useState } from "react";
import { Copy, AlertTriangle, CheckCircle, XCircle, Loader2, Monitor, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { useSession } from "@/features/auth/hooks/use-session";
import { useSignOut } from "@/features/auth/hooks/use-sign-out";
import { useDeleteAccount } from "@/features/auth/hooks/use-delete-account";
import { useForceVerify } from "@/features/auth/hooks/use-force-verify";
import { useSessions } from "@/features/auth/hooks/use-sessions";
import { useResetRateLimit } from "@/features/auth/hooks/use-reset-rate-limit";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";

export default function DevAuthPage() {
  const { user, session, isLoading, error, invalidateSession } = useSession();
  const { signOut, isLoading: isSigningOut } = useSignOut();
  const { deleteAccount, isLoading: isDeleting } = useDeleteAccount({
    onSuccess: () => {
      toast.success("Account deleted successfully");
    },
  });
  const { forceVerify, isLoading: isVerifying } = useForceVerify({
    onSuccess: () => {
      toast.success("Email verified successfully");
    },
    onError: (error: any) => {
      const message = error?.payload?.error?.message || "Failed to verify email";
      toast.error(message);
    },
  });
  const { sessions, total: totalSessions, isLoading: isLoadingSessions, refetch: refetchSessions } = useSessions();
  const { resetRateLimit, isLoading: isResettingRateLimit } = useResetRateLimit({
    onSuccess: () => {
      toast.success("Rate limits cleared successfully");
    },
    onError: (error: any) => {
      const message = error?.payload?.error?.message || "Failed to reset rate limits";
      toast.error(message);
    },
  });

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Debug: Log session state (client-side only)
  if (typeof window !== 'undefined') {
    console.log('DevAuthPage - Session Debug:', {
      isLoading,
      hasUser: !!user,
      hasSession: !!session,
      error: error,
      cookies: document.cookie,
    });
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleInvalidateCache = () => {
    invalidateSession();
    toast.success("Session cache invalidated");
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6 max-w-4xl space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No session found. Please sign in first.
          </AlertDescription>
        </Alert>
        
        {/* Debug Information */}
        <Card>
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Error:</p>
              <code className="text-xs bg-muted px-2 py-1 rounded block mt-1">
                {error ? JSON.stringify(error, null, 2) : 'No error'}
              </code>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cookies:</p>
              <code className="text-xs bg-muted px-2 py-1 rounded block mt-1">
                {typeof window !== 'undefined' ? (document.cookie || 'No cookies found') : 'Loading...'}
              </code>
            </div>
            <Button onClick={() => invalidateSession()} variant="outline" className="w-full">
              Retry Session Fetch
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Note: Session expiration is managed server-side via httpOnly cookies
  // The client doesn't have direct access to expiration timestamps

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Warning Banner */}
      <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/10">
        <AlertTriangle className="h-5 w-5 text-orange-600" />
        <AlertDescription className="text-orange-900 dark:text-orange-200 font-medium">
          ⚠️ DEV MODE - This page is temporary for testing authentication features
        </AlertDescription>
      </Alert>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Auth Testing Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Test and debug authentication features in development mode
        </p>
      </div>

      <Separator />

      {/* User Information Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Information</CardTitle>
              <CardDescription>Current authenticated user details</CardDescription>
            </div>
            {user.emailVerified ? (
              <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            ) : (
              <Badge variant="destructive">
                <XCircle className="h-3 w-3 mr-1" />
                Unverified
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">User ID</p>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                  {user.id}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(user.id, "User ID")}
                  className="h-7 w-7 p-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Email</p>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                  {user.email}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(user.email, "Email")}
                  className="h-7 w-7 p-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="text-sm font-medium">{user.name}</p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Email Verified</p>
              <p className="text-sm font-medium">
                {user.emailVerified ? "Yes" : "No"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Session Information</CardTitle>
          <CardDescription>Current session details (managed server-side)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Session expiration is managed server-side via httpOnly cookies for security.
              Sessions are valid for 7 days by default with rolling renewal.
            </p>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="font-medium">Active Session</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roles Card */}
      {user.roles && user.roles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>User Roles</CardTitle>
            <CardDescription>Assigned roles and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {user.roles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{role.role}</p>
                    <p className="text-xs text-muted-foreground">
                      {role.resourceType}: {role.resourceId}
                    </p>
                  </div>
                  <Badge variant="outline">{role.resourceType}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Sessions Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>
                All active sessions for this account ({totalSessions} total)
              </CardDescription>
            </div>
            <Button
              onClick={() => refetchSessions()}
              disabled={isLoadingSessions}
              variant="ghost"
              size="sm"
            >
              {isLoadingSessions ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingSessions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No active sessions found
            </p>
          ) : (
            <div className="space-y-3">
              {sessions.map((sess) => {
                const expiresAt = new Date(sess.expiresAt);
                const createdAt = new Date(sess.createdAt);
                const timeRemaining = Math.max(0, expiresAt.getTime() - Date.now());
                const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
                const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

                return (
                  <div
                    key={sess.id}
                    className={`p-4 border rounded-lg space-y-2 ${
                      sess.isCurrent ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {sess.isCurrent ? "Current Session" : "Other Device"}
                        </span>
                      </div>
                      {sess.isCurrent && (
                        <Badge variant="default" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">IP Address</p>
                        <p className="font-mono">{sess.ipAddress}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Created</p>
                        <p>{createdAt.toLocaleString()}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-muted-foreground">User Agent</p>
                        <p className="truncate" title={sess.userAgent}>
                          {sess.userAgent}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Expires</p>
                        <p>{expiresAt.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Time Remaining</p>
                        <p>
                          {hoursRemaining}h {minutesRemaining}m
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons Card */}
      <Card>
        <CardHeader>
          <CardTitle>Testing Actions</CardTitle>
          <CardDescription>
            Test authentication features and operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              onClick={() => signOut()}
              disabled={isSigningOut}
              variant="outline"
              className="w-full"
            >
              {isSigningOut && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Sign Out (Current Device)
            </Button>

            {!user.emailVerified && (
              <Button
                onClick={() => forceVerify()}
                disabled={isVerifying}
                variant="outline"
                className="w-full"
              >
                {isVerifying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Force Verify Email
              </Button>
            )}

            <Button
              onClick={handleInvalidateCache}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Invalidate Session Cache
            </Button>

            <Button
              onClick={() => copyToClipboard(user.id, "User ID")}
              variant="outline"
              className="w-full"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy User ID
            </Button>

            <Button
              onClick={() => copyToClipboard(user.email, "Email")}
              variant="outline"
              className="w-full"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Email
            </Button>

            <Button
              onClick={() => refetchSessions()}
              disabled={isLoadingSessions}
              variant="outline"
              className="w-full"
            >
              {isLoadingSessions ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh Sessions
            </Button>

            <Button
              onClick={() => resetRateLimit({})}
              disabled={isResettingRateLimit}
              variant="outline"
              className="w-full"
            >
              {isResettingRateLimit ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Reset Rate Limits
            </Button>
          </div>

          <Separator />

          <Button
            onClick={() => setShowDeleteDialog(true)}
            disabled={isDeleting}
            variant="destructive"
            className="w-full"
          >
            {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Delete Account (Irreversible)
          </Button>
        </CardContent>
      </Card>

      {/* Testing Scenarios Card */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/10">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-200">
            Testing Scenarios
          </CardTitle>
          <CardDescription className="text-blue-700 dark:text-blue-300">
            Recommended test cases for the authentication system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                1. Email Verification Flow
              </h4>
              <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-300 ml-2">
                <li>Sign up with a new account (email will be unverified)</li>
                <li>Check this page - you should see "Unverified" badge</li>
                <li>Click "Force Verify Email" to bypass email verification</li>
                <li>Refresh to see "Verified" badge</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                2. Multi-Device Sessions
              </h4>
              <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-300 ml-2">
                <li>Sign in from multiple browsers/devices</li>
                <li>Check "Active Sessions" to see all devices</li>
                <li>Sign out from one device - other sessions remain active</li>
                <li>Verify session count decreases by 1</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                3. Session Cache Invalidation
              </h4>
              <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-300 ml-2">
                <li>Click "Invalidate Session Cache"</li>
                <li>Session data should refetch from server</li>
                <li>Useful for testing React Query cache behavior</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                4. Account Deletion
              </h4>
              <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-300 ml-2">
                <li>Click "Delete Account" to test cleanup</li>
                <li>Confirms all data is deleted (sessions, roles, tokens)</li>
                <li>Redirects to sign-in page</li>
                <li>Cannot sign in with deleted credentials</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                5. Session Expiration
              </h4>
              <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-300 ml-2">
                <li>Check "Time Remaining" in Session Information</li>
                <li>Sessions expire after 7 days by default</li>
                <li>Rolling renewal extends expiration on each request</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                6. Rate Limit Testing
              </h4>
              <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-300 ml-2">
                <li>Try signing in with wrong password 3+ times</li>
                <li>You'll see "Too many sign-in attempts" error</li>
                <li>Click "Reset Rate Limits" to clear the block</li>
                <li>You can now sign in again immediately</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              account and remove all your data including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All sessions (logged out from all devices)</li>
                <li>All verification tokens</li>
                <li>All user roles and permissions</li>
                <li>Your user account</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteAccount();
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
