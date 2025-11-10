'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@components/ui/card'
import { cn } from '@lib/utils'

import type { PlanTier } from '../types'
import { planOptions } from '../utils/constants'

interface PlanSelectorProps {
  selectedPlan: PlanTier
  onPlanChange: (plan: PlanTier) => void
}

export function PlanSelector({
  selectedPlan,
  onPlanChange,
}: PlanSelectorProps) {
  return (
    <Card className="border-muted bg-background">
      <CardHeader>
        <CardTitle>Pick a plan</CardTitle>
        <CardDescription>
          Choose the plan that best fits your team's needs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {planOptions.map((plan) => (
          <button
            key={plan.id}
            type="button"
            onClick={() => onPlanChange(plan.id)}
            aria-pressed={selectedPlan === plan.id}
            className={cn(
              'w-full rounded-xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              selectedPlan === plan.id
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-muted bg-background hover:border-primary/50'
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{plan.label}</p>
                <p className="text-xs text-muted-foreground">
                  {plan.description}
                </p>
              </div>
              <span className="text-sm font-semibold">{plan.price}</span>
            </div>
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              {plan.features.map((feature) => (
                <li key={feature}>• {feature}</li>
              ))}
            </ul>
          </button>
        ))}
      </CardContent>
    </Card>
  )
}
