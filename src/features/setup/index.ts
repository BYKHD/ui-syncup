/**
 * Setup Feature Module
 * @description Handles initial instance setup for self-hosted deployments
 */

// Types
export * from './types';

// Utils
export {
  SETUP_WIZARD_STEPS,
  getNextStep,
  getPreviousStep,
  getStepNumber,
  getTotalSteps,
  isStepCompleted,
  generateSlug,
} from './utils';

// API
export * from './api';

// Hooks
export * from './hooks';

// Components
export * from './components';

// Screens
export * from './screens';
