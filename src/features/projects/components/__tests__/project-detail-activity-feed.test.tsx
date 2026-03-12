import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { ProjectActivityFeed } from "../project-detail-activity-feed";
import { useProjectActivities } from "../../hooks/use-project-activities";
import type { ProjectActivity } from "../../api/types";

// Mock the hook
vi.mock("../../hooks/use-project-activities");

const mockUseProjectActivities = useProjectActivities as unknown as Mock;

const mockActivities: ProjectActivity[] = [
  {
    id: "1",
    type: "invitation_sent",
    projectId: "p1",
    teamId: "t1",
    actorId: "u1",
    createdAt: new Date().toISOString(),
    actor: {
      id: "u1",
      name: "Alice",
      avatarUrl: null,
    },
    metadata: {
      email: "bob@example.com",
      role: "editor",
    },
  },
  {
    id: "2",
    type: "member_added",
    projectId: "p1",
    teamId: "t1",
    actorId: "u1",
    createdAt: new Date().toISOString(),
    actor: {
      id: "u1",
      name: "Alice",
      avatarUrl: null,
    },
    metadata: {
      userName: "Bob",
      role: "editor",
    },
  }
];

describe("ProjectActivityFeed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state", () => {
    mockUseProjectActivities.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ProjectActivityFeed projectId="p1" />);
    // Check for "Recent Activity" title
    expect(screen.getByText("Recent Activity")).toBeInTheDocument();
    // Check if skeleton elements are present (this is a bit implicit, but we expect no "No recent activity")
    expect(screen.queryByText("No recent activity")).not.toBeInTheDocument();
  });

  it("renders empty state", () => {
    mockUseProjectActivities.mockReturnValue({
      data: { activities: [] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ProjectActivityFeed projectId="p1" />);
    expect(screen.getByText("No recent activity")).toBeInTheDocument();
  });

  it("renders activities correctly", () => {
    mockUseProjectActivities.mockReturnValue({
      data: { activities: mockActivities },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ProjectActivityFeed projectId="p1" />);
    
    // Check for invitation sent text
    expect(screen.getByText("sent an invitation to")).toBeInTheDocument();
    expect(screen.getByText("bob@example.com")).toBeInTheDocument();
    
    // Check for member added text
    expect(screen.getByText("added a member")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    
    // Check for roles
    const roles = screen.getAllByText("editor");
    expect(roles.length).toBeGreaterThan(0);
  });
});
