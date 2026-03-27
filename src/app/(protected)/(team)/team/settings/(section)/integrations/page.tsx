import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { db } from "@/lib/db";
import { users } from "@/server/db/schema/users";
import { teams } from "@/server/db/schema/teams";
import { eq, isNull, and } from "drizzle-orm";

export default async function IntegrationsSettingsRedirectPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.id),
    columns: { lastActiveTeamId: true },
  });

  const teamId = user?.lastActiveTeamId;
  if (!teamId) redirect("/onboarding");

  const team = await db.query.teams.findFirst({
    where: and(eq(teams.id, teamId), isNull(teams.deletedAt)),
    columns: { slug: true },
  });

  if (!team) redirect("/onboarding");

  redirect(`/team/${team.slug}/settings/integrations`);
}
