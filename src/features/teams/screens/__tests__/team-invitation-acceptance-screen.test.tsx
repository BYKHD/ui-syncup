import { render, screen } from "@testing-library/react";
import type { HTMLAttributes, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TeamInvitationAcceptanceScreen } from "../team-invitation-acceptance-screen";

const mockRouterPush = vi.fn();
const mockRemoveQueries = vi.fn();
const mockInvalidateQueries = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    removeQueries: mockRemoveQueries,
    invalidateQueries: mockInvalidateQueries,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
  motion: {
    div: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

function renderScreen(currentUserEmail = "wrong@example.com") {
  return render(
    <TeamInvitationAcceptanceScreen
      token="token-1"
      invitationId="invitation-1"
      invitation={{
        email: "invitee@example.com",
        managementRole: null,
        operationalRole: "TEAM_MEMBER",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      }}
      teamName="Design Team"
      inviterName="Owner"
      currentUserEmail={currentUserEmail}
    />
  );
}

describe("TeamInvitationAcceptanceScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        removeItem: vi.fn(),
      },
    });
  });

  it("blocks acceptance when the signed-in email does not match the invitation", () => {
    renderScreen();

    expect(
      screen.getByText("Sign in with the invited email address to accept this invitation.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("This invitation can only be accepted by the invited account.")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Accept invitation to join Design Team" })
    ).toBeDisabled();
  });

  it("allows acceptance when the signed-in email matches the invitation", () => {
    renderScreen("invitee@example.com");

    expect(
      screen.getByRole("button", { name: "Accept invitation to join Design Team" })
    ).not.toBeDisabled();
  });
});
