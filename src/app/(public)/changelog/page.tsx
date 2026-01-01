import { Metadata } from "next"
import { ChangelogScreen } from "@/features/landing"
import { APP_VERSION } from "@/config/version"

export const metadata: Metadata = {
  title: "Changelog - UI SyncUp",
  description: "Latest updates and version history for UI SyncUp",
}

export default function ChangelogPage() {
  return <ChangelogScreen />
}
