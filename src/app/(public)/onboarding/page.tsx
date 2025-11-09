"use client";

import { useSearchParams } from "next/navigation";

import { OnboardingScreen } from "@features/auth";

export default function OnboardingPage() {
  const searchParams = useSearchParams();
  const invitationToken = searchParams.get("token");
  const invitedTeamName = searchParams.get("team") ?? "Canvas Reviewers";

  return (
    <OnboardingScreen
      invitationToken={invitationToken}
      invitedTeamName={invitedTeamName}
    />
  );
}
