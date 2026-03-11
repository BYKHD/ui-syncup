'use client';

import { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSetupWizard, useInstanceStatus } from '../hooks';
import { SetupProgress } from './setup-progress';
import { ServiceHealthStep } from './service-health-step';
import { AdminAccountStep } from './admin-account-step';
import { InstanceConfigStep } from './instance-config-step';
import { FirstWorkspaceStep } from './first-workspace-step';
import { SampleDataStep } from './sample-data-step';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import type { SetupWizardStep } from '../types';

/**
 * Determine the appropriate starting step based on current instance state.
 * This allows the wizard to resume from where it left off if setup was interrupted.
 */
function determineStartingStep(status: {
  adminEmail: string | null;
  instanceName: string | null;
  defaultWorkspaceId: string | null;
  isSetupComplete: boolean;
}): SetupWizardStep {
  // If setup is complete, this shouldn't be shown (proxy should redirect)
  if (status.isSetupComplete) {
    return 'complete';
  }

  // If no admin exists yet, start from the beginning
  if (!status.adminEmail) {
    return 'health-check';
  }

  // Admin exists, skip to instance config
  if (!status.instanceName || status.instanceName === 'UI SyncUp') {
    // Default name means config wasn't customized yet
    return 'instance-config';
  }

  // Instance configured, skip to workspace creation
  if (!status.defaultWorkspaceId) {
    return 'first-workspace';
  }

  // Workspace exists, go to sample data step
  return 'sample-data';
}

export function SetupWizard() {
  const { data: status, isLoading, error } = useInstanceStatus();
  
  // Determine starting step based on current state
  const startingStep = useMemo<SetupWizardStep>(() => {
    if (!status) return 'health-check';
    return determineStartingStep(status);
  }, [status]);

  const wizard = useSetupWizard(startingStep);

  // Update wizard step when status is loaded (only on initial load)
  useEffect(() => {
    if (status && startingStep !== 'health-check') {
      // Mark previous steps as complete
      const stepsOrder: SetupWizardStep[] = ['health-check', 'admin-account', 'instance-config', 'first-workspace', 'sample-data', 'complete'];
      const startingIndex = stepsOrder.indexOf(startingStep);
      
      stepsOrder.slice(0, startingIndex).forEach(step => {
        wizard.markStepComplete(step);
      });
      
      // Go to the determined step
      wizard.goToStep(startingStep);
    }
  // Only run when startingStep is first determined
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startingStep]);

  const renderStep = () => {
    switch (wizard.currentStep) {
      case 'health-check':
        return <ServiceHealthStep wizard={wizard} />;
      case 'admin-account':
        return <AdminAccountStep wizard={wizard} />;
      case 'instance-config':
        return <InstanceConfigStep wizard={wizard} />;
      case 'first-workspace':
        return <FirstWorkspaceStep wizard={wizard} />;
      case 'sample-data':
        return <SampleDataStep wizard={wizard} />;
      case 'complete': // Should have redirected by now
        return (
          <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary motion-reduce:animate-none" />
            <p className="text-muted-foreground">{'Redirecting\u2026'}</p>
          </div>
        );
      default:
        return null;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center p-12 space-y-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 className="h-10 w-10 text-primary" />
              </motion.div>
              <div className="space-y-2 text-center animate-pulse">
                <p className="text-lg font-medium">Checking setup status</p>
                <p className="text-sm text-muted-foreground">Please wait while we verify your environment&hellip;</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
              <p className="text-destructive font-medium">Failed to check setup status</p>
              <p className="text-sm text-muted-foreground">
                Please check your database connection and try again.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      <SetupProgress currentStep={wizard.currentStep} />
      <Card className="border-border/50 shadow-md backdrop-blur-sm bg-card/95">
        <CardContent className="pt-6 p-0 sm:p-6 overflow-hidden min-h-[450px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={wizard.currentStep}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}
