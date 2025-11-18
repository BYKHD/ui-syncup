import SignInScreen from "@/features/auth/screens/sign-in-screen";

const invitationCopy = {
  default: "Sign in to your account to continue",
  invited: "Sign in to accept your team invitation",
};

type SignInPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const resolvedSearchParams = await searchParams;
  const invitationToken = resolvedSearchParams.token;
  const invitedEmail =
    typeof resolvedSearchParams.email === "string" ? resolvedSearchParams.email : "";

  const description = invitationToken
    ? invitationCopy.invited
    : invitationCopy.default;

  return <SignInScreen description={description} invitedEmail={invitedEmail} />;
}
