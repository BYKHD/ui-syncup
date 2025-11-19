import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Check } from "lucide-react"
import Link from "next/link"

export function PricingSection() {
  return (
    <section className="container mx-auto px-4 py-24 bg-muted/30">
      <div className="text-center mb-16">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-4">Pricing that scales with your design surface</h2>
        <p className="text-muted-foreground text-lg">Start for free, upgrade when you need more control.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-2xl">Free</CardTitle>
            <CardDescription>Perfect for a squad or hobby project.</CardDescription>
            <div className="mt-4 text-4xl font-bold">$0</div>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="space-y-3">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>10 users</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>1 project</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>50 issues</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Unlimited viewers</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Link href="/sign-up" className="w-full">
              <Button variant="outline" className="w-full">Start for free</Button>
            </Link>
          </CardFooter>
        </Card>

        <Card className="flex flex-col border-primary shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-medium rounded-bl-lg">
            POPULAR
          </div>
          <CardHeader>
            <CardTitle className="text-2xl">Pro</CardTitle>
            <CardDescription>For growing teams shipping fast.</CardDescription>
             <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold">$8</span>
              <span className="text-muted-foreground">/ editor / month</span>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="space-y-3">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span>Unlimited projects</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span>Unlimited issues</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span>Unlimited developer seats (free)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span>Priority support</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Link href="/sign-up" className="w-full">
              <Button className="w-full">Get Started</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </section>
  )
}
