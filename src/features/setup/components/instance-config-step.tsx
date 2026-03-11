import { motion } from 'motion/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  InstanceConfigRequestSchema,
  type InstanceConfigRequestDTO,
} from '../api';
import { useSaveInstanceConfig } from '../hooks';
import type { UseSetupWizardReturn } from '../hooks';

interface InstanceConfigStepProps {
  wizard: UseSetupWizardReturn;
}

export function InstanceConfigStep({ wizard }: InstanceConfigStepProps) {
  const { mutate: saveConfig, isPending, error } = useSaveInstanceConfig();

  const form = useForm<InstanceConfigRequestDTO>({
    resolver: zodResolver(InstanceConfigRequestSchema),
    defaultValues: {
      instanceName: 'My Organization',
      publicUrl: typeof window !== 'undefined' ? window.location.origin : '',
    },
  });

  const onSubmit = (data: InstanceConfigRequestDTO) => {
    saveConfig(data, {
      onSuccess: () => {
        wizard.setInstanceData({
          name: data.instanceName,
          publicUrl: data.publicUrl || '',
        });
        wizard.markStepComplete('instance-config');
        wizard.goToNextStep();
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-balance">Instance Configuration</h2>
        <p className="text-muted-foreground">
          Configure general settings for your instance.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error.message || 'Failed to save configuration'}
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
          <Label htmlFor="instanceName">Instance Name</Label>
          <Input
            id="instanceName"
            autoComplete="off"
            placeholder={'My Company\u2026'}
            {...form.register('instanceName')}
          />
          <p className="text-sm text-muted-foreground">
            The name displayed in emails and the dashboard header.
          </p>
          {form.formState.errors.instanceName && (
            <p className="text-sm font-medium text-destructive">
              {form.formState.errors.instanceName.message}
            </p>
          )}
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="space-y-2">
          <Label htmlFor="publicUrl">Public URL</Label>
          <Input
            id="publicUrl"
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder={'https://app.example.com\u2026'}
            {...form.register('publicUrl')}
          />
          <p className="text-sm text-muted-foreground">
            The base URL used for generating links in emails.
          </p>
          {form.formState.errors.publicUrl && (
            <p className="text-sm font-medium text-destructive">
              {form.formState.errors.publicUrl.message}
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
            Save Configuration
          </Button>
        </motion.div>
      </motion.form>
    </div>
  );
}
