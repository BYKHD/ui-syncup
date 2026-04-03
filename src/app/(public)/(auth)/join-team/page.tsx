import { notFound, redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { getTeamInvitationByToken } from "@/server/teams/invitation-service";
import { TeamInvitationAcceptanceScreen } from "@/features/teams";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata = {
  title: "Accept Team Invitation | UI SyncUp",
  description: "Join your team on UI SyncUp",
};

interface JoinTeamPageProps {
  searchParams: Promise<{ token?: string }>;
}

const INVITATION_STATUS_MESSAGES = {
  used: {
    title: "Invitation Already Accepted",
    description: "This invitation has already been used. You may already be a member of this team.",
    action: { label: "Go to Teams", href: "/teams" },
  },
  cancelled: {
    title: "Invitation Cancelled",
    description: "This invitation was cancelled and is no longer valid.",
    action: { label: "Go to Teams", href: "/teams" },
  },
  expired: {
    title: "Invitation Expired",
    description: "This invitation has expired. Please request a new invitation from the team owner.",
    action: { label: "Go to Teams", href: "/teams" },
  },
} as const;

function StatusCard({ title, description, actionLabel, actionHref }: {
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center">
          <Button asChild>
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default async function JoinTeamPage({ searchParams }: JoinTeamPageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <StatusCard
        title="Invalid Invitation Link"
        description="This invitation link is missing a token. Please use the link from your invitation email."
        actionLabel="Sign In"
        actionHref="/sign-in"
      />
    );
  }

  const user = await getSession();
  if (!user) {
    redirect(`/sign-in?callbackUrl=${encodeURIComponent(`/join-team?token=${token}`)}`);
  }

  const data = await getTeamInvitationByToken(token);

  if (!data) {
    notFound();
  }

  const { invitation, teamName, teamSlug, inviterName } = data;

  if (invitation.usedAt) {
    return <StatusCard {...INVITATION_STATUS_MESSAGES.used} actionLabel={INVITATION_STATUS_MESSAGES.used.action.label} actionHref={INVITATION_STATUS_MESSAGES.used.action.href} />;
  }

  if (invitation.cancelledAt) {
    return <StatusCard {...INVITATION_STATUS_MESSAGES.cancelled} actionLabel={INVITATION_STATUS_MESSAGES.cancelled.action.label} actionHref={INVITATION_STATUS_MESSAGES.cancelled.action.href} />;
  }

  if (new Date() > invitation.expiresAt) {
    return <StatusCard {...INVITATION_STATUS_MESSAGES.expired} actionLabel={INVITATION_STATUS_MESSAGES.expired.action.label} actionHref={INVITATION_STATUS_MESSAGES.expired.action.href} />;
  }

  return (
    <TeamInvitationAcceptanceScreen
      token={token}
      invitationId={invitation.id}
      invitation={invitation}
      teamName={teamName}
      inviterName={inviterName}
      currentUserEmail={user.email}
    />
  );
}
