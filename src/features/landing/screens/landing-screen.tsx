import { SiteHeader } from "../components/site-header"
import { HeroSection } from "../components/hero-section"
import { HowItWorksSection } from "../components/how-it-works-section"
import { PersonasSection } from "../components/personas-section"
import { WorkflowSection } from "../components/workflow-section"
import { HierarchySection } from "../components/hierarchy-section"
import { PricingSection } from "../components/pricing-section"
import { DemoSection } from "../components/demo-section"
import { IntegrationsSection } from "../components/integrations-section"
import { TrustSection } from "../components/trust-section"
import { SiteFooter } from "../components/site-footer"

export default function LandingScreen() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <HeroSection />
        <HowItWorksSection />
        <PersonasSection />
        <WorkflowSection />
        <HierarchySection />
        <PricingSection />
        <DemoSection />
        <IntegrationsSection />
        <TrustSection />
      </main>
      <SiteFooter />
    </div>
  )
}
