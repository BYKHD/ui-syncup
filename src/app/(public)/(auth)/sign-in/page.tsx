import SignInScreen from "@/features/auth/screens/sign-in-screen";
import { getSessionCookie } from "@/server/auth/cookies";
import { getSession } from "@/server/auth/session";
import { redirect } from "next/navigation";
import { mapOAuthError } from "@/lib/oauth-errors";
import { getLandingView, resolveLandingPath } from "@/server/preferences/landing-view";

// Force dynamic rendering to prevent SSR issues with client components
export const dynamic = 'force-dynamic';

const invitationCopy = {
  default: "Sign in to your account to continue",
  invited: "Sign in to accept your team invitation",
};

function validateCallbackUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  return undefined;
}

type SignInPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  // Only check session if cookie exists (avoid unnecessary logging on public pages)
  const sessionToken = await getSessionCookie();

  if (sessionToken) {
    const session = await getSession();

    // Already authenticated — send them to their preferred landing view
    if (session) {
      const landingView = await getLandingView();
      redirect(resolveLandingPath(landingView));
    }
  }

  const resolvedSearchParams = await searchParams;
  const invitationToken = resolvedSearchParams.token;
  const invitedEmail =
    typeof resolvedSearchParams.email === "string" ? resolvedSearchParams.email : "";

  const callbackUrl = validateCallbackUrl(
    typeof resolvedSearchParams.callbackUrl === "string" ? resolvedSearchParams.callbackUrl : undefined
  );

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
      callbackUrl={callbackUrl}
    />
  );
}

