import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { Dashboard } from "./Dashboard";
import { useAuth } from "@/context/AuthContext";

vi.mock("@/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

describe("Dashboard", () => {
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      user: { email: "owner@example.com", role: "owner" },
      logout: mockLogout,
    });
  });

  it("renders user greeting and dashboard cards", () => {
    render(<Dashboard />);

    expect(
      screen.getByText(/Welcome back, owner@example.com/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Total Leads")).toBeInTheDocument();
    expect(screen.getByText("New Leads")).toBeInTheDocument();
  });

  it("calls logout function when logout button is clicked", () => {
    render(<Dashboard />);

    const logoutBtn = screen.getByRole("button", { name: /logout/i });
    fireEvent.click(logoutBtn);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
