'use client';

/**
 * useSetupWizard Hook
 * @description State management for the multi-step setup wizard
 */

import { useState, useCallback, useMemo } from 'react';
import type { SetupWizardStep, SetupWizardState } from '../types';
import {
  SETUP_WIZARD_STEPS,
  getNextStep,
  getPreviousStep,
  getStepNumber,
  getTotalSteps,
} from '../utils';

const INITIAL_STATE: SetupWizardState = {
  currentStep: 'health-check',
  completedSteps: [],
  adminData: null,
  instanceData: null,
  teamData: null,
  includeSampleData: false,
};

export function useSetupWizard(initialStep?: SetupWizardStep) {
  const [state, setState] = useState<SetupWizardState>(() => ({
    ...INITIAL_STATE,
    currentStep: initialStep ?? INITIAL_STATE.currentStep,
  }));

  const goToStep = useCallback((step: SetupWizardStep) => {
    setState((prev) => ({
      ...prev,
      currentStep: step,
    }));
  }, []);

  const goToNextStep = useCallback(() => {
    setState((prev) => {
      const nextStep = getNextStep(prev.currentStep);
      if (!nextStep) return prev;

      return {
        ...prev,
        currentStep: nextStep,
        completedSteps: prev.completedSteps.includes(prev.currentStep)
          ? prev.completedSteps
          : [...prev.completedSteps, prev.currentStep],
      };
    });
  }, []);

  const goToPreviousStep = useCallback(() => {
    setState((prev) => {
      const prevStep = getPreviousStep(prev.currentStep);
      if (!prevStep) return prev;

      return {
        ...prev,
        currentStep: prevStep,
      };
    });
  }, []);

  const setAdminData = useCallback(
    (data: SetupWizardState['adminData']) => {
      setState((prev) => ({ ...prev, adminData: data }));
    },
    []
  );

  const setInstanceData = useCallback(
    (data: SetupWizardState['instanceData']) => {
      setState((prev) => ({ ...prev, instanceData: data }));
    },
    []
  );

  const setTeamData = useCallback(
    (data: SetupWizardState['teamData']) => {
      setState((prev) => ({ ...prev, teamData: data }));
    },
    []
  );

  const setIncludeSampleData = useCallback((include: boolean) => {
    setState((prev) => ({ ...prev, includeSampleData: include }));
  }, []);

  const markStepComplete = useCallback((step: SetupWizardStep) => {
    setState((prev) => ({
      ...prev,
      completedSteps: prev.completedSteps.includes(step)
        ? prev.completedSteps
        : [...prev.completedSteps, step],
    }));
  }, []);

  const resetWizard = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const canGoBack = useMemo(() => {
    return getPreviousStep(state.currentStep) !== null;
  }, [state.currentStep]);

  const canGoForward = useMemo(() => {
    return getNextStep(state.currentStep) !== null;
  }, [state.currentStep]);

  const isStepComplete = useCallback(
    (step: SetupWizardStep) => {
      return state.completedSteps.includes(step);
    },
    [state.completedSteps]
  );

  const progress = useMemo(() => {
    const currentStepNumber = getStepNumber(state.currentStep);
    const totalSteps = getTotalSteps();
    return {
      current: currentStepNumber,
      total: totalSteps,
      percentage: Math.round((currentStepNumber / totalSteps) * 100),
    };
  }, [state.currentStep]);

  return {
    // State
    ...state,
    steps: SETUP_WIZARD_STEPS,
    progress,
    canGoBack,
    canGoForward,

    // Actions
    goToStep,
    goToNextStep,
    goToPreviousStep,
    setAdminData,
    setInstanceData,
    setTeamData,
    setIncludeSampleData,
    markStepComplete,
    resetWizard,
    isStepComplete,
  };
}

export type UseSetupWizardReturn = ReturnType<typeof useSetupWizard>;
