"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SectionContainer } from "@/components/shared/section-container"

/**
 * Hero section with tagline, value proposition, and primary CTAs
 */
export function HeroSection() {
  return (
    <SectionContainer className="pt-20 md:pt-28 pb-16 md:pb-24">
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
        {/* Left: Copy + CTAs */}
        <div className="flex flex-col gap-6 text-center lg:text-left">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              Close the loop between{" "}
              <span className="text-primary">design and implementation</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0">
              Pin feedback on mockups, turn comments into issues, track every UI
              detail from design review to production.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
            <Button size="lg" asChild>
              <Link href="/sign-up">Start Free Workspace</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#demo">See it in Action</Link>
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground justify-center lg:justify-start">
            <div className="flex items-center gap-1.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4 text-green-600"
              >
                <path
                  fillRule="evenodd"
                  d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Free forever plan</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4 text-green-600"
              >
                <path
                  fillRule="evenodd"
                  d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                  clipRule="evenodd"
                />
              </svg>
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4 text-green-600"
              >
                <path
                  fillRule="evenodd"
                  d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Unlimited developer seats</span>
            </div>
          </div>
        </div>

        {/* Right: Hero Visual */}
        <div className="relative">
          <div className="relative aspect-[4/3] rounded-lg border bg-muted/30 p-4 shadow-2xl">
            {/* Mock annotation board preview */}
            <div className="h-full w-full bg-gradient-to-br from-background to-muted rounded border flex items-center justify-center">
              <div className="relative w-full h-full p-6">
                {/* Simulated UI screenshot with pins */}
                <div className="absolute inset-6 bg-card border rounded-lg shadow-sm">
                  {/* Mock content */}
                  <div className="p-4 space-y-3">
                    <div className="h-3 bg-muted rounded w-1/3" />
                    <div className="h-2 bg-muted rounded w-2/3" />
                    <div className="h-2 bg-muted rounded w-1/2" />
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="h-16 bg-muted rounded" />
                      <div className="h-16 bg-muted rounded" />
                    </div>
                  </div>

                  {/* Annotation pins */}
                  <div
                    className="absolute w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg cursor-pointer flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ top: "30%", left: "25%" }}
                  >
                    1
                  </div>
                  <div
                    className="absolute w-6 h-6 bg-amber-500 rounded-full border-2 border-white shadow-lg cursor-pointer flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ top: "60%", right: "30%" }}
                  >
                    2
                  </div>
                  <div
                    className="absolute w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg cursor-pointer flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ bottom: "25%", left: "45%" }}
                  >
                    3
                  </div>
                </div>

                {/* Issues panel preview (floating) */}
                <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-48 bg-background border rounded-lg shadow-xl p-3 space-y-2">
                  <div className="text-xs font-semibold">Issues (3)</div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-[10px]">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                      <span className="flex-1 truncate">Button padding...</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                      <span className="flex-1 truncate">Contrast ratio...</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                      <span className="flex-1 truncate">Card shadow...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SectionContainer>
  )
}
