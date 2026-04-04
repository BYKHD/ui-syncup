'use client';

/**
 * useSelfRegistration Hook
 * @description Manages self-registration flow state for new users without invitations
 * 
 * Handles:
 * - Team mode detection (single vs multi)
 * - Auto-join to default team in single-team mode
 * - Team creation with TEAM_OWNER role assignment
 * - Navigation flow management
 * 
 * @requirements 8.3, 8.6, 12.3
 */

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { useTeamMode } from '@/features/setup/hooks/use-team-mode';
import { useInstanceStatus } from '@/features/setup/hooks/use-instance-status';
import { useCreateTeam } from '@/features/teams';
import type { SelfRegistrationPath } from '../components/self-registration-choice';

export type SelfRegistrationStep =
  | 'choice'        // Show create/join choice (multi-team only)
  | 'enter-code'    // Enter invite code
  | 'create-team'   // Create team form
  | 'auto-joining'  // Auto-joining default team (single-team only)
  | 'complete';     // Registration complete

interface UseSelfRegistrationReturn {
  /** Current step in the self-registration flow */
  step: SelfRegistrationStep;
  /** Whether any operation is in progress */
  isLoading: boolean;
  /** Error message if any operation failed */
  error: string | null;
  /** Whether in multi-team mode */
  isMultiTeamMode: boolean;
  /** Whether in single-team mode */
  isSingleTeamMode: boolean;
  /** Handle path selection (create team or enter invite code) */
  selectPath: (path: SelfRegistrationPath) => void;
  /** Go back to choice step */
  goBack: () => void;
  /** Auto-join default team (single-team mode) */
  autoJoinDefaultTeam: () => Promise<void>;
  /** Create a new team with the given name */
  createTeam: (name: string) => Promise<void>;
  /** Validate and proceed with invite code */
  submitInviteCode: (code: string) => Promise<void>;
  /** Clear any error state */
  clearError: () => void;
}

export function useSelfRegistration(): UseSelfRegistrationReturn {
  const router = useRouter();
  const { isMultiTeamMode, isSingleTeamMode, isLoading: isLoadingMode } = useTeamMode();
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
    if (path === 'create-team') {
      setStep('create-team');
    } else {
      setStep('enter-code');
    }
  }, [clearError]);

  const goBack = useCallback(() => {
    clearError();
    setStep('choice');
  }, [clearError]);

  const autoJoinDefaultTeam = useCallback(async () => {
    if (!isSingleTeamMode) {
      return;
    }

    setStep('auto-joining');
    setIsAutoJoining(true);
    setError(null);

    try {
      const defaultTeamId = instanceStatus?.defaultTeamId;
      
      if (!defaultTeamId) {
        throw new Error('Default team not configured. Please contact your administrator.');
      }

      // Call API to join the default team
      const response = await fetch(`/api/teams/${defaultTeamId}/join`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to join team');
      }

      // Switch to the joined team context
      await fetch(`/api/teams/${defaultTeamId}/switch`, {
        method: 'POST',
        credentials: 'include',
      });

      toast.success('Welcome! You've been added to the team.');
      setStep('complete');
      router.push('/projects');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join team');
      setStep('choice');
    } finally {
      setIsAutoJoining(false);
    }
  }, [isSingleTeamMode, instanceStatus?.defaultTeamId, router]);

  const createTeam = useCallback(async (name: string) => {
    setError(null);

    try {
      const result = await createTeamAsync({ name, description: '' });

      // Switch to the new team
      await fetch(`/api/teams/${result.team.id}/switch`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      toast.success('Team created successfully!');
      setStep('complete');
      router.push('/projects');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team');
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
    isMultiTeamMode,
    isSingleTeamMode,
    selectPath,
    goBack,
    autoJoinDefaultTeam,
    createTeam,
    submitInviteCode,
    clearError,
  };
}
