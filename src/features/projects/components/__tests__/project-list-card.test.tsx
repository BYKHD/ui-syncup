import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MOCK_PROJECT_SUMMARIES } from "@/mocks/project.fixtures";

import { ProjectCard } from "../project-list-card";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      animate: _animate,
      initial: _initial,
      transition: _transition,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      animate?: unknown;
      initial?: unknown;
      transition?: unknown;
    }) => <div {...props}>{children}</div>,
  },
}));

vi.mock("@/features/projects/hooks", () => ({
  useJoinProject: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe("ProjectCard", () => {
  it("keeps the regular folder panel background for archived projects", () => {
    const archivedProject = MOCK_PROJECT_SUMMARIES.find(
      (project) => project.status === "archived",
    );

    expect(archivedProject).toBeDefined();

    render(<ProjectCard project={archivedProject!} />);

    expect(screen.getByText("Archived")).toBeInTheDocument();

    const folderPanel = screen
      .getByRole("heading", { name: archivedProject!.name })
      .closest(".rounded-t-3xl");

    expect(folderPanel).toHaveClass("bg-card");
    expect(folderPanel).not.toHaveClass("bg-muted/40");
  });
});
