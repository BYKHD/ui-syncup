import { redirect } from "next/navigation";
import { isSetupComplete } from "@/server/setup";

/**
 * Auth layout — guards all authentication routes.
 * Redirects to /setup when the instance has not been configured yet.
 * Any DB error (table missing, connection refused, etc.) is treated as
 * "setup not complete" so the app never crashes on a fresh start.
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    if (!await isSetupComplete()) {
      redirect("/setup");
    }
  } catch {
    redirect("/setup");
  }

  return <>{children}</>;
}
