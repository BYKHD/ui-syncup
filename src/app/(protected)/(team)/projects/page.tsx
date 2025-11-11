import { AppHeaderConfigurator, type BreadcrumbItem } from "@/components/shared/headers";
import ProjectsListScreen from "@/features/projects/screens/projects-list-screen";

const PROJECTS_BREADCRUMBS: BreadcrumbItem[] = [
  { label: "Workspace", href: "/dashboard" },
  { label: "Projects" },
];

export default function ProjectsListPage() {
  return (
    <>
      <AppHeaderConfigurator pageName="Projects" breadcrumbs={PROJECTS_BREADCRUMBS} />
      <ProjectsListScreen />
    </>
  );
}
