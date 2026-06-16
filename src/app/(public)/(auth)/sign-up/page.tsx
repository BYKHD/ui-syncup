import { SignUpScreen } from "@/features/auth";
import { getSessionCookie } from "@/server/auth/cookies";
import { getSession } from "@/server/auth/session";
import { redirect } from "next/navigation";
import { getLandingView, resolveLandingPath } from "@/server/preferences/landing-view";

// Force dynamic rendering to prevent SSR issues with client components
export const dynamic = 'force-dynamic';

function validateCallbackUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  return undefined;
}

type SignUpPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
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
  const callbackUrl = validateCallbackUrl(
    typeof resolvedSearchParams.callbackUrl === "string" ? resolvedSearchParams.callbackUrl : undefined
  );

  return <SignUpScreen callbackUrl={callbackUrl} />;
}
