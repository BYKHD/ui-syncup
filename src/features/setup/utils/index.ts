/**
 * Setup Feature Utilities
 * @description Helper functions for the setup wizard
 */

import type { SetupWizardStep } from '../types';

/**
 * Ordered list of setup wizard steps
 */
export const SETUP_WIZARD_STEPS: SetupWizardStep[] = [
  'health-check',
  'admin-account',
  'instance-config',
  'first-workspace',
  'sample-data',
  'complete',
];

/**
 * Get the next step in the wizard
 */
export function getNextStep(currentStep: SetupWizardStep): SetupWizardStep | null {
  const currentIndex = SETUP_WIZARD_STEPS.indexOf(currentStep);
  if (currentIndex === -1 || currentIndex >= SETUP_WIZARD_STEPS.length - 1) {
    return null;
  }
  return SETUP_WIZARD_STEPS[currentIndex + 1];
}

/**
 * Get the previous step in the wizard
 */
export function getPreviousStep(currentStep: SetupWizardStep): SetupWizardStep | null {
  const currentIndex = SETUP_WIZARD_STEPS.indexOf(currentStep);
  if (currentIndex <= 0) {
    return null;
  }
  return SETUP_WIZARD_STEPS[currentIndex - 1];
}

/**
 * Get the step number (1-indexed) for display
 */
export function getStepNumber(step: SetupWizardStep): number {
  return SETUP_WIZARD_STEPS.indexOf(step) + 1;
}

/**
 * Get total number of steps (excluding 'complete')
 */
export function getTotalSteps(): number {
  return SETUP_WIZARD_STEPS.length - 1; // Exclude 'complete'
}

/**
 * Check if a step is completed
 */
export function isStepCompleted(
  step: SetupWizardStep,
  completedSteps: SetupWizardStep[]
): boolean {
  return completedSteps.includes(step);
}

/**
 * Generate a URL-safe slug from a workspace name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
}
