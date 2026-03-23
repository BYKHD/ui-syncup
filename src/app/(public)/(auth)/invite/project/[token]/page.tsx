import { notFound, redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { getInvitationByToken } from "@/server/projects/invitation-service";
import { InvitationAcceptanceScreen } from "@/features/projects";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata = {
  title: 'Accept Project Invitation | UI SyncUp',
  description: 'Join your team project on UI SyncUp',
};

interface InvitationPageProps {
  params: Promise<{
    token: string;
  }>;
  searchParams: Promise<{
    callbackUrl?: string;
  }>;
}

/**
 * Validate callback URL to prevent open redirect attacks
 * Only allow relative paths or same-origin URLs
 */
function validateCallbackUrl(url: string | undefined): string {
  if (!url) return '/';
  
  // Allow relative paths starting with /
  if (url.startsWith('/') && !url.startsWith('//')) {
    return url;
  }
  
  // Reject any absolute URLs or protocol-relative URLs
  return '/';
}

/**
 * Status-specific error messages and actions
 */
const INVITATION_STATUS_MESSAGES = {
  accepted: {
    title: "Invitation Already Accepted",
    description: "This invitation has already been used. You are already a member of this project.",
    action: { label: "Go to Projects", href: "/projects" },
  },
  declined: {
    title: "Invitation Declined",
    description: "This invitation was previously declined and is no longer valid.",
    action: { label: "Go to Projects", href: "/projects" },
  },
  expired: {
    title: "Invitation Expired",
    description: "This invitation has expired. Please request a new invitation from the project owner.",
    action: { label: "Go to Projects", href: "/projects" },
  },
} as const;

export default async function InvitationPage({ params, searchParams }: InvitationPageProps) {
  const { token } = await params;
  const { callbackUrl } = await searchParams;
  const user = await getSession();

  if (!user) {
    const validatedCallback = validateCallbackUrl(callbackUrl) || `/invite/project/${token}`;
    const encodedCallback = encodeURIComponent(validatedCallback);
    redirect(`/sign-in?callbackUrl=${encodedCallback}`);
  }

  let invitationData;
  try {
    invitationData = await getInvitationByToken(token);
  } catch (error) {
    // Log server error but show user-friendly message
    console.error("Failed to fetch invitation:", error);
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Unable to Load Invitation</CardTitle>
            <CardDescription>
              We encountered an error loading this invitation. Please try again or contact support if the problem persists.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center gap-3">
            <Button variant="outline" asChild>
              <Link href="/projects">Go to Projects</Link>
            </Button>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!invitationData) {
    notFound();
  }

  // Handle non-pending invitations with better UX
  if (invitationData.invitation.status !== "pending") {
    const statusInfo = INVITATION_STATUS_MESSAGES[invitationData.invitation.status as keyof typeof INVITATION_STATUS_MESSAGES];
    
    if (statusInfo) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle>{statusInfo.title}</CardTitle>
              <CardDescription>{statusInfo.description}</CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-center">
              <Button asChild>
                <Link href={statusInfo.action.href}>{statusInfo.action.label}</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }
    
    // Fallback for unknown status
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Invitation Not Available</CardTitle>
            <CardDescription>
              This invitation is no longer available (status: {invitationData.invitation.status}).
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button asChild>
              <Link href="/projects">Go to Projects</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <InvitationAcceptanceScreen 
      token={token} 
      invitation={{
        ...invitationData.invitation,
        projectName: invitationData.projectName,
        inviterName: invitationData.inviterName,
      }}
      currentUserEmail={user.email}
    />
  );
}
