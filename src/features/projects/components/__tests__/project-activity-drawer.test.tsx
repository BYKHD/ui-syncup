import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import userEvent from "@testing-library/user-event";
import { ProjectActivityDrawer } from "../project-activity-drawer";
import { useProjectActivitiesInfinite } from "../../hooks/use-project-activities-infinite";
import type { ProjectActivity } from "../../api/types";

// jsdom lacks ResizeObserver, which Radix's ScrollArea (inside the Sheet) needs.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock the infinite hook so we can drive the drawer's render states directly.
vi.mock("../../hooks/use-project-activities-infinite");

const mockHook = useProjectActivitiesInfinite as unknown as Mock;

const sampleActivities: ProjectActivity[] = [
  {
    id: "1",
    type: "member_added",
    projectId: "p1",
    teamId: "t1",
    actorId: "u1",
    createdAt: new Date().toISOString(),
    actor: { id: "u1", name: "Alice", avatarUrl: null },
    metadata: { userName: "Bob", role: "editor" },
  },
];

function hookReturn(overrides: Record<string, unknown> = {}) {
  return {
    activities: [] as ProjectActivity[],
    total: 0,
    isLoading: false,
    isPending: false,
    isError: false,
    error: null,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
    ...overrides,
  };
}

describe("ProjectActivityDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the skeleton while pending (no empty state)", () => {
    mockHook.mockReturnValue(hookReturn({ isPending: true }));
    render(<ProjectActivityDrawer projectId="p1" open onOpenChange={vi.fn()} />);

    expect(screen.getByText("Recent Activity")).toBeInTheDocument();
    expect(screen.queryByText("No recent activity")).not.toBeInTheDocument();
  });

  it("shows the empty state when there are no activities", () => {
    mockHook.mockReturnValue(hookReturn());
    render(<ProjectActivityDrawer projectId="p1" open onOpenChange={vi.fn()} />);

    expect(screen.getByText("No recent activity")).toBeInTheDocument();
  });

  it("shows an error state (not empty) when the query fails", () => {
    mockHook.mockReturnValue(hookReturn({ isError: true }));
    render(<ProjectActivityDrawer projectId="p1" open onOpenChange={vi.fn()} />);

    expect(screen.getByText(/couldn.t load activity/i)).toBeInTheDocument();
    expect(screen.queryByText("No recent activity")).not.toBeInTheDocument();
  });

  it("renders activities and hides Load more when there is no next page", () => {
    mockHook.mockReturnValue(hookReturn({ activities: sampleActivities }));
    render(<ProjectActivityDrawer projectId="p1" open onOpenChange={vi.fn()} />);

    expect(screen.getByText("added a member")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /load more/i })
    ).not.toBeInTheDocument();
  });

  it("calls fetchNextPage when Load more is clicked", async () => {
    const fetchNextPage = vi.fn();
    mockHook.mockReturnValue(
      hookReturn({ activities: sampleActivities, hasNextPage: true, fetchNextPage })
    );
    render(<ProjectActivityDrawer projectId="p1" open onOpenChange={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: /load more/i }));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("disables the button while fetching the next page", () => {
    mockHook.mockReturnValue(
      hookReturn({
        activities: sampleActivities,
        hasNextPage: true,
        isFetchingNextPage: true,
      })
    );
    render(<ProjectActivityDrawer projectId="p1" open onOpenChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /loading/i })).toBeDisabled();
  });
});
