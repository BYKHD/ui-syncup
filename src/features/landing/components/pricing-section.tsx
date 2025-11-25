"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion } from "motion/react"
import { Check, X, Sparkles, DollarSign } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { SectionHeader } from "./section-header"

const plans = [
  {
    name: "Free",
    price: "$0",
    description: "Perfect for a squad or hobby project",
    popular: false,
    features: [
      { text: "10 users", included: true },
      { text: "1 project", included: true },
      { text: "50 issues", included: true },
      { text: "Unlimited viewers", included: true },
      { text: "Priority support", included: false },
      { text: "Advanced integrations", included: false },
    ]
  },
  {
    name: "Pro",
    price: "$8",
    period: "/ editor / month",
    description: "For growing teams shipping fast",
    popular: true,
    features: [
      { text: "Unlimited users", included: true },
      { text: "Unlimited projects", included: true },
      { text: "Unlimited issues", included: true },
      { text: "Unlimited viewers", included: true },
      { text: "Priority support", included: true },
      { text: "Advanced integrations", included: true },
    ]
  }
]

export function PricingSection() {
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null)

  return (
    <section className="container mx-auto px-4 py-24 relative overflow-hidden">
      <SectionHeader
        badge="Pricing"
        title="Pricing that scales with you"
        description="Start for free, upgrade when you need more control. No hidden fees."
      />

      <div className="mt-16 grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {plans.map((plan, planIndex) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: planIndex * 0.1 }}
            onHoverStart={() => setHoveredPlan(plan.name)}
            onHoverEnd={() => setHoveredPlan(null)}
          >
            <Card className={`
              flex flex-col h-full relative overflow-hidden transition-all duration-500
              ${plan.popular 
                ? "border-primary/50 shadow-2xl shadow-primary/5 scale-[1.02]" 
                : "hover:border-primary/20 hover:shadow-xl"
              }
            `}>
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute top-0 right-0">
                  <div className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-xl">
                    POPULAR
                  </div>
                </div>
              )}

              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && (
                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      {feature.included ? (
                        <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3 text-primary" />
                        </div>
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <X className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                      <span className={feature.included ? "text-foreground" : "text-muted-foreground"}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Link href="/sign-up" className="w-full">
                  <Button 
                    className="w-full" 
                    variant={plan.popular ? "default" : "outline"}
                    size="lg"
                  >
                    {plan.popular ? "Get Started" : "Start for free"}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground mt-12">
        All plans include unlimited viewers. Need enterprise features?{" "}
        <a href="#" className="text-primary hover:underline font-medium">
          Contact sales
        </a>
      </p>
    </section>
  )
}
