import ProjectDetailScreen from "@features/projects/screens/project-detail-screen";
import { MOCK_PROJECTS_WITH_STATS } from "@/mocks";

interface PageProps {
  params: {
    projectSlug: string;
  };
}

// Thin page component - server-first, minimal logic
export default function ProjectDetailPage({ params }: PageProps) {
  const { projectSlug } = params;

  // TODO: wire GET /api/projects/:slug
  // For now, using mock data to visualize UI
  const mockProject = MOCK_PROJECTS_WITH_STATS.find(p => p.slug === projectSlug) || MOCK_PROJECTS_WITH_STATS[0];

  const project = {
    id: mockProject.id,
    name: mockProject.name,
    description: mockProject.description,
    visibility: mockProject.visibility,
    progressPercent: mockProject.stats.progressPercent,
    tickets: mockProject.stats.totalTickets,
    ticketsDone: mockProject.stats.completedTickets,
    memberCount: mockProject.stats.memberCount,
    createdAt: mockProject.createdAt,
    updatedAt: mockProject.updatedAt,
  };

  const userRole = mockProject.userRole;

  return (
    <ProjectDetailScreen
      project={project}
      userRole={userRole}
      isLoading={false}
    />
  );
}
