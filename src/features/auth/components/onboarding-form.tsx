"use client";

import type { UseFormReturn } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { InvitationDetails, OnboardingMode, PlanTier } from "../types";
import type { OnboardingSchema } from "../utils/validators";
import { OnboardingPlanSelector } from "./onboarding-plan-selector";

type OnboardingFormProps = {
  mode: OnboardingMode;
  invitationDetails: InvitationDetails | null;
  loadingInvitation: boolean;
  status: "idle" | "working";
  message: string | null;
  error: string | null;
  form: UseFormReturn<OnboardingSchema>;
  invitationToken: string | null;
  selectedPlan: PlanTier;
  onPlanChange: (plan: PlanTier) => void;
  onCreateTeam: (event: React.FormEvent<HTMLFormElement>) => void;
  onAcceptInvitation: () => void;
  onSwitchMode: (mode: OnboardingMode) => void;
  hasExistingTeams?: boolean;
};

export function OnboardingForm({
  mode,
  invitationDetails,
  loadingInvitation,
  status,
  message,
  error,
  form,
  invitationToken,
  selectedPlan,
  onPlanChange,
  onCreateTeam,
  onAcceptInvitation,
  onSwitchMode,
  hasExistingTeams = false,
}: OnboardingFormProps) {
  const {
    register,
    formState: { errors },
  } = form;

  const headerCopy =
    mode === "accept"
      ? {
          title: "Join your team",
          description:
            "Preview how invitation flows will feel once wired to the API.",
        }
      : {
          title: hasExistingTeams ? "Create another team" : "Create your team",
          description: hasExistingTeams
            ? "Add a new workspace to organize additional projects and collaborate with different teams."
            : "Name the workspace that will house feedback streams and reviews.",
        };

  const footerCopy =
    mode === "accept"
      ? "Accepting the invite will drop you into the shared dashboard once backend wiring is complete."
      : "Creating a team provisions sample projects so you can explore UI flows without real data.";

  return (
    <div className="w-full max-w-2xl space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">
          Welcome to UI Feedback Tracker!
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "accept"
            ? "You can review the invitation experience below."
            : "Spin up a workspace to tour the dashboard shell."}
        </p>
      </div>

      <Card className="border-muted bg-background">
        <CardHeader>
          <CardTitle>{headerCopy.title}</CardTitle>
          <CardDescription>{headerCopy.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {message && (
            <Alert>
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Heads up</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loadingInvitation ? (
            <div className="rounded-lg border border-dashed border-muted px-4 py-6 text-sm text-muted-foreground">
              Loading invitation details…
            </div>
          ) : mode === "accept" && invitationDetails ? (
            <div className="space-y-5">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">
                  {invitationDetails.teamName}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {invitationDetails.inviterName} invited you as a{" "}
                  {invitationDetails.role}. Accepting gives you access to
                  active review streams.
                </p>
              </div>

              <Button
                className="w-full"
                disabled={status === "working"}
                onClick={onAcceptInvitation}
              >
                {status === "working" ? "Accepting…" : "Accept invitation"}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={status === "working"}
                onClick={() => onSwitchMode("create")}
              >
                Create my own team instead
              </Button>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={onCreateTeam}>
              <div className="space-y-2">
                <Label htmlFor="teamName">Team name</Label>
                <Input
                  id="teamName"
                  {...register("teamName")}
                  disabled={status === "working"}
                  placeholder="Northwind Design Reviewers"
                  autoFocus
                  required
                />
                {errors.teamName && (
                  <p className="text-xs text-destructive">
                    {errors.teamName.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  You can edit this later in workspace settings.
                </p>
              </div>

              <OnboardingPlanSelector
                selectedPlan={selectedPlan}
                onPlanChange={onPlanChange}
                disabled={status === "working"}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={status === "working"}
              >
                {status === "working" ? "Creating workspace…" : "Continue"}
              </Button>

              {invitationToken && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={status === "working"}
                  onClick={() => onSwitchMode("accept")}
                >
                  Accept team invitation instead
                </Button>
              )}
            </form>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        {footerCopy}
      </p>
    </div>
  );
}
