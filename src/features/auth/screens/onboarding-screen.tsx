"use client";

import { OnboardingForm } from "../components/onboarding-form";
import { useOnboarding } from "../hooks/use-onboarding";

interface OnboardingScreenProps {
  invitationToken: string | null;
  invitedTeamName: string;
}

export default function OnboardingScreen({
  invitationToken,
  invitedTeamName,
}: OnboardingScreenProps) {
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
    hasExistingTeams,
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
          hasExistingTeams={hasExistingTeams}
        />
      </div>
    </section>
  );
}
