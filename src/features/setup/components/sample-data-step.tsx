import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCompleteSetup, useSetupDraft } from '../hooks';
import type { UseSetupWizardReturn } from '../hooks';
import { useRouter } from 'next/navigation';

interface SampleDataStepProps {
  wizard: UseSetupWizardReturn;
}

export function SampleDataStep({ wizard }: SampleDataStepProps) {
  const router = useRouter();
  const { mutate: completeSetup, isPending, error } = useCompleteSetup();
  const { draft, setDraft, clearDraft } = useSetupDraft();
  const includeSampleData = draft.includeSampleData ?? false;

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
          clearDraft();
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
          You&apos;re almost done. Choose if you want to populate your team with sample data.
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
            onCheckedChange={(checked) => setDraft({ includeSampleData: checked })}
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
