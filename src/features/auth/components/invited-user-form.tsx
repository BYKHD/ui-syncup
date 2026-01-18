'use client';

/**
 * InvitedUserForm Component
 * @description Displays invitation details and handles acceptance for invited users
 * 
 * Features:
 * - Display invitation details (workspace, inviter, role)
 * - Inline account creation if user doesn't exist
 * - Sign-in prompt if user exists
 * - Accept/decline buttons
 * 
 * @requirements 7.2, 7.4, 7.5
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Loader2, LogIn, UserPlus, X } from 'lucide-react';
import Link from 'next/link';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { PasswordStrengthIndicator } from './password-strength-indicator';

// Schema for inline account creation
const accountCreationSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must be at most 100 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-zA-Z])(?=.*[0-9])/,
        'Password must contain at least one letter and one number'
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type AccountCreationData = z.infer<typeof accountCreationSchema>;

export interface InvitationDetails {
  token: string;
  workspaceName: string;
  workspaceSlug: string;
  inviterName: string;
  inviterEmail: string;
  role: string;
  roleDescription: string;
  expiresAt: string;
}

interface InvitedUserFormProps {
  /** Invitation details from the token */
  invitation: InvitationDetails;
  /** Whether the user already has an account */
  hasExistingAccount: boolean;
  /** Pre-filled email if user has account */
  existingEmail?: string;
  /** Called when accepting invitation with account creation */
  onAcceptWithNewAccount: (data: AccountCreationData) => Promise<void>;
  /** Called when accepting invitation for existing user */
  onAcceptExistingUser: () => Promise<void>;
  /** Called when declining invitation */
  onDecline: () => void;
  /** Whether acceptance is in progress */
  isLoading?: boolean;
  /** Error message */
  error?: string | null;
}

export function InvitedUserForm({
  invitation,
  hasExistingAccount,
  existingEmail,
  onAcceptWithNewAccount,
  onAcceptExistingUser,
  onDecline,
  isLoading = false,
  error = null,
}: InvitedUserFormProps) {
  const [showAccountForm, setShowAccountForm] = useState(!hasExistingAccount);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AccountCreationData>({
    resolver: zodResolver(accountCreationSchema),
    defaultValues: {
      name: '',
      email: existingEmail || '',
      password: '',
      confirmPassword: '',
    },
  });

  const passwordValue = watch('password', '');

  const onFormSubmit = handleSubmit(async (data) => {
    await onAcceptWithNewAccount(data);
  });

  return (
    <div className="w-full max-w-lg space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">You&apos;re invited!</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Join {invitation.workspaceName} to start collaborating
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-primary mx-auto">
            <UserPlus className="h-8 w-8" />
          </div>
          <CardTitle className="text-center text-xl">
            {invitation.workspaceName}
          </CardTitle>
          <CardDescription className="text-center">
            <span className="font-medium text-foreground">
              {invitation.inviterName}
            </span>{' '}
            has invited you to join as{' '}
            <span className="font-medium text-foreground">{invitation.role}</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
            <p>{invitation.roleDescription}</p>
          </div>

          <Separator />

          {hasExistingAccount && !showAccountForm ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                You already have an account. Sign in to accept this invitation.
              </p>
              <Button
                className="w-full"
                onClick={onAcceptExistingUser}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign in to accept
                  </>
                )}
              </Button>
            </div>
          ) : (
            <form onSubmit={onFormSubmit} className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Create an account to join the workspace
              </p>

              <div className="space-y-2">
                <Label htmlFor="name">Display name</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Your name"
                  disabled={isLoading}
                  autoComplete="name"
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="you@example.com"
                  disabled={isLoading || Boolean(existingEmail)}
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  {...register('password')}
                  placeholder="Create a password"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <PasswordStrengthIndicator password={passwordValue} />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  {...register('confirmPassword')}
                  placeholder="Confirm your password"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Create account & join
                  </>
                )}
              </Button>

              {hasExistingAccount && (
                <Button
                  type="button"
                  variant="link"
                  className="w-full"
                  onClick={() => setShowAccountForm(false)}
                  disabled={isLoading}
                >
                  I already have an account
                </Button>
              )}
            </form>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={onDecline}
            disabled={isLoading}
          >
            <X className="mr-2 h-4 w-4" />
            Decline invitation
          </Button>
        </CardFooter>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Already have an account?{' '}
        <Link href="/sign-in" className="text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
