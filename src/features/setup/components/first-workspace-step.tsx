import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FirstWorkspaceRequestSchema,
  type FirstWorkspaceRequestDTO,
} from '../api';
import { useCreateFirstWorkspace, useWorkspaceMode } from '../hooks';
import type { UseSetupWizardReturn } from '../hooks';
import { generateSlug } from '../utils';

interface FirstWorkspaceStepProps {
  wizard: UseSetupWizardReturn;
}

export function FirstWorkspaceStep({ wizard }: FirstWorkspaceStepProps) {
  const { mutate: createWorkspace, isPending, error } = useCreateFirstWorkspace();
  const { isMultiWorkspaceMode } = useWorkspaceMode();

  const form = useForm<FirstWorkspaceRequestDTO>({
    resolver: zodResolver(FirstWorkspaceRequestSchema),
    defaultValues: {
      workspaceName: '',
    },
  });

  const onSubmit = (data: FirstWorkspaceRequestDTO) => {
    createWorkspace(data, {
      onSuccess: (response) => {
        wizard.setWorkspaceData({
          id: response.workspaceId || '',
          name: data.workspaceName,
          slug: response.workspaceSlug || generateSlug(data.workspaceName), // Fallback if API doesn't return slug
        });
        wizard.markStepComplete('first-workspace');
        wizard.goToNextStep();
      },
    });
  };

  // Skip this step if in single workspace mode (optional logic depending on requirements)
  // But per requirements, we create a default workspace/team regardless, but UI might be different.
  // Requirement 5 says "THE System SHALL prompt the Admin to create the first Workspace"
  // So we show it.

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Create First Workspace</h2>
        <p className="text-muted-foreground">
          {isMultiWorkspaceMode
            ? 'Create the initial workspace where your team will collaborate.'
            : 'Set up your primary workspace.'}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error.message || 'Failed to create workspace'}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="workspaceName">Workspace Name</Label>
          <Input id="workspaceName" placeholder="Engineering Team" {...form.register('workspaceName')} />
          <p className="text-sm text-muted-foreground">
            This will be the display name of your first workspace.
          </p>
          {form.formState.errors.workspaceName && (
            <p className="text-sm font-medium text-destructive">
              {form.formState.errors.workspaceName.message}
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
            Create Workspace
          </Button>
        </div>
      </form>
    </div>
  );
}
