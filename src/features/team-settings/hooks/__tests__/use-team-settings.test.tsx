import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useTeamSettings } from "../use-team-settings";
import { useUpdateTeam } from "@/features/teams";
import type { Team } from "@/features/teams/api";

// Mock useUpdateTeam
vi.mock("@/features/teams", () => ({
  useUpdateTeam: vi.fn(),
}));

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("useTeamSettings", () => {
  const mockTeam: Team = {
    id: "team-1",
    name: "Test Team",
    slug: "test-team",
    description: "A test team",
    image: null,
    createdAt: "2023-01-01T00:00:00Z",
    updatedAt: "2023-01-01T00:00:00Z",
    deletedAt: null,
  };

  const mockUpdateTeam = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useUpdateTeam as any).mockReturnValue({
      mutate: mockUpdateTeam,
      isPending: false,
    });
  });

  it("should initialize with team data", () => {
    const { result } = renderHook(() =>
      useTeamSettings({ initialTeam: mockTeam })
    );

    expect(result.current.currentTeam).toEqual(mockTeam);
    expect(result.current.form.getValues("name")).toBe(mockTeam.name);
  });

  it("should handle image change", async () => {
    const { result } = renderHook(() =>
      useTeamSettings({ initialTeam: mockTeam })
    );

    const file = new File(["(⌐□_□)"], "chucknorris.png", { type: "image/png" });
    const event = {
      target: {
        files: [file],
      },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    // Mock FileReader
    const mockFileReader = {
      readAsDataURL: vi.fn(),
      onloadend: vi.fn(),
      result: "data:image/png;base64,chucknorris",
    };
    window.FileReader = vi.fn(() => mockFileReader) as any;

    act(() => {
      result.current.handleImageChange(file);
    });

    expect(mockFileReader.readAsDataURL).toHaveBeenCalledWith(file);

    // Simulate onloadend
    act(() => {
      mockFileReader.onloadend();
    });

    expect(result.current.imagePreview).toBe("data:image/png;base64,chucknorris");
  });

  it("should submit form and update team", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useTeamSettings({ initialTeam: mockTeam, onSuccess })
    );

    const newName = "Updated Team Name";

    act(() => {
      result.current.form.setValue("name", newName);
    });

    // Mock successful update
    mockUpdateTeam.mockImplementation((variables, options) => {
      options.onSuccess({ team: { ...mockTeam, name: newName } });
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockUpdateTeam).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: mockTeam.id,
        input: expect.objectContaining({
          name: newName,
        }),
      }),
      expect.any(Object)
    );

    expect(result.current.currentTeam.name).toBe(newName);
    expect(onSuccess).toHaveBeenCalled();
  });

  it("should handle update error", async () => {
    const { result } = renderHook(() =>
      useTeamSettings({ initialTeam: mockTeam })
    );

    const error = new Error("Update failed");

    // Mock failed update
    mockUpdateTeam.mockImplementation((variables, options) => {
      options.onError(error);
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockUpdateTeam).toHaveBeenCalled();
    // Toast error should be called (mocked)
  });
});
