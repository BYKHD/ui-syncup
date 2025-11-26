import SignInScreen from "@/features/auth/screens/sign-in-screen";
import { getSessionCookie } from "@/server/auth/cookies";
import { getSession } from "@/server/auth/session";
import { redirect } from "next/navigation";

// Force dynamic rendering to prevent SSR issues with client components
export const dynamic = 'force-dynamic';

const invitationCopy = {
  default: "Sign in to your account to continue",
  invited: "Sign in to accept your team invitation",
};

type SignInPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  // Only check session if cookie exists (avoid unnecessary logging on public pages)
  const sessionToken = await getSessionCookie();
  
  if (sessionToken) {
    const session = await getSession();
    
    // Redirect to dashboard if already authenticated
    if (session) {
      redirect("/dashboard");
    }
  }

  const resolvedSearchParams = await searchParams;
  const invitationToken = resolvedSearchParams.token;
  const invitedEmail =
    typeof resolvedSearchParams.email === "string" ? resolvedSearchParams.email : "";

  const description = invitationToken
    ? invitationCopy.invited
    : invitationCopy.default;

  return <SignInScreen description={description} invitedEmail={invitedEmail} />;
}
