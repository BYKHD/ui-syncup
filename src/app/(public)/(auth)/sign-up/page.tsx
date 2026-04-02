import { SignUpScreen } from "@/features/auth";
import { getSessionCookie } from "@/server/auth/cookies";
import { getSession } from "@/server/auth/session";
import { redirect } from "next/navigation";

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

    // Redirect to projects if already authenticated
    if (session) {
      redirect("/projects");
    }
  }

  const resolvedSearchParams = await searchParams;
  const callbackUrl = validateCallbackUrl(
    typeof resolvedSearchParams.callbackUrl === "string" ? resolvedSearchParams.callbackUrl : undefined
  );

  return <SignUpScreen callbackUrl={callbackUrl} />;
}
