import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelAccessRequest,
  createAccessRequest,
  type AccessRequest,
} from "../../api";
import { AccessRequestPanel } from "../access-requests/access-request-panel";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../api", () => ({
  createAccessRequest: vi.fn(),
  cancelAccessRequest: vi.fn(),
}));

const mockCreateAccessRequest = vi.mocked(createAccessRequest);
const mockCancelAccessRequest = vi.mocked(cancelAccessRequest);

function makeAccessRequest(
  overrides: Partial<AccessRequest> = {},
): AccessRequest {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    projectId: "22222222-2222-2222-2222-222222222222",
    requesterUserId: "33333333-3333-3333-3333-333333333333",
    message: null,
    status: "pending",
    decidedByUserId: null,
    decidedAt: null,
    declineCooldownUntil: null,
    createdAt: new Date("2026-05-07T00:00:00.000Z").toISOString(),
    ...overrides,
  };
}

function renderPanel(existingRequest: AccessRequest | null = null) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AccessRequestPanel
        projectId="22222222-2222-2222-2222-222222222222"
        projectName="Design System"
        teamName="Product"
        existingRequest={existingRequest}
      />
    </QueryClientProvider>,
  );
}

describe("AccessRequestPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("transitions from request form to pending after create succeeds", async () => {
    const user = userEvent.setup();
    const createdRequest = makeAccessRequest({ message: "Please add me" });
    mockCreateAccessRequest.mockResolvedValueOnce({ request: createdRequest });

    renderPanel();

    await user.type(
      screen.getByPlaceholderText("Add a note (optional)"),
      "Please add me",
    );
    await user.click(screen.getByRole("button", { name: "Request access" }));

    await waitFor(() => {
      expect(screen.getByText("Request pending")).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("button", { name: "Request access" }),
    ).not.toBeInTheDocument();
    expect(mockCreateAccessRequest).toHaveBeenCalledWith(
      "22222222-2222-2222-2222-222222222222",
      { message: "Please add me" },
    );
  });

  it("presents private project context before requesting access", () => {
    renderPanel();

    expect(screen.getByText("Private project")).toBeInTheDocument();
    expect(screen.getByText("Product team")).toBeInTheDocument();
    expect(screen.getByText("Design System")).toBeInTheDocument();
    expect(screen.getByText("Access level")).toBeInTheDocument();
    expect(screen.getByText("Viewer")).toBeInTheDocument();
    expect(screen.getByLabelText("Note to project owner")).toBeInTheDocument();
  });

  it("transitions from pending to request form after cancel succeeds", async () => {
    const user = userEvent.setup();
    const existingRequest = makeAccessRequest();
    mockCancelAccessRequest.mockResolvedValueOnce({
      ...existingRequest,
      status: "cancelled",
    });

    renderPanel(existingRequest);

    await user.click(screen.getByRole("button", { name: "Cancel request" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Request access" }),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText("Request pending")).not.toBeInTheDocument();
    expect(mockCancelAccessRequest).toHaveBeenCalledWith(
      "22222222-2222-2222-2222-222222222222",
      "11111111-1111-1111-1111-111111111111",
    );
  });

  it("shows owner review status while a request is pending", () => {
    renderPanel(makeAccessRequest());

    expect(screen.getByText("Awaiting review")).toBeInTheDocument();
    expect(screen.getByText("Request pending")).toBeInTheDocument();
    expect(screen.getByText("Owner review")).toBeInTheDocument();
  });

  it("shows when a declined request can be retried", () => {
    renderPanel(
      makeAccessRequest({
        status: "declined",
        declineCooldownUntil: "2026-05-14T00:00:00.000Z",
      }),
    );

    expect(screen.getByText("Cooldown active")).toBeInTheDocument();
    expect(screen.getByText("Request again")).toBeInTheDocument();
    expect(screen.getByText("May 14, 2026")).toBeInTheDocument();
  });
});
