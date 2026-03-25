import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { getActiveTeam } from "@/server/teams/team-context";

/**
 * Backward-compatibility shim for the old /team/settings route.
 * Resolves the user's active team from the database (no cookie needed)
 * and redirects to the new slug-based URL /team/[slug]/settings.
 */
export default async function TeamSettingsRedirectPage() {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  const { team } = await getActiveTeam(session.id);

  if (!team) {
    redirect("/onboarding");
  }

  redirect(`/team/${team.slug}/settings`);
}
