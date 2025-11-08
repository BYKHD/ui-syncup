import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import type { InvitationDetails, OnboardingMode, PlanTier } from "../types";
import { onboardingSchema, type OnboardingSchema } from "../utils/validators";

export function useOnboarding(
  invitationToken: string | null,
  invitedTeamName: string,
) {
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
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>("starter");

  const form = useForm<OnboardingSchema>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      teamName: invitedTeamName,
    },
  });

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

  const handleCreateTeam = form.handleSubmit((data) => {
    setError(null);
    setMessage(null);
    setStatus("working");

    // Mock API call - replace with real team creation later
    setTimeout(() => {
      setStatus("idle");
      const planLabel = selectedPlan === "starter" ? "Free" : "Pro";
      setMessage(
        `Team "${data.teamName.trim()}" created with ${planLabel} plan. Mock redirect to projects coming soon.`,
      );
    }, 700);
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
    status,
    message,
    error,
    form,
    selectedPlan,
    setSelectedPlan,
    handleCreateTeam,
    handleAcceptInvitation,
    switchMode,
  };
}
