import { AppHeaderConfigurator, type BreadcrumbItem } from "@/components/shared/headers";
import { SecuritySettings } from "@/features/user-settings/components";
import type { Metadata } from "next";
import { getSession } from "@/server/auth/session";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Security",
  description: "Manage your password and connected accounts",
};

const SECURITY_BREADCRUMBS: BreadcrumbItem[] = [
  { label: "Settings", href: "/settings" },
  { label: "Security" },
];

export default async function SecurityPage() {
  // Fetch session data server-side
  const session = await getSession();
  
  // Redirect if no session (defensive programming)
  if (!session) {
    redirect("/sign-in");
  }

  return (
    <>
      <AppHeaderConfigurator
        pageName="Security"
        breadcrumbs={SECURITY_BREADCRUMBS}
      />
      <div className="space-y-6">
        <SecuritySettings hasPassword={session.hasPassword ?? false} />
      </div>
    </>
  );
}
