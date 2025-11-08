"use client";

import { useSearchParams } from "next/navigation";

import { OnboardingForm, useOnboarding } from "@features/auth";

export default function OnboardingPage() {
  const searchParams = useSearchParams();
  const invitationToken = searchParams.get("token");
  const invitedTeamName = searchParams.get("team") ?? "Canvas Reviewers";

  const {
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
  } = useOnboarding(invitationToken, invitedTeamName);

  return (
    <section className="bg-muted min-h-screen">
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <OnboardingForm
          mode={mode}
          invitationDetails={invitationDetails}
          loadingInvitation={loadingInvitation}
          status={status}
          message={message}
          error={error}
          form={form}
          invitationToken={invitationToken}
          selectedPlan={selectedPlan}
          onPlanChange={setSelectedPlan}
          onCreateTeam={handleCreateTeam}
          onAcceptInvitation={handleAcceptInvitation}
          onSwitchMode={switchMode}
        />
      </div>
    </section>
  );
}
