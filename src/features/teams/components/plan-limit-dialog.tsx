"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { PLANS } from "@/config/tiers";

export interface PlanLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limitType: "members" | "projects" | "issues";
  currentUsage: number;
  limit: number;
}

/**
 * Dialog shown when a team reaches a plan limit
 * Shows current usage, limit, and upgrade information
 * 
 * Implements Requirements 11.1, 11.2, 11.3
 */
export function PlanLimitDialog({
  open,
  onOpenChange,
  limitType,
  currentUsage,
  limit,
}: PlanLimitDialogProps) {
  const limitLabels = {
    members: "team members",
    projects: "projects",
    issues: "issues",
  };

  const limitLabel = limitLabels[limitType];
  const freePlan = PLANS.free;
  const proPlan = PLANS.pro;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Plan Limit Reached</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                You've reached the {freePlan.label} plan limit of {limit}{" "}
                {limitLabel}.
              </p>

              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Current Usage</span>
                  <span className="text-sm text-muted-foreground">
                    {currentUsage} / {limit}
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${(currentUsage / limit) * 100}%` }}
                  />
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">Pro Plan</h4>
                  <Badge variant="secondary">Coming Soon</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  The Pro plan will offer:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  {limitType === "members" && (
                    <li>Unlimited team members</li>
                  )}
                  {limitType === "projects" && (
                    <li>Up to {proPlan.limits.projects} projects</li>
                  )}
                  {limitType === "issues" && <li>Unlimited issues</li>}
                  <li>Priority support</li>
                  <li>Advanced analytics</li>
                  <li>Jira integration</li>
                </ul>
                {proPlan.billing.model === "per_editor" && (
                  <p className="text-sm font-medium mt-2">
                    ${proPlan.billing.priceUSD}/month per editor
                  </p>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                We're working hard to bring you the Pro plan. Stay tuned for
                updates!
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
          <AlertDialogAction disabled>
            Upgrade to Pro (Coming Soon)
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
