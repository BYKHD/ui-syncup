import { AppShellWrapper } from "@/components/layout/app-shell-wrapper";
import { getSession } from "@/server/auth/session";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side session validation
  let session;
  
  try {
    session = await getSession();
  } catch (error) {
    // Treat any session validation error as no session
    // This prevents information leakage and ensures security
    session = null;
  }
  
  // Redirect to sign-in if no valid session
  if (!session) {
    redirect("/sign-in");
  }

  // Pass session data to client components via AppShell
  return <AppShellWrapper variant="sidebar">{children}</AppShellWrapper>;
}
