"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useCreateTeam, useTeams } from "@/features/teams";
import type { InvitationDetails, OnboardingMode, PlanTier } from "../types";
import { onboardingSchema, type OnboardingSchema } from "../utils/validators";

export function useOnboarding(
  invitationToken: string | null,
  invitedTeamName: string,
) {
  const router = useRouter();
  const { mutate: createTeam, isPending: isCreating } = useCreateTeam();
  const { data: teamsData, isLoading: isLoadingTeams } = useTeams();

  const [mode, setMode] = useState<OnboardingMode>(
    invitationToken ? "accept" : "create",
  );
  const [invitationDetails, setInvitationDetails] =
    useState<InvitationDetails | null>(null);
  const [loadingInvitation, setLoadingInvitation] = useState(
    Boolean(invitationToken),
  );
  const [status, setStatus] = useState<"idle" | "working">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>("free");
  const [hasExistingTeams, setHasExistingTeams] = useState(false);

  const form = useForm<OnboardingSchema>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      teamName: invitedTeamName,
    },
  });

  // Check for existing teams (Requirement 17.5)
  useEffect(() => {
    if (
      !isLoadingTeams &&
      teamsData?.teams &&
      teamsData.teams.length > 0 &&
      !invitationToken &&
      mode === "create"
    ) {
      setHasExistingTeams(true);
    }
  }, [teamsData, isLoadingTeams, invitationToken, mode]);

  // Mock fetch invitation details
  useEffect(() => {
    if (!invitationToken) {
      setInvitationDetails(null);
      setLoadingInvitation(false);
      setMode("create");
      return;
    }

    setLoadingInvitation(true);
    const timer = setTimeout(() => {
      // Mock invitation details - replace with real API call later
      setInvitationDetails({
        teamName: invitedTeamName || "Northwind Design",
        inviterName: "Riley Blake",
        role: "Reviewer",
      });
      setLoadingInvitation(false);
      setMode("accept");
    }, 600);

    return () => clearTimeout(timer);
  }, [invitationToken, invitedTeamName]);

  // Sync team name with query param
  useEffect(() => {
    if (!invitationToken) {
      form.setValue("teamName", invitedTeamName);
    }
  }, [invitationToken, invitedTeamName, form]);

  const handleCreateTeam = form.handleSubmit(async (data) => {
    setError(null);
    setMessage(null);
    
    if (selectedPlan === "pro") {
      setError("Pro plan is coming soon. Please select the Free plan.");
      return;
    }

    createTeam(
      { name: data.teamName, description: "" },
      {
        onSuccess: async (response) => {
          toast.success("Team created successfully");
          
          // Requirement 17.3: Switch to the new team as active team
          try {
            const switchResponse = await fetch(`/api/teams/${response.team.id}/switch`, {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              },
            });

            if (!switchResponse.ok) {
              throw new Error('Failed to switch team context');
            }

            // Requirement 17.4: Redirect to projects page with new team context
            router.push("/projects");
          } catch (err) {
            setError("Team created but failed to switch context. Please refresh the page.");
          }
        },
        onError: (err) => {
          setError(err.message || "Failed to create team");
        },
      }
    );
  });

  const handleAcceptInvitation = () => {
    if (!invitationDetails) {
      return;
    }

    setStatus("working");
    setError(null);
    setMessage(null);

    // Mock API call - replace with real invitation acceptance later
    setTimeout(() => {
      setStatus("idle");
      setMessage(
        `Accepted invite to ${invitationDetails.teamName}. Navigation is mocked in this build.`,
      );
    }, 600);
  };

  const switchMode = (newMode: OnboardingMode) => {
    setMode(newMode);
    setMessage(null);
    setError(null);
  };

  return {
    mode,
    invitationDetails,
    loadingInvitation,
    status: isCreating ? "working" : status,
    message,
    error,
    form,
    selectedPlan,
    setSelectedPlan,
    handleCreateTeam,
    handleAcceptInvitation,
    switchMode,
    hasExistingTeams,
  };
}
