import { ResetPasswordScreen } from "@/features/auth/screens";
import { getSession } from "@/server/auth/session";
import { redirect } from "next/navigation";

type ResetPasswordPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
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
  const token =
    typeof resolvedSearchParams.token === "string"
      ? resolvedSearchParams.token
      : undefined;

  return <ResetPasswordScreen token={token} />;
}
