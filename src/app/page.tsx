import { redirect } from "next/navigation"
import { isSetupComplete } from "@/server/setup"
import { getSessionCookie } from "@/server/auth/cookies"
import { getSession } from "@/server/auth/session"

export default async function HomePage() {
  try {
    const done = await isSetupComplete()
    if (!done) redirect("/setup")

    const sessionToken = await getSessionCookie()
    if (sessionToken) {
      const session = await getSession()
      if (session) redirect("/projects")
    }

    redirect("/sign-in")
  } catch {
    redirect("/setup")
  }
}
