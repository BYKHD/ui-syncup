'use client';

/**
 * InviteCodeInput Component
 * @description Input field for manual invite code entry with validation
 * 
 * @requirements 8.4, 8.5
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Invite code validation schema
const inviteCodeSchema = z.object({
  code: z
    .string()
    .min(1, 'Invite code is required')
    .min(6, 'Invite code must be at least 6 characters')
    .max(100, 'Invite code is too long'),
});

type InviteCodeFormData = z.infer<typeof inviteCodeSchema>;

interface InviteCodeInputProps {
  /** Called when a valid invite code is submitted */
  onSubmit: (code: string) => void;
  /** Called when user wants to go back to choice screen */
  onBack: () => void;
  /** Whether code validation is in progress */
  isLoading?: boolean;
  /** Error message from code validation */
  error?: string | null;
}

export function InviteCodeInput({
  onSubmit,
  onBack,
  isLoading = false,
  error = null,
}: InviteCodeInputProps) {
  const [serverError, setServerError] = useState<string | null>(error);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InviteCodeFormData>({
    resolver: zodResolver(inviteCodeSchema),
    defaultValues: {
      code: '',
    },
  });

  const onFormSubmit = handleSubmit((data) => {
    setServerError(null);
    onSubmit(data.code.trim());
  });

  // Sync external error with internal state
  if (error !== serverError && error !== null) {
    setServerError(error);
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Join a team</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your invitation code to join an existing team
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Enter invite code</CardTitle>
          <CardDescription>
            Your team admin should have provided you with an invitation code or link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onFormSubmit} className="space-y-4">
            {serverError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {serverError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="invite-code">Invitation code</Label>
              <Input
                id="invite-code"
                {...register('code')}
                placeholder="Enter your invite code"
                autoFocus
                autoComplete="off"
                disabled={isLoading}
              />
              {errors.code && (
                <p className="text-xs text-destructive">{errors.code.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={onBack}
                disabled={isLoading}
                className="order-2 sm:order-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="order-1 sm:order-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        If you received an invitation link, you can paste the code from the URL here.
      </p>
    </div>
  );
}
