import { cn } from '@/lib/utils';
import { getStepNumber, getTotalSteps } from '../utils';
import type { SetupWizardStep } from '../types';

interface SetupProgressProps {
  currentStep: SetupWizardStep;
  className?: string;
}

export function SetupProgress({ currentStep, className }: SetupProgressProps) {
  const current = getStepNumber(currentStep);
  const total = getTotalSteps();
  const percentage = Math.round((current / total) * 100);

  return (
    <div className={cn('w-full space-y-2', className)}>
      <div className="flex justify-between text-xs text-muted-foreground uppercase tracking-wider font-medium">
        <span>Setup Progress</span>
        <span>
          Step {current} of {total}
        </span>
      </div>
      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500 ease-in-out rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
