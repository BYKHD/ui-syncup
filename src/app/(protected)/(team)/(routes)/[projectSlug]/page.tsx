import { AppHeaderConfigurator, type BreadcrumbItem } from "@/components/layout/headers";
import { ProjectDetailScreenWrapper } from "@/features/projects/screens/project-detail-screen-wrapper";
import { getProjectIssuesServer } from "@/features/issues/api/get-project-issues-server";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";

interface PageProps {
  params: Promise<{
    projectSlug: string;
  }>;
}

async function loadProject(projectSlug: string) {
  // Ignore static file requests that accidentally match this route
  if (projectSlug.match(/\.(png|ico|jpg|jpeg|svg|json|txt|xml|webmanifest)$/i)) {
    notFound();
  }

  // Get cookie header for authenticated requests
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll()
    .map(c => `${c.name}=${c.value}`)
    .join('; ');

  // Fetch project from API (supports both UUID and slug)
  const projectResponse = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/projects/${projectSlug}`,
    {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
      cache: 'no-store',
    }
  );

  if (!projectResponse.ok) {
    if (projectResponse.status === 401) {
      const { redirect } = await import("next/navigation");
      redirect("/sign-in");
    }
    if (projectResponse.status === 403 || projectResponse.status === 404) {
      notFound();
    }
    throw new Error(`Failed to fetch project: ${projectResponse.statusText}`);
  }

  const { project } = await projectResponse.json();

  // Prefetch issues in parallel (non-blocking, best-effort)
  // This eliminates the client-side loading state for issues
  const issuesPromise = getProjectIssuesServer(project.id, { cookieHeader });

  // Wait for issues (with timeout protection)
  const issuesData = await Promise.race([
    issuesPromise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000))
  ]);

  return { project, issues: issuesData?.issues };
}

// Server component - fetches real project data with prefetched issues
export default async function ProjectDetailPage({ params }: PageProps) {
  const { projectSlug } = await params;

  // Assigned below; the catch always terminates (notFound() returns never), so this is
  // guaranteed set by the time it is read.
  let loaded: Awaited<ReturnType<typeof loadProject>>;

  try {
    loaded = await loadProject(projectSlug);
  } catch (error) {
    // Re-throw Next.js internal errors (notFound, redirect) so the framework handles them
    if (error instanceof Error && 'digest' in error) {
      throw error;
    }
    console.error("Failed to load project:", error);
    notFound();
  }

  // JSX is built OUTSIDE the try on purpose. React does not render a component when its
  // element is constructed, so errors thrown during the child's render would never reach
  // that catch anyway — but the catch WOULD swallow anything thrown while building the
  // element tree, including framework control-flow errors, and turn it into a 404.
  const { project, issues } = loaded;
  const projectBreadcrumbs: BreadcrumbItem[] = [
    { label: "Projects", href: "/projects" },
    { label: project.name },
  ];

  return (
    <>
      <AppHeaderConfigurator
        pageName={project.name}
        breadcrumbs={projectBreadcrumbs}
      />
      <ProjectDetailScreenWrapper
        project={{
          id: project.id,
          teamId: project.teamId,
          name: project.name,
          description: project.description,
          visibility: project.visibility,
          status: project.status,
          stats: project.stats,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          icon: project.icon,
          slug: project.slug,
        }}
        userRole={project.userRole}
        isLoading={false}
        initialIssues={issues}
      />
    </>
  );
}
