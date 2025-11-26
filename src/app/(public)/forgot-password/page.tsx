import { ForgotPasswordScreen } from "@/features/auth/screens";

// Force dynamic rendering to prevent SSR issues with client components
export const dynamic = 'force-dynamic';

type ForgotPasswordPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const resolvedSearchParams = await searchParams;
  const email =
    typeof resolvedSearchParams.email === "string"
      ? resolvedSearchParams.email
      : undefined;

  return <ForgotPasswordScreen defaultEmail={email} />;
}
