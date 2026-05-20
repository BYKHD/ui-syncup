import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockGetSession = vi.fn();
const mockAcceptInvitation = vi.fn();

vi.mock("@/server/auth/session", () => ({
  getSession: () => mockGetSession(),
}));

vi.mock("@/server/teams/invitation-service", () => ({
  acceptInvitation: (...args: unknown[]) => mockAcceptInvitation(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const { GET } = await import("../route");

function makeRequest(token: string) {
  return new NextRequest(`http://localhost/api/teams/invitations/${token}/accept`);
}

describe("GET /api/teams/invitations/[token]/accept", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      id: "user-1",
      email: "wrong-user@example.com",
      name: "Wrong User",
    });
  });

  it("maps recipient email mismatch to 403", async () => {
    mockAcceptInvitation.mockRejectedValue(
      new Error("This invitation was sent to a different email address")
    );

    const response = await GET(makeRequest("token-1"), {
      params: Promise.resolve({ token: "token-1" }),
    });
    const body = await response.json();

    expect(mockAcceptInvitation).toHaveBeenCalledWith("token-1", "user-1");
    expect(response.status).toBe(403);
    expect(body.error).toEqual({
      code: "EMAIL_MISMATCH",
      message: "This invitation was sent to a different email address",
    });
  });
});
