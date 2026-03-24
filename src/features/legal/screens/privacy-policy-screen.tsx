import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  RiCheckLine, 
  RiShieldCheckLine, 
  RiLockLine, 
  RiEyeOffLine, 
  RiFileListLine, 
  RiGlobalLine, 
  RiMailLine 
} from "@remixicon/react"

const lastUpdated = "May 2025"

const highlights = [
  {
    icon: RiShieldCheckLine,
    title: "Security-first",
    description:
      "Argon2 hashing, httpOnly cookies, and strict RBAC ensure your data is safe.",
  },
  {
    icon: RiLockLine,
    title: "Team-scoped",
    description:
      "Data is strictly isolated to your team with server-enforced permissions.",
  },
  {
    icon: RiEyeOffLine,
    title: "No data selling",
    description:
      "We use your data solely to operate the service. No ads, no selling.",
  },
]

const processors = [
  {
    title: "Supabase",
    type: "Database",
    purpose: "Primary data storage (PostgreSQL)",
    location: "US / EU",
  },
  {
    title: "Cloudflare R2",
    type: "Storage",
    purpose: "Media & Attachments (S3-compatible)",
    location: "Distributed",
  },
  {
    title: "Resend",
    type: "Email",
    purpose: "Transactional emails & notifications",
    location: "US",
  },
  {
    title: "Google / Microsoft / Atlassian",
    type: "Auth",
    purpose: "Optional OAuth identity providers",
    location: "Global",
  },
]

const securityPractices = [
  "Argon2 password hashing (no plaintext stored)",
  "HttpOnly & Secure session cookies",
  "Server-side Role-Based Access Control (RBAC)",
  "Rate limiting on auth & API endpoints",
  "UUID-based obfuscated file keys",
  "Zod-validated environment config",
]

const dataUses = [
  { title: "Service Delivery", desc: "Authenticate users, sync issues, maintain projects." },
  { title: "Communication", desc: "Send invites, resets, and essential notifications." },
  { title: "Security", desc: "Fraud detection, abuse prevention, and audit logging." },
  { title: "Improvement", desc: "Aggregated, anonymous analytics (optional, opt-in)." },
]

