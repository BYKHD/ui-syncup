'use client';

/**
 * useAcceptInvitation Hook
 * @description Manages invitation acceptance flow for both new and existing users
 * 
 * Features:
 * - Fetch invitation details from token
 * - Handle account creation for new users
 * - Handle workspace joining for existing users
 * - Error handling for invalid/expired tokens
 * 
 * @requirements 7.6, 7.7
 */

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { InvitationDetails } from '../components/invited-user-form';

interface AcceptWithNewAccountData {
  name: string;
  email: string;
  password: string;
}

interface UseAcceptInvitationReturn {
  /** Invitation details (null while loading or on error) */
  invitation: InvitationDetails | null;
  /** Whether invitation is being fetched */
  isLoadingInvitation: boolean;
  /** Whether user already has an account with the invited email */
  hasExistingAccount: boolean;
  /** Pre-filled email for existing account */
  existingEmail: string | undefined;
  /** Whether acceptance is in progress */
  isAccepting: boolean;
  /** Error message */
  error: string | null;
  /** Accept invitation with new account creation */
  acceptWithNewAccount: (data: AcceptWithNewAccountData) => Promise<void>;
  /** Accept invitation for existing user */
  acceptExistingUser: () => Promise<void>;
  /** Decline the invitation */
  declineInvitation: () => void;
  /** Clear error state */
  clearError: () => void;
}

async function fetchInvitationDetails(token: string): Promise<{
  invitation: InvitationDetails;
  hasExistingAccount: boolean;
  existingEmail?: string;
}> {
  const response = await fetch(`/api/invitations/${token}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Invalid or expired invitation');
  }

  return response.json();
}

export function useAcceptInvitation(token: string): UseAcceptInvitationReturn {
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    data,
    isLoading: isLoadingInvitation,
    error: queryError,
  } = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => fetchInvitationDetails(token),
    enabled: Boolean(token),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });

  const invitation = data?.invitation ?? null;
  const hasExistingAccount = data?.hasExistingAccount ?? false;
  const existingEmail = data?.existingEmail;

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const acceptWithNewAccount = useCallback(
    async (accountData: AcceptWithNewAccountData) => {
      setIsAccepting(true);
      setError(null);

      try {
        // First create the account
        const signUpResponse = await fetch('/api/auth/sign-up', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: accountData.name,
            email: accountData.email,
            password: accountData.password,
          }),
        });

        if (!signUpResponse.ok) {
          const data = await signUpResponse.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to create account');
        }

        // Then accept the invitation
        const acceptResponse = await fetch(`/api/invitations/${token}/accept`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!acceptResponse.ok) {
          const data = await acceptResponse.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to accept invitation');
        }

        const { teamSlug } = await acceptResponse.json();

        toast.success(`Welcome to ${invitation?.teamName}!`);
        router.push(`/projects`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsAccepting(false);
      }
    },
    [token, invitation?.teamName, router]
  );

  const acceptExistingUser = useCallback(async () => {
    setIsAccepting(true);
    setError(null);

    try {
      // Accept the invitation (user is already signed in)
      const response = await fetch(`/api/invitations/${token}/accept`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        
        // If user needs to sign in first, redirect to sign-in
        if (response.status === 401) {
          router.push(`/sign-in?redirect=/invite/project/${token}`);
          return;
        }
        
        throw new Error(data.error || 'Failed to accept invitation');
      }

      toast.success(`Welcome to ${invitation?.teamName}!`);
      router.push(`/projects`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsAccepting(false);
    }
  }, [token, invitation?.teamName, router]);

  const declineInvitation = useCallback(() => {
    router.push('/');
  }, [router]);

  // Combine query error with local error
  const displayError = error || (queryError instanceof Error ? queryError.message : null);

  return {
    invitation,
    isLoadingInvitation,
    hasExistingAccount,
    existingEmail,
    isAccepting,
    error: displayError,
    acceptWithNewAccount,
    acceptExistingUser,
    declineInvitation,
    clearError,
  };
}
