import { PrivacyPolicyScreen } from "@/features/legal"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy | UI SyncUp",
  description:
    "How UI SyncUp handles authentication, workspace data, attachments, and communications to keep customer data private and secure.",
}

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyScreen />
}
