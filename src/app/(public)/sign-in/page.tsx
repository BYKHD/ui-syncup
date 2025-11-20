import SignInScreen from "@/features/auth/screens/sign-in-screen";
import { getSession } from "@/server/auth/session";
import { redirect } from "next/navigation";

const invitationCopy = {
  default: "Sign in to your account to continue",
  invited: "Sign in to accept your team invitation",
};

type SignInPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  // Check if user is already authenticated
  let session;
  
  try {
    session = await getSession();
  } catch (error) {
    // Treat any session validation error as no session
    session = null;
  }
  
  // Redirect to dashboard if already authenticated
  if (session) {
    redirect("/dashboard");
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
