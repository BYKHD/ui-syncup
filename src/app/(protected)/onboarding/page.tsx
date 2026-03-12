"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { OnboardingScreen } from "@/features/auth";

function OnboardingContent() {
  const searchParams = useSearchParams();
  const invitationToken = searchParams.get("token");
  const invitedTeamName = searchParams.get("team") ?? "";

  return (
    <OnboardingScreen
      invitationToken={invitationToken}
      invitedTeamName={invitedTeamName}
    />
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OnboardingContent />
    </Suspense>
  );
}
