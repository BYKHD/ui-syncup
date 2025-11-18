"use client"

import { LandingHeader } from "../components/landing-header"
import { HeroSection } from "../components/hero-section"
import { HowItWorksSection } from "../components/how-it-works-section"
import { PersonasSection } from "../components/personas-section"
import { WorkflowSection } from "../components/workflow-section"
import { PermissionsSection } from "../components/permissions-section"
import { PricingSection } from "../components/pricing-section"
import { DemoSection } from "../components/demo-section"
import { IntegrationsSection } from "../components/integrations-section"
import { TrustSection } from "../components/trust-section"
import { LandingFooter } from "../components/landing-footer"

/**
 * Landing screen: composes all landing page sections
 * Client component that renders the full homepage experience
 */
export default function LandingScreen() {
  return (
    <div className="flex flex-col min-h-screen">
      <LandingHeader />

      <main className="flex-1">
        <HeroSection />
        <HowItWorksSection />
        <PersonasSection />
        <WorkflowSection />
        <PermissionsSection />
        <DemoSection />
        <PricingSection />
        <IntegrationsSection />
        <TrustSection />
      </main>

      <LandingFooter />
    </div>
  )
}
