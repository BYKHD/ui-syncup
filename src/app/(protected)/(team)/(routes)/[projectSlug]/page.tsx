import { AppHeaderConfigurator, type BreadcrumbItem } from "@/components/shared/headers";
import ProjectDetailScreen from "@/features/projects/screens/project-detail-screen";
import { MOCK_PROJECTS_WITH_STATS } from "@/mocks";

interface PageProps {
  params: Promise<{
    projectSlug: string;
  }>;
}

// Thin page component - server-first, minimal logic
export default async function ProjectDetailPage({ params }: PageProps) {
  const { projectSlug } = await params;

  // TODO: wire GET /api/projects/:slug
  // For now, using mock data to visualize UI
  const mockProject = MOCK_PROJECTS_WITH_STATS.find(p => p.slug === projectSlug) || MOCK_PROJECTS_WITH_STATS[0];

  const project = {
    id: mockProject.id,
    name: mockProject.name,
    description: mockProject.description,
    visibility: mockProject.visibility,
    stats: {
      progressPercent: mockProject.stats.progressPercent,
      totalTickets: mockProject.stats.totalTickets,
      completedTickets: mockProject.stats.completedTickets,
      memberCount: mockProject.stats.memberCount,
    },
    createdAt: mockProject.createdAt,
    updatedAt: mockProject.updatedAt,
  };

  const userRole = mockProject.userRole;
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
      <ProjectDetailScreen
        project={project}
        userRole={userRole}
        isLoading={false}
      />
    </>
  );
}