export default function PrivacyPolicyScreen() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">

      <main className="flex-1 w-full flex flex-col items-center">
        {/* Hero Section */}
        <section className="w-full border-b bg-muted/30">
          <div className="container mx-auto max-w-5xl px-4 py-16 text-center space-y-6">
            <Badge variant="secondary" className="mb-4">Privacy Policy</Badge>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              We respect your data.
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              UI SyncUp is built for privacy and security from the ground up. 
              We are transparent about what we collect and how we use it.
            </p>
            <p className="text-sm text-muted-foreground pt-4">Last updated: {lastUpdated}</p>
          </div>
        </section>

        {/* Content Section */}
        <section className="container mx-auto max-w-4xl px-4 py-12">
          <Tabs defaultValue="overview" className="w-full space-y-8">
            <div className="flex justify-center">
              <TabsList className="grid w-full max-w-md grid-cols-3 h-auto p-1">
                <TabsTrigger value="overview" className="py-2">Overview</TabsTrigger>
                <TabsTrigger value="data" className="py-2">Data</TabsTrigger>
                <TabsTrigger value="rights" className="py-2">Rights</TabsTrigger>
              </TabsList>
            </div>

            {/* TAB: OVERVIEW */}
            <TabsContent value="overview" className="space-y-12 animate-in fade-in-50 duration-500">
              <div className="grid md:grid-cols-3 gap-6">
                {highlights.map((item, i) => (
                  <div key={i} className="flex flex-col items-center text-center p-6 rounded-xl border bg-card/50 hover:bg-card transition-colors">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
                      <item.icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground text-pretty">{item.description}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-6">
                <h3 className="text-2xl font-semibold tracking-tight">Introduction</h3>
                <div className="prose prose-gray dark:prose-invert max-w-none text-muted-foreground">
                  <p>
                    UI SyncUp is a visual feedback and issue tracking platform. This policy applies to all 
                    information collected through our website and application. By using UI SyncUp, you agree 
                    to the collection and use of information in accordance with this policy.
                  </p>
                  <p className="mt-4">
                    Our business model is simple: we charge for premium features. We do not generate revenue 
                    from selling your personal data or browsing history.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border bg-muted/30 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="font-semibold text-lg mb-1">Questions about this policy?</h3>
                  <p className="text-muted-foreground">Contact our privacy team anytime.</p>
                </div>
                  <Badge variant="outline" className="px-4 py-2 text-sm flex gap-2">
                  <RiMailLine className="h-4 w-4" /> support@uisyncup.com
                </Badge>
              </div>
            </TabsContent>

            {/* TAB: DATA COLLECTION */}
            <TabsContent value="data" className="space-y-10 animate-in fade-in-50 duration-500">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10 text-primary">
                    <RiFileListLine className="h-5 w-5" />
                  </div>
                  <h2 className="text-2xl font-semibold">Information We Collect</h2>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-lg border bg-card">
                    <h3 className="font-semibold mb-2 text-primary">Account Data</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Name & Email address</li>
                      <li>• Hashed passwords (Argon2)</li>
                      <li>• OAuth profile info (if linked)</li>
                    </ul>
                  </div>
                  <div className="p-5 rounded-lg border bg-card">
                    <h3 className="font-semibold mb-2 text-primary">Team Data</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Team & Project metadata</li>
                      <li>• Issues, Comments, Annotations</li>
                      <li>• Uploaded media assets</li>
                    </ul>
                  </div>
                  <div className="p-5 rounded-lg border bg-card">
                    <h3 className="font-semibold mb-2 text-primary">Operational Data</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Log data for security audits</li>
                      <li>• Payment status (via Stripe)</li>
                      <li>• Feature flag states</li>
                    </ul>
                  </div>
                  <div className="p-5 rounded-lg border bg-card">
                    <h3 className="font-semibold mb-2 text-primary">Device Data</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• IP address (for security)</li>
                      <li>• Browser type & version</li>
                      <li>• Cookie session tokens</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10 text-primary">
                    <RiGlobalLine className="h-5 w-5" />
                  </div>
                  <h2 className="text-2xl font-semibold">Subprocessors</h2>
                </div>
                <p className="text-muted-foreground">
                  We use trusted third-party services to run UI SyncUp.
                </p>
                
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground font-medium">
                      <tr>
                        <th className="px-4 py-3">Provider</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3 hidden md:table-cell">Purpose</th>
                        <th className="px-4 py-3 text-right">Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {processors.map((p) => (
                        <tr key={p.title} className="hover:bg-muted/20">
                          <td className="px-4 py-3 font-medium">{p.title}</td>
                          <td className="px-4 py-3 text-muted-foreground">{p.type}</td>
                          <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{p.purpose}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{p.location}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* TAB: RIGHTS & USAGE */}
            <TabsContent value="rights" className="space-y-10 animate-in fade-in-50 duration-500">
             
             {/* Security Section */}
              <div className="space-y-6">
                 <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-green-500/10 text-green-600 dark:text-green-400">
                    <RiLockLine className="h-5 w-5" />
                  </div>
                  <h2 className="text-2xl font-semibold">Security Measures</h2>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {securityPractices.map((practice, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <RiCheckLine className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{practice}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Data Usage */}
              <div className="space-y-6">
                 <h2 className="text-xl font-semibold">How we use data</h2>
                 <div className="grid sm:grid-cols-2 gap-4">
                    {dataUses.map((use, i) => (
                      <Card key={i} className="bg-transparent shadow-none border-dashed">
                        <CardHeader className="p-4">
                          <CardTitle className="text-base">{use.title}</CardTitle>
                          <CardDescription>{use.desc}</CardDescription>
                        </CardHeader>
                      </Card>
                    ))}
                 </div>
              </div>

              <Separator />

              {/* User Rights */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">Your Rights</h2>
                <div className="space-y-4 text-muted-foreground">
                  <p>
                    <strong>Access & Export:</strong> You can access your project data at any time via the dashboard.
                  </p>
                  <p>
                    <strong>Correction:</strong> You can update your profile, password, and team settings directly in the app.
                  </p>
                  <p>
                    <strong>Deletion:</strong> You can delete projects, teams, or your entire account. 
                    Deleting an account will permanently remove your personal data and associated team data.
                  </p>
                </div>
              </div>

            </TabsContent>
          </Tabs>
        </section>
      </main>

    </div>
  )
}
