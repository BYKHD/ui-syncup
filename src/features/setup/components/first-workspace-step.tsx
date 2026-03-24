import { motion } from 'motion/react';
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
        <h2 className="text-2xl font-bold tracking-tight text-balance">Create Your Team</h2>
        <p className="text-muted-foreground">
          {isMultiWorkspaceMode
            ? 'Create the initial team where your members will collaborate.'
            : 'Set up your primary team.'}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error.message || 'Failed to create team'}
          </AlertDescription>
        </Alert>
      )}

      <motion.form 
        onSubmit={form.handleSubmit(onSubmit)} 
        className="space-y-4"
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
          }
        }}
      >
        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="space-y-2">
          <Label htmlFor="workspaceName">Team Name</Label>
          <Input
            id="workspaceName"
            autoComplete="off"
            placeholder={'Engineering Team\u2026'}
            {...form.register('workspaceName')}
          />
          <p className="text-sm text-muted-foreground">
            This will be the display name of your first team.
          </p>
          {form.formState.errors.workspaceName && (
            <p className="text-sm font-medium text-destructive">
              {form.formState.errors.workspaceName.message}
            </p>
          )}
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="flex justify-between pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={wizard.goToPreviousStep}
            disabled={isPending}
          >
            Back
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
            )}
            Create Team
          </Button>
        </motion.div>
      </motion.form>
    </div>
  );
}
