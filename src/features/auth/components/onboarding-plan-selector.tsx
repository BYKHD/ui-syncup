"use client";

import { cn } from "@/lib/utils";

import type { PlanTier } from "../types";
import { planOptions } from "../utils/constants";

type OnboardingPlanSelectorProps = {
  selectedPlan: PlanTier;
  onPlanChange: (plan: PlanTier) => void;
  disabled?: boolean;
};

export function OnboardingPlanSelector({
  selectedPlan,
  onPlanChange,
  disabled = false,
}: OnboardingPlanSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">Choose your plan</h3>
        <p className="text-xs text-muted-foreground">
          You can upgrade or downgrade anytime.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {planOptions.map((plan) => {
          const isPro = plan.id === "pro";
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => !isPro && onPlanChange(plan.id)}
              disabled={disabled || isPro}
              aria-pressed={selectedPlan === plan.id}
              className={cn(
                "flex flex-col gap-3 rounded-lg border p-4 text-left transition relative overflow-hidden",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                "disabled:cursor-not-allowed disabled:opacity-50",
                selectedPlan === plan.id
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-muted bg-background hover:border-primary/50",
              )}
            >
              {isPro && (
                <div className="absolute top-3 right-3 rotate-12 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10">
                  Coming Soon
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border-2",
                      selectedPlan === plan.id
                        ? "border-primary bg-primary"
                        : "border-muted-foreground",
                    )}
                  >
                    {selectedPlan === plan.id && (
                      <div className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </div>
                  <p className="font-semibold">{plan.label}</p>
                </div>
                <span className="text-sm font-semibold text-primary">
                  {plan.price}
                </span>
              </div>

              <p className="text-sm text-muted-foreground">{plan.description}</p>

              <ul className="space-y-1 text-xs text-muted-foreground">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
    </div>
  );
}
