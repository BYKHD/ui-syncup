'use client';

/**
 * useSelfRegistration Hook
 * @description Manages self-registration flow state for new users without invitations
 * 
 * Handles:
 * - Workspace mode detection (single vs multi)
 * - Auto-join to default workspace in single-workspace mode
 * - Workspace creation with WORKSPACE_OWNER role assignment
 * - Navigation flow management
 * 
 * @requirements 8.3, 8.6, 12.3
 */

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { useWorkspaceMode } from '@/features/setup/hooks/use-workspace-mode';
import { useInstanceStatus } from '@/features/setup/hooks/use-instance-status';
import { useCreateTeam } from '@/features/teams';
import type { SelfRegistrationPath } from '../components/self-registration-choice';

export type SelfRegistrationStep = 
  | 'choice'           // Show create/join choice (multi-workspace only)
  | 'enter-code'       // Enter invite code
  | 'create-workspace' // Create workspace form
  | 'auto-joining'     // Auto-joining default workspace (single-workspace only)
  | 'complete';        // Registration complete

interface UseSelfRegistrationReturn {
  /** Current step in the self-registration flow */
  step: SelfRegistrationStep;
  /** Whether any operation is in progress */
  isLoading: boolean;
  /** Error message if any operation failed */
  error: string | null;
  /** Whether in multi-workspace mode */
  isMultiWorkspaceMode: boolean;
  /** Whether in single-workspace mode */
  isSingleWorkspaceMode: boolean;
  /** Handle path selection (create workspace or enter invite code) */
  selectPath: (path: SelfRegistrationPath) => void;
  /** Go back to choice step */
  goBack: () => void;
  /** Auto-join default workspace (single-workspace mode) */
  autoJoinDefaultWorkspace: () => Promise<void>;
  /** Create a new workspace with the given name */
  createWorkspace: (name: string) => Promise<void>;
  /** Validate and proceed with invite code */
  submitInviteCode: (code: string) => Promise<void>;
  /** Clear any error state */
  clearError: () => void;
}

export function useSelfRegistration(): UseSelfRegistrationReturn {
  const router = useRouter();
  const { isMultiWorkspaceMode, isSingleWorkspaceMode, isLoading: isLoadingMode } = useWorkspaceMode();
  const { data: instanceStatus } = useInstanceStatus();
  const { mutateAsync: createTeamAsync, isPending: isCreatingTeam } = useCreateTeam();

  const [step, setStep] = useState<SelfRegistrationStep>('choice');
  const [isAutoJoining, setIsAutoJoining] = useState(false);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoading = isLoadingMode || isCreatingTeam || isAutoJoining || isValidatingCode;

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const selectPath = useCallback((path: SelfRegistrationPath) => {
    clearError();
    if (path === 'create-workspace') {
      setStep('create-workspace');
    } else {
      setStep('enter-code');
    }
  }, [clearError]);

  const goBack = useCallback(() => {
    clearError();
    setStep('choice');
  }, [clearError]);

  const autoJoinDefaultWorkspace = useCallback(async () => {
    if (!isSingleWorkspaceMode) {
      return;
    }

    setStep('auto-joining');
    setIsAutoJoining(true);
    setError(null);

    try {
      const defaultWorkspaceId = instanceStatus?.defaultWorkspaceId;
      
      if (!defaultWorkspaceId) {
        throw new Error('Default workspace not configured. Please contact your administrator.');
      }

      // Call API to join the default workspace
      const response = await fetch(`/api/teams/${defaultWorkspaceId}/join`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to join workspace');
      }

      // Switch to the joined workspace context
      await fetch(`/api/teams/${defaultWorkspaceId}/switch`, {
        method: 'POST',
        credentials: 'include',
      });

      toast.success('Welcome! You have been added to the workspace.');
      setStep('complete');
      router.push('/projects');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join workspace');
      setStep('choice');
    } finally {
      setIsAutoJoining(false);
    }
  }, [isSingleWorkspaceMode, instanceStatus?.defaultWorkspaceId, router]);

  const createWorkspace = useCallback(async (name: string) => {
    setError(null);

    try {
      const result = await createTeamAsync({ name, description: '' });

      // Switch to the new workspace
      await fetch(`/api/teams/${result.team.id}/switch`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      toast.success('Workspace created successfully!');
      setStep('complete');
      router.push('/projects');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace');
    }
  }, [createTeamAsync, router]);

  const submitInviteCode = useCallback(async (code: string) => {
    setIsValidatingCode(true);
    setError(null);

    try {
      // Validate the invite code
      const response = await fetch(`/api/invitations/validate`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: code.trim() }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Invalid or expired invite code');
      }

      const { token }  = await response.json();

      // Redirect to invitation acceptance page
      router.push(`/invite/project/${token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate invite code');
    } finally {
      setIsValidatingCode(false);
    }
  }, [router]);

  return {
    step,
    isLoading,
    error,
    isMultiWorkspaceMode,
    isSingleWorkspaceMode,
    selectPath,
    goBack,
    autoJoinDefaultWorkspace,
    createWorkspace,
    submitInviteCode,
    clearError,
  };
}
