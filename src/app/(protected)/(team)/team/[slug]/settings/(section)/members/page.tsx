import { redirect } from "next/navigation";
import { AppHeaderConfigurator, type BreadcrumbItem } from "@/components/shared/headers";
import TeamMembersPage from "@/features/team-settings/components/team-setting-member";
import { getSession } from "@/server/auth/session";
import { db } from "@/lib/db";
import { teams } from "@/server/db/schema/teams";
import { teamMembers } from "@/server/db/schema/team-members";
import { eq, and, isNull } from "drizzle-orm";

export default async function MembersSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getSession();
  const { slug } = await params;

  if (!session) redirect("/sign-in");

  const team = await db.query.teams.findFirst({
    where: and(eq(teams.slug, slug), isNull(teams.deletedAt)),
  });

  if (!team) redirect("/onboarding");

  const member = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, team.id),
      eq(teamMembers.userId, session.id)
    ),
  });

  if (!member) redirect("/team");

  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Team", href: "/team" },
    { label: "Settings", href: `/team/${slug}/settings` },
    { label: "Members" },
  ];

  return (
    <>
      <AppHeaderConfigurator pageName="Members" breadcrumbs={breadcrumbs} />
      <TeamMembersPage teamId={team.id} currentUserId={session.id} />
    </>
  );
}
