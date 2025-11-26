import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useOnboarding } from "../use-onboarding";

GlobalRegistrator.register();

// Mock dependencies
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
};
vi.mock("sonner", () => ({
  toast: mockToast,
}));

const mockCreateTeam = vi.fn();
const mockUseTeams = vi.fn();

vi.mock("@/features/teams", () => ({
  useCreateTeam: () => ({
    mutate: mockCreateTeam,
    isPending: false,
  }),
  useTeams: () => mockUseTeams(),
}));

describe("useOnboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTeams.mockReturnValue({ data: { teams: [] }, isLoading: false });
  });

  it("should initialize with create mode when no token is provided", () => {
    const { result } = renderHook(() => useOnboarding(null, "My Team"));
    expect(result.current.mode).toBe("create");
    expect(result.current.form.getValues("teamName")).toBe("My Team");
  });

  it("should initialize with accept mode when token is provided", () => {
    const { result } = renderHook(() => useOnboarding("token123", "My Team"));
    expect(result.current.mode).toBe("accept");
  });

  it("should call createTeam when handleCreateTeam is submitted", async () => {
    const { result } = renderHook(() => useOnboarding(null, "New Team"));

    await act(async () => {
      await result.current.handleCreateTeam({
        preventDefault: vi.fn(),
      } as any);
    });

    expect(mockCreateTeam).toHaveBeenCalledWith(
      { name: "New Team", description: "" },
      expect.any(Object)
    );
  });

  it("should show error when Pro plan is selected", async () => {
    const { result } = renderHook(() => useOnboarding(null, "New Team"));

    act(() => {
      result.current.setSelectedPlan("pro");
    });

    await act(async () => {
      await result.current.handleCreateTeam({
        preventDefault: vi.fn(),
      } as any);
    });

    expect(mockCreateTeam).not.toHaveBeenCalled();
    expect(result.current.error).toContain("Pro plan is coming soon");
  });

  it("should redirect to projects on successful team creation", async () => {
    mockCreateTeam.mockImplementation((data, options) => {
      options.onSuccess({ team: { id: "1", name: "New Team" } });
    });

    const { result } = renderHook(() => useOnboarding(null, "New Team"));

    await act(async () => {
      await result.current.handleCreateTeam({
        preventDefault: vi.fn(),
      } as any);
    });

    expect(mockToast.success).toHaveBeenCalledWith("Team created successfully");
    expect(mockPush).toHaveBeenCalledWith("/projects");
  });

  it("should set error on team creation failure", async () => {
    mockCreateTeam.mockImplementation((data, options) => {
      options.onError(new Error("Creation failed"));
    });

    const { result } = renderHook(() => useOnboarding(null, "New Team"));

    await act(async () => {
      await result.current.handleCreateTeam({
        preventDefault: vi.fn(),
      } as any);
    });

    expect(result.current.error).toBe("Creation failed");
  });
});
