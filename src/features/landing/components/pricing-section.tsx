"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SectionContainer } from "@/components/shared/section-container"

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    billing: "forever",
    description: "Perfect for small teams getting started",
    features: [
      "10 team members",
      "1 project",
      "25 issues",
      "100 MB storage",
      "Public & private projects",
      "Visual annotations & pins",
      "Issue workflow tracking",
      "Community support",
    ],
    cta: "Start Free",
    href: "/sign-up",
    featured: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$8",
    billing: "per editor / month",
    description: "For growing teams shipping pixel-perfect UI",
    features: [
      "Unlimited team members",
      "50 projects",
      "Unlimited issues",
      "80 GB storage",
      "Everything in Free, plus:",
      "Jira & Linear integration",
      "Advanced analytics & reports",
      "Priority support",
      "Unlimited developer & viewer seats (free)",
    ],
    cta: "Start Free Trial",
    href: "/sign-up?plan=pro",
    featured: true,
  },
]

/**
 * Pricing section: Free and Pro tier comparison
 */
export function PricingSection() {
  return (
    <SectionContainer variant="muted" id="pricing">
      <div className="space-y-12">
        {/* Section header */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Pricing that scales with your design surface
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start free, upgrade when you need more. Only pay for editor seats—developers and viewers are always free.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={
                plan.featured
                  ? "border-primary shadow-lg relative"
                  : "hover:shadow-lg transition-shadow"
              }
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-8 pt-6">
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                </div>
                <div className="mt-4">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold">{plan.price}</span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {plan.billing}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Features list */}
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-3 h-3"
                        >
                          <path
                            fillRule="evenodd"
                            d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <span
                        className={
                          feature.includes("Everything in") || feature.includes("Unlimited developer")
                            ? "text-sm font-medium"
                            : "text-sm"
                        }
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  size="lg"
                  variant={plan.featured ? "default" : "outline"}
                  className="w-full"
                  asChild
                >
                  <Link href={plan.href}>{plan.cta}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional info */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            All plans include 14-day money-back guarantee. No credit card required to start.
          </p>
          <Button variant="link" asChild>
            <Link href="#demo">See how pricing works →</Link>
          </Button>
        </div>
      </div>
    </SectionContainer>
  )
}
