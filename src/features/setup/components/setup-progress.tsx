import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { 
  Activity, 
  UserCog, 
  Settings2, 
  Building2, 
  Database,
  Check
} from 'lucide-react';
import { getStepNumber, SETUP_WIZARD_STEPS } from '../utils';
import type { SetupWizardStep } from '../types';

interface SetupProgressProps {
  currentStep: SetupWizardStep;
  className?: string;
}

const STEP_ICONS: Partial<Record<SetupWizardStep, React.ElementType>> = {
  'health-check': Activity,
  'admin-account': UserCog,
  'instance-config': Settings2,
  'first-workspace': Building2,
  'sample-data': Database,
};

const STEP_LABELS: Partial<Record<SetupWizardStep, string>> = {
  'health-check': 'Health',
  'admin-account': 'Admin',
  'instance-config': 'Instance',
  'first-workspace': 'Workspace',
  'sample-data': 'Data',
};

export function SetupProgress({ currentStep, className }: SetupProgressProps) {
  // Exclude 'complete' from the visual progress bar
  const visualSteps = SETUP_WIZARD_STEPS.filter(step => step !== 'complete');
  const currentIndex = visualSteps.indexOf(currentStep as Exclude<SetupWizardStep, 'complete'>);

  return (
    <div className={cn('w-full', className)}>
      <div className="relative flex items-center justify-between w-full">
        {/* Background Line */}
        <div className="absolute left-[5%] top-1/2 -translate-y-1/2 w-[90%] h-1 bg-secondary rounded-full" />
        
        {/* Active Progress Line */}
        <motion.div 
          className="absolute left-[5%] top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full origin-left"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: Math.max(0, currentIndex / (visualSteps.length - 1)) }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          style={{ width: '90%' }}
        />

        {visualSteps.map((step, index) => {
          // Typecast step since we know 'complete' is filtered out
          const visualStep = step as Exclude<SetupWizardStep, 'complete'>;
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;
          const Icon = STEP_ICONS[visualStep];
          const label = STEP_LABELS[visualStep];

          return (
            <div key={step} className="relative z-10 flex flex-col items-center gap-2">
              <motion.div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors duration-300",
                  isCompleted ? "bg-primary border-primary text-primary-foreground" : 
                  isActive ? "bg-background border-primary text-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]" : 
                  "bg-background border-muted-foreground/30 text-muted-foreground"
                )}
                initial={false}
                animate={{
                  scale: isActive ? 1.1 : 1,
                }}
                transition={{ duration: 0.2 }}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  Icon && <Icon className="w-5 h-5" />
                )}
              </motion.div>
              <span 
                className={cn(
                  "text-xs font-medium uppercase tracking-wider transition-colors duration-300",
                  (isActive || isCompleted) ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
