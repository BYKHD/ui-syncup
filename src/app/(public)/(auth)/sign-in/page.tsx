import SignInScreen from "@/features/auth/screens/sign-in-screen";
import { getSessionCookie } from "@/server/auth/cookies";
import { getSession } from "@/server/auth/session";
import { redirect } from "next/navigation";
import { mapOAuthError } from "@/lib/oauth-errors";

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
    
    // Redirect to Projects if already authenticated
    if (session) {
      redirect("/projects");
    }
  }

  const resolvedSearchParams = await searchParams;
  const invitationToken = resolvedSearchParams.token;
  const invitedEmail =
    typeof resolvedSearchParams.email === "string" ? resolvedSearchParams.email : "";

  // Parse OAuth error from URL (redirected back from failed OAuth flow)
  const errorParam = typeof resolvedSearchParams.error === "string" 
    ? resolvedSearchParams.error 
    : null;
  const oauthError = errorParam ? mapOAuthError(errorParam) : null;

  const description = invitationToken
    ? invitationCopy.invited
    : invitationCopy.default;

  return (
    <SignInScreen 
      description={description} 
      invitedEmail={invitedEmail} 
      initialOAuthError={oauthError}
    />
  );
}

