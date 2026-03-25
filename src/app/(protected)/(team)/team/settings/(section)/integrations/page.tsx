import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { getActiveTeam } from "@/server/teams/team-context";

export default async function IntegrationsSettingsRedirectPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const { team } = await getActiveTeam(session.id);
  if (!team) redirect("/onboarding");

  redirect(`/team/${team.slug}/settings/integrations`);
}
