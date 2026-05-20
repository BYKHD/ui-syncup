import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TeamWithMemberInfo } from "@/features/teams";

const mockUseTeams = vi.fn();
const mockUseSwitchTeam = vi.fn();
const mockUseTeam = vi.fn();
const mockIsMultiTeamMode = vi.fn();
const mockRouterPush = vi.fn();
const mockSwitchTeam = vi.fn();
const mockAssign = vi.fn();

vi.mock("@/features/teams", () => ({
  useTeams: () => mockUseTeams(),
  useSwitchTeam: () => mockUseSwitchTeam(),
}));

vi.mock("@/hooks/use-team", () => ({
  useTeam: () => mockUseTeam(),
}));

vi.mock("@/config/team", () => ({
  isMultiTeamMode: () => mockIsMultiTeamMode(),
  isSingleTeamMode: () => !mockIsMultiTeamMode(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
  usePathname: () => "/projects",
}));

vi.mock("@/components/ui/sidebar", () => ({
  SidebarMenu: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-menu">{children}</div>
  ),
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-menu-item">{children}</div>
  ),
  useSidebar: () => ({ isMobile: false, state: "expanded" }),
}));

vi.mock("../sidebar-team-avatar", () => ({
  TeamAvatar: ({ team }: { team: { name: string } }) => (
    <span data-testid="team-avatar">{team.name.charAt(0)}</span>
  ),
}));

const { TeamSwitcher } = await import("../sidebar-team-switcher");

function makeTeam(
  index: number,
  overrides: Partial<TeamWithMemberInfo> = {}
): TeamWithMemberInfo {
  return {
    id: `team-${index}`,
    name: `Team ${index}`,
    slug: `team-${index}`,
    description: null,
    image: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    deletedAt: null,
    memberCount: index,
    myManagementRole: null,
    myOperationalRole: "member",
    ...overrides,
  };
}

function setupTeams(teams: TeamWithMemberInfo[], currentTeam = teams[0]) {
  mockUseTeams.mockReturnValue({
    data: { teams, activeTeamId: currentTeam?.id ?? null },
    isLoading: false,
  });
  mockUseTeam.mockReturnValue({
    currentTeam,
    isLoading: false,
  });
}

async function openSwitcher() {
  await userEvent.click(
    screen.getByRole("button", {
      name: /current team:/i,
    })
  );
}

describe("TeamSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMultiTeamMode.mockReturnValue(false);
    mockUseSwitchTeam.mockReturnValue({
      mutate: mockSwitchTeam,
      isPending: false,
    });

    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...window.location,
        assign: mockAssign,
      },
    });
  });

  it("is hidden in single-team mode when the user has one team", () => {
    setupTeams([makeTeam(1)]);

    render(<TeamSwitcher />);

    expect(
      screen.queryByRole("button", { name: /current team:/i })
    ).not.toBeInTheDocument();
  });

  it("is visible in single-team mode when the user has two or more teams", () => {
    setupTeams([makeTeam(1), makeTeam(2)]);

    render(<TeamSwitcher />);

    expect(
      screen.getByRole("button", {
        name: "Current team: Team 1. Switch team",
      })
    ).toBeInTheDocument();
  });

  it("is visible in multi-team mode even with a single team", () => {
    mockIsMultiTeamMode.mockReturnValue(true);
    setupTeams([makeTeam(1)]);

    render(<TeamSwitcher />);

    expect(
      screen.getByRole("button", {
        name: "Current team: Team 1. Switch team",
      })
    ).toBeInTheDocument();
  });

  it("renders every team with no five-team cap", async () => {
    const teams = Array.from({ length: 7 }, (_, index) => makeTeam(index + 1));
    setupTeams(teams);

    render(<TeamSwitcher />);
    await openSwitcher();

    const menu = await screen.findByRole("menu");
    for (const team of teams) {
      expect(within(menu).getByText(team.name)).toBeInTheDocument();
    }
    expect(within(menu).queryByText(/\+\d+ more teams/i)).not.toBeInTheDocument();
  });

  it("shows a filter input for long team lists and narrows results", async () => {
    const teams = Array.from({ length: 9 }, (_, index) =>
      makeTeam(index + 1, {
        name: index === 8 ? "Design Systems" : `Engineering ${index + 1}`,
      })
    );
    setupTeams(teams);

    render(<TeamSwitcher />);
    await openSwitcher();

    const filter = await screen.findByLabelText("Filter teams");
    await userEvent.type(filter, "Design");

    const menu = screen.getByRole("menu");
    expect(within(menu).getByText("Design Systems")).toBeInTheDocument();
    expect(within(menu).queryByText("Engineering 2")).not.toBeInTheDocument();
  });

  it("switching a team triggers mutate and full reloads to projects", async () => {
    const teams = [makeTeam(1), makeTeam(2)];
    setupTeams(teams);
    mockSwitchTeam.mockImplementation((_teamId, options) => {
      options.onSuccess();
    });

    render(<TeamSwitcher />);
    await openSwitcher();
    await userEvent.click(await screen.findByText("Team 2"));

    expect(mockSwitchTeam).toHaveBeenCalledWith("team-2", {
      onSuccess: expect.any(Function),
      onError: expect.any(Function),
    });
    await waitFor(() => {
      expect(mockAssign).toHaveBeenCalledWith("/projects");
    });
  });
});
