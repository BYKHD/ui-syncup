'use client';

import { useSetupWizard } from '../hooks';
import { SetupProgress } from './setup-progress';
import { ServiceHealthStep } from './service-health-step';
import { AdminAccountStep } from './admin-account-step';
import { InstanceConfigStep } from './instance-config-step';
import { FirstWorkspaceStep } from './first-workspace-step';
import { SampleDataStep } from './sample-data-step';
import { Card, CardContent } from '@/components/ui/card';

export function SetupWizard() {
  const wizard = useSetupWizard();

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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-muted-foreground">Redirecting...</p>
            </div>
        )
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      <SetupProgress currentStep={wizard.currentStep} />
      <Card>
        <CardContent className="pt-6">{renderStep()}</CardContent>
      </Card>
    </div>
  );
}
