import { redirect } from "next/navigation"
import { isSetupComplete } from "@/server/setup"

export default async function HomePage() {
  try {
    const done = await isSetupComplete()
    redirect(done ? "/sign-in" : "/setup")
  } catch {
    redirect("/setup")
  }
}
