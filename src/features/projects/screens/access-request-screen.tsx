import { AppHeaderConfigurator, type BreadcrumbItem } from "@/components/layout/headers";
import { AccessRequestPanel } from "@/features/projects/components";
import type { AccessRequest } from "@/features/projects/api";

interface Props {
  project: { id: string; name: string; slug: string };
  teamName: string;
  existingRequest: AccessRequest | null;
}

export function AccessRequestScreen({ project, teamName, existingRequest }: Props) {
  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Projects", href: "/projects" },
    { label: project.name },
  ];

  return (
    <>
      <AppHeaderConfigurator pageName={project.name} breadcrumbs={breadcrumbs} />
      <div className="flex-1 flex items-center justify-center p-6">
        <AccessRequestPanel
          projectId={project.id}
          projectName={project.name}
          teamName={teamName}
          existingRequest={existingRequest}
        />
      </div>
    </>
  );
}
