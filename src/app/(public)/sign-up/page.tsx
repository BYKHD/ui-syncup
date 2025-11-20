import { SignUpScreen } from "@/features/auth";
import { getSession } from "@/server/auth/session";
import { redirect } from "next/navigation";

export default async function SignUpPage() {
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

  return <SignUpScreen />;
}
