import { useState } from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCompleteSetup } from '../hooks';
import type { UseSetupWizardReturn } from '../hooks';
import { useRouter } from 'next/navigation';

interface SampleDataStepProps {
  wizard: UseSetupWizardReturn;
}

export function SampleDataStep({ wizard }: SampleDataStepProps) {
  const router = useRouter();
  const { mutate: completeSetup, isPending, error } = useCompleteSetup();
  const [includeSampleData, setIncludeSampleData] = useState(false);

  // We need workspaceId to complete setup
  // Since we don't store workspaceId in the wizard state (only name/slug),
  // we might need to assume the previous step created it and returned it,
  // or fetch it.
  // Actually, wait, the `useCreateFirstWorkspace` response has `workspaceId`.
  // I should probably have stored `id` in `workspaceData` state in wizard.
  // Let me check `SetupWizardState` type in `types/index.ts`.
  // It has `workspaceData: { name: string; slug: string } | null;`.
  // It's missing `id`. I should update the type.

  // For now, I'll proceed with assumed fix, but I'll need to patch `types/index.ts` and `hooks/use-setup-wizard.ts` and `components/first-workspace-step.tsx`.
  // To avoid circular dependency or context switching, let's just finish this file assuming I'll fix the type in a moment.
  // Alternatively, I can use the default workspace logic if requirements allow, but passed explicitly is better.

  // Let's assume wizard.workspaceData will have an id.

  const handleComplete = () => {
    const workspaceId = wizard.workspaceData?.id;

    if (!workspaceId) {
      // Fallback or error - this shouldn't happen if flow is correct
      console.error('Workspace ID missing');
      return;
    }

    completeSetup(
      {
        workspaceId,
        createSampleData: includeSampleData,
      },
      {
        onSuccess: (data) => {
          wizard.markStepComplete('sample-data');
          wizard.markStepComplete('complete');
          // Redirect
          if (data.redirectUrl) {
            router.push(data.redirectUrl);
          } else {
            router.push('/projects');
          }
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-balance">Finalize Setup</h2>
        <p className="text-muted-foreground">
          You&apos;re almost done. Choose if you want to populate your workspace with sample data.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Setup Failed</AlertTitle>
          <AlertDescription>
            {error.message || 'An error occurred while completing setup.'}
          </AlertDescription>
        </Alert>
      )}

      <motion.div 
        className="space-y-6"
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
        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="flex items-center space-x-4 rounded-md border border-border/50 p-4 bg-muted/30 shadow-sm transition-colors hover:bg-muted/50">
          <Switch
            id="sample-data"
            checked={includeSampleData}
            onCheckedChange={setIncludeSampleData}
          />
          <div className="flex-1 space-y-1">
            <Label htmlFor="sample-data" className="font-medium cursor-pointer">
              Include Sample Data
            </Label>
            <p className="text-sm text-muted-foreground">
              Add example projects, tasks, and users to help you explore the platform.
            </p>
          </div>
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
          <Button onClick={handleComplete} disabled={isPending}>
            {isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
            )}
            Complete Setup
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
