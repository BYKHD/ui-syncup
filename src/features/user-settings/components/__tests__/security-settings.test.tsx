import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SecuritySettings } from "../security-settings";
import * as authHooks from "@/features/auth/hooks";

// Mock the auth hooks
vi.mock("@/features/auth/hooks", () => ({
  useLinkedAccounts: vi.fn(),
  useLinkAccount: vi.fn(),
  useUnlinkAccount: vi.fn(),
}));

// Mock PasswordSection as it has its own tests (or will have)
vi.mock("../password-section", () => ({
  PasswordSection: () => <div data-testid="password-section">Password Section Mock</div>,
}));

describe("SecuritySettings", () => {
  const mockLinkAccount = vi.fn();
  const mockUnlinkAccount = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    (authHooks.useLinkAccount as any).mockReturnValue({
      mutate: mockLinkAccount,
      isPending: false,
    });

    (authHooks.useUnlinkAccount as any).mockReturnValue({
      mutate: mockUnlinkAccount,
      isPending: false,
    });
  });

  test("renders loading state", () => {
    (authHooks.useLinkedAccounts as any).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    const { container } = render(<SecuritySettings hasPassword={false} />);
    // Check for skeleton loaders (divs with animate-pulse class)
    const skeletons = container.getElementsByClassName("animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test("renders error state", () => {
    (authHooks.useLinkedAccounts as any).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error("Failed to load"),
    });

    render(<SecuritySettings hasPassword={false} />);
    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  test("renders provider list with status", () => {
    (authHooks.useLinkedAccounts as any).mockReturnValue({
      data: [
        { providerId: "google", accountId: "123", email: "test@google.com" },
      ],
      isLoading: false,
      error: null,
    });

    render(<SecuritySettings hasPassword={false} />);

    // Google should be connected
    const googleCard = screen.getByText("Google").closest("div[class*='flex items-center gap-4']")?.parentElement;
    expect(googleCard).toHaveTextContent("Connected");
    
    // Microsoft should not be connected
    const microsoftCard = screen.getByText("Microsoft").closest("div[class*='flex items-center gap-4']")?.parentElement;
    expect(microsoftCard).toHaveTextContent("Not connected");
  });

  test("calls linkAccount when Connect is clicked", () => {
    (authHooks.useLinkedAccounts as any).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<SecuritySettings hasPassword={false} />);

    const connectButtons = screen.getAllByText("Connect");
    fireEvent.click(connectButtons[0]); // Click first connect button (Google)

    expect(mockLinkAccount).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "google" }),
      expect.any(Object)
    );
  });

  test("calls unlinkAccount when Disconnect is clicked and confirmed", async () => {
    (authHooks.useLinkedAccounts as any).mockReturnValue({
      data: [
        { providerId: "google", accountId: "123" },
        { providerId: "microsoft", accountId: "456" }, // Two accounts to allow unlinking
      ],
      isLoading: false,
      error: null,
    });

    render(<SecuritySettings hasPassword={false} />);

    const disconnectButton = screen.getAllByText("Disconnect")[0];
    fireEvent.click(disconnectButton);

    // Dialog should be open
    expect(screen.getByText("Unlink Google account?")).toBeInTheDocument();

    // Click confirm
    const confirmButton = screen.getByRole("button", { name: "Disconnect" });
    fireEvent.click(confirmButton);

    expect(mockUnlinkAccount).toHaveBeenCalledWith(
      expect.objectContaining({ providerId: "google" }),
      expect.any(Object)
    );
  });
});
