import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PasswordStrengthIndicator } from '@/features/auth/components/password-strength-indicator';
import {
  AdminAccountRequestSchema,
  type AdminAccountRequestDTO,
} from '../api';
import { useCreateAdmin } from '../hooks';
import type { UseSetupWizardReturn } from '../hooks';

interface AdminAccountStepProps {
  wizard: UseSetupWizardReturn;
}

export function AdminAccountStep({ wizard }: AdminAccountStepProps) {
  const { mutate: createAdmin, isPending, error } = useCreateAdmin();

  const form = useForm<AdminAccountRequestDTO>({
    resolver: zodResolver(AdminAccountRequestSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      displayName: '',
    },
  });

  // Watch password field for strength indicator
  const password = form.watch('password');

  const onSubmit = (data: AdminAccountRequestDTO) => {
    createAdmin(data, {
      onSuccess: () => {
        wizard.setAdminData({ email: data.email, name: data.displayName });
        wizard.markStepComplete('admin-account');
        wizard.goToNextStep();
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Create Admin Account</h2>
        <p className="text-muted-foreground">
          Set up the initial administrator account for your instance.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error.message || 'Failed to create admin account'}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="displayName">Display Name</Label>
          <Input id="displayName" placeholder="John Doe" {...form.register('displayName')} />
          {form.formState.errors.displayName && (
            <p className="text-sm font-medium text-destructive">
              {form.formState.errors.displayName.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input id="email" type="email" placeholder="admin@example.com" {...form.register('email')} />
          <p className="text-sm text-muted-foreground">
            You will use this email to log in.
          </p>
          {form.formState.errors.email && (
            <p className="text-sm font-medium text-destructive">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" {...form.register('password')} />
          <PasswordStrengthIndicator password={password} showFeedback />
          {form.formState.errors.password && (
            <p className="text-sm font-medium text-destructive">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input id="confirmPassword" type="password" {...form.register('confirmPassword')} />
          {form.formState.errors.confirmPassword && (
            <p className="text-sm font-medium text-destructive">
              {form.formState.errors.confirmPassword.message}
            </p>
          )}
        </div>

        <div className="flex justify-between pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={wizard.goToPreviousStep}
            disabled={isPending}
          >
            Back
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Account
          </Button>
        </div>
      </form>
    </div>
  );
}
