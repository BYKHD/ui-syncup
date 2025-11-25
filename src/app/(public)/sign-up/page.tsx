import { SignUpScreen } from "@/features/auth";
import { getSessionCookie } from "@/server/auth/cookies";
import { getSession } from "@/server/auth/session";
import { redirect } from "next/navigation";

// Force dynamic rendering to prevent SSR issues with client components
export const dynamic = 'force-dynamic';

export default async function SignUpPage() {
  // Only check session if cookie exists (avoid unnecessary logging on public pages)
  const sessionToken = await getSessionCookie();
  
  if (sessionToken) {
    const session = await getSession();
    
    // Redirect to dashboard if already authenticated
    if (session) {
      redirect("/dashboard");
    }
  }

  return <SignUpScreen />;
}
