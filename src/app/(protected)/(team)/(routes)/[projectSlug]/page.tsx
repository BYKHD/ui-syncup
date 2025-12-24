import { AppHeaderConfigurator, type BreadcrumbItem } from "@/components/shared/headers";
import { ProjectDetailScreenWrapper } from "@/features/projects/screens/project-detail-screen-wrapper";
import { getProject } from "@/features/projects/api";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";

interface PageProps {
  params: Promise<{
    projectSlug: string;
  }>;
}

// Server component - fetches real project data
export default async function ProjectDetailPage({ params }: PageProps) {
  const { projectSlug } = await params;

  try {
    // Fetch project from API (supports both UUID and slug)
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.getAll()
      .map(c => `${c.name}=${c.value}`)
      .join('; ');
    
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/projects/${projectSlug}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader,
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        notFound();
      }
      throw new Error(`Failed to fetch project: ${response.statusText}`);
    }

    const { project } = await response.json();

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
            stats: project.stats,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
            icon: project.icon,
            slug: project.slug,
          }}
          userRole={project.userRole}
          isLoading={false}
        />
      </>
    );
  } catch (error) {
    console.error("Failed to load project:", error);
    notFound();
  }
}
