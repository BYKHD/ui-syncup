"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "motion/react"
import { Check, X, Sparkles, DollarSign } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

const plans = [
  {
    name: "Free",
    price: "$0",
    description: "Perfect for a squad or hobby project",
    popular: false,
    features: [
      { text: "10 users", included: true, limit: 10, max: 100 },
      { text: "1 project", included: true, limit: 1, max: 100 },
      { text: "50 issues", included: true, limit: 50, max: 1000 },
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
      { text: "Unlimited users", included: true, limit: 100, max: 100 },
      { text: "Unlimited projects", included: true, limit: 100, max: 100 },
      { text: "Unlimited issues", included: true, limit: 1000, max: 1000 },
      { text: "Unlimited viewers", included: true },
      { text: "Priority support", included: true },
      { text: "Advanced integrations", included: true },
    ]
  }
]

// Animated checkmark that draws itself
function AnimatedCheck({ delay = 0, included = true }: { delay?: number, included?: boolean }) {
  const Icon = included ? Check : X
  const color = included ? "text-green-500" : "text-muted-foreground/30"

  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      whileInView={{ scale: 1, rotate: 0 }}
      viewport={{ once: true }}
      transition={{
        delay,
        type: "spring",
        stiffness: 200,
        damping: 15
      }}
    >
      <Icon className={`h-5 w-5 ${color}`} />
    </motion.div>
  )
}

// Usage meter visualization
function UsageMeter({ label, current, max, delay = 0 }: { label: string, current: number, max: number, delay?: number }) {
  const percentage = (current / max) * 100

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      className="space-y-2"
    >
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{current}/{max}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${percentage >= 90 ? 'bg-destructive' : percentage >= 70 ? 'bg-yellow-500' : 'bg-primary'}`}
          initial={{ width: 0 }}
          whileInView={{ width: `${percentage}%` }}
          viewport={{ once: true }}
          transition={{ delay: delay + 0.2, duration: 1, ease: "easeOut" }}
        />
      </div>
    </motion.div>
  )
}

export function PricingSection() {
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null)
  const [comparisonMode, setComparisonMode] = useState(false)

  return (
    <section className="container mx-auto px-4 py-24 bg-muted/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="text-center mb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Badge variant="outline" className="mb-4 gap-2">
            <DollarSign className="h-3 w-3" />
            Simple Pricing
          </Badge>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-3xl font-bold tracking-tight md:text-4xl mb-4"
        >
          Pricing that scales with your design surface
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground text-lg"
        >
          Start for free, upgrade when you need more control.
        </motion.p>

        {/* Comparison toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-6"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => setComparisonMode(!comparisonMode)}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {comparisonMode ? "Hide" : "Show"} Feature Comparison
          </Button>
        </motion.div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {plans.map((plan, planIndex) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: planIndex * 0.2 }}
            onHoverStart={() => setHoveredPlan(plan.name)}
            onHoverEnd={() => setHoveredPlan(null)}
            className="relative"
          >
            <Card className={`flex flex-col h-full relative overflow-hidden transition-all duration-300 ${
              plan.popular
                ? "border-2 border-primary shadow-2xl"
                : "hover:shadow-xl"
            }`}>
              {/* Gradient overlay on hover */}
              <motion.div
                className={`absolute inset-0 bg-gradient-to-br ${
                  plan.popular
                    ? "from-primary/5 to-blue-500/5"
                    : "from-muted/30 to-transparent"
                } pointer-events-none`}
                animate={{
                  opacity: hoveredPlan === plan.name ? 1 : 0
                }}
                transition={{ duration: 0.3 }}
              />

              {/* Popular badge */}
              {plan.popular && (
                <motion.div
                  initial={{ x: 100, opacity: 0 }}
                  whileInView={{ x: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5, type: "spring" }}
                  className="absolute top-0 right-0 bg-gradient-to-r from-primary to-blue-500 text-primary-foreground px-3 py-1 text-xs font-bold rounded-bl-lg flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3" />
                  POPULAR
                </motion.div>
              )}

              <CardHeader className="relative">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: planIndex * 0.2 + 0.2 }}
                >
                  <CardTitle className="text-3xl">{plan.name}</CardTitle>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: planIndex * 0.2 + 0.3 }}
                >
                  <CardDescription className="text-base">{plan.description}</CardDescription>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: planIndex * 0.2 + 0.4, type: "spring" }}
                  className="mt-6 flex items-baseline gap-1"
                >
                  <span className={`text-5xl font-bold ${plan.popular ? "text-primary" : ""}`}>
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-muted-foreground">{plan.period}</span>
                  )}
                </motion.div>

                {/* Usage meters for Free plan */}
                {!plan.popular && comparisonMode && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-6 space-y-3 pt-4 border-t"
                  >
                    <p className="text-xs font-medium text-muted-foreground mb-3">Current usage example:</p>
                    {plan.features.slice(0, 3).map((feature, i) => (
                      feature.limit && feature.max && (
                        <UsageMeter
                          key={i}
                          label={feature.text}
                          current={feature.limit}
                          max={feature.max}
                          delay={i * 0.1}
                        />
                      )
                    ))}
                  </motion.div>
                )}
              </CardHeader>

              <CardContent className="flex-1 relative">
                <ul className="space-y-4">
                  {plan.features.map((feature, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: planIndex * 0.2 + 0.5 + (i * 0.05) }}
                      className={`flex items-center gap-3 ${!feature.included && "opacity-50"}`}
                    >
                      <AnimatedCheck
                        delay={planIndex * 0.2 + 0.5 + (i * 0.05)}
                        included={feature.included}
                      />
                      <span className={feature.included ? "font-medium" : "text-muted-foreground line-through"}>
                        {feature.text}
                      </span>

                      {/* Show comparison on hover */}
                      <AnimatePresence>
                        {comparisonMode && hoveredPlan === plan.name && feature.included && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="ml-auto"
                          >
                            <Badge variant="secondary" className="text-[10px]">
                              {plan.popular ? "Unlimited" : "Limited"}
                            </Badge>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.li>
                  ))}
                </ul>

                {/* Value highlight for Pro */}
                {plan.popular && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.8 }}
                    className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20"
                  >
                    <p className="text-sm font-medium text-primary flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Developers seats are FREE • Pay only for editors
                    </p>
                  </motion.div>
                )}
              </CardContent>

              <CardFooter className="relative">
                <Link href="/sign-up" className="w-full">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      className={`w-full ${plan.popular ? "" : "variant-outline"}`}
                      variant={plan.popular ? "default" : "outline"}
                    >
                      {plan.popular ? "Get Started" : "Start for free"}
                    </Button>
                  </motion.div>
                </Link>
              </CardFooter>

              {/* Shine effect on hover */}
              <AnimatePresence>
                {hoveredPlan === plan.name && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    exit={{ x: "100%" }}
                    transition={{ duration: 0.6 }}
                  >
                    <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Bottom note */}
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.8 }}
        className="text-center text-sm text-muted-foreground mt-12"
      >
        All plans include unlimited viewers. Need enterprise features?{" "}
        <a href="#" className="text-primary hover:underline font-medium">
          Contact sales
        </a>
      </motion.p>
    </section>
  )
}
