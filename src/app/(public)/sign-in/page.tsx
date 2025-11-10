import SignInScreen from "@/features/auth/screens/sign-in-screen";

const invitationCopy = {
  default: "Sign in to your account to continue",
  invited: "Sign in to accept your team invitation",
};

type SignInPageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

export default function SignInPage({ searchParams }: SignInPageProps) {
  const invitationToken = searchParams.token;
  const invitedEmail =
    typeof searchParams.email === "string" ? searchParams.email : "";

  const description = invitationToken
    ? invitationCopy.invited
    : invitationCopy.default;

  return <SignInScreen description={description} invitedEmail={invitedEmail} />;
}
