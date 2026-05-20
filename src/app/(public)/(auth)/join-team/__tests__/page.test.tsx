import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRedirect = vi.fn();
const mockNotFound = vi.fn();
const mockGetSession = vi.fn();
const mockGetTeamInvitationByToken = vi.fn();
const mockAcceptInvitation = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
  notFound: mockNotFound,
}));

vi.mock("@/server/auth/session", () => ({
  getSession: () => mockGetSession(),
}));

vi.mock("@/server/teams/invitation-service", () => ({
  acceptInvitation: (...args: unknown[]) => mockAcceptInvitation(...args),
  getTeamInvitationByToken: (...args: unknown[]) => mockGetTeamInvitationByToken(...args),
}));

vi.mock("@/features/teams", () => ({
  TeamInvitationAcceptanceScreen: () => <div>Invitation acceptance screen</div>,
}));

const { default: JoinTeamPage } = await import("../page");

function makeInvitation(overrides: Partial<{
  email: string;
  usedAt: Date | null;
  cancelledAt: Date | null;
  expiresAt: Date;
}> = {}) {
  return {
    id: "invitation-1",
    email: "invitee@example.com",
    managementRole: null,
    operationalRole: "TEAM_MEMBER",
    expiresAt: new Date(Date.now() + 60_000),
    usedAt: null,
    cancelledAt: null,
    ...overrides,
  };
}

function mockInvitationData(invitation = makeInvitation()) {
  mockGetTeamInvitationByToken.mockResolvedValue({
    invitation,
    teamName: "Design Team",
    teamSlug: "design-team",
    inviterName: "Owner",
  });
}

describe("JoinTeamPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      id: "user-1",
      email: "invitee@example.com",
      name: "Invitee",
    });
  });

  it("routes an existing member revisiting a used invitation into projects", async () => {
    mockInvitationData(makeInvitation({ usedAt: new Date() }));
    mockAcceptInvitation.mockResolvedValue(undefined);

    await JoinTeamPage({ searchParams: Promise.resolve({ token: "token-1" }) });

    expect(mockAcceptInvitation).toHaveBeenCalledWith("token-1", "user-1");
    expect(mockRedirect).toHaveBeenCalledWith("/projects");
  });

  it("keeps the used status card when the stale invitation is not accepted", async () => {
    mockInvitationData(makeInvitation({ usedAt: new Date() }));
    mockAcceptInvitation.mockRejectedValue(new Error("Invitation already used"));

    const result = await JoinTeamPage({ searchParams: Promise.resolve({ token: "token-1" }) });
    render(result);

    expect(mockRedirect).not.toHaveBeenCalledWith("/projects");
    expect(screen.getByText("Invitation Already Accepted")).toBeInTheDocument();
  });

  it("renders the acceptance screen for pending invitations", async () => {
    mockInvitationData();

    const result = await JoinTeamPage({ searchParams: Promise.resolve({ token: "token-1" }) });
    render(result);

    expect(mockAcceptInvitation).not.toHaveBeenCalled();
    expect(screen.getByText("Invitation acceptance screen")).toBeInTheDocument();
  });
});
