import { LandingScreen } from "@/features/landing"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "UI SyncUp - Visual feedback to ship pixel-perfect UI",
  description:
    "Pin feedback on mockups, turn comments into issues, track every UI detail from design review to production. Free forever plan for small teams.",
}

/**
 * Root homepage route
 * Public page (no auth required)
 * Renders the landing screen with all marketing sections
 */
export default function HomePage() {
  return <LandingScreen />
}
