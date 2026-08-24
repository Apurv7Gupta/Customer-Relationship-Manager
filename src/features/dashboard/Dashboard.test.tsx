import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach, type Mock } from "vitest";
import { Dashboard } from "./Dashboard";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";

vi.mock("@/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/services/api", () => ({
  api: { get: vi.fn() },
}));

vi.mock("@/components/SideBar", () => ({
  Sidebar: () => <div data-testid="mock-sidebar">Sidebar</div>,
}));

vi.mock("framer-motion", async () => {
  const actual = await vi.importActual("framer-motion");
  return {
    ...actual,
    motion: {
      div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
      header: ({ children, ...props }: any) => (
        <header {...props}>{children}</header>
      ),
    },
  };
});

describe("Dashboard", () => {
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      user: { email: "owner@example.com", role: "owner" },
      logout: mockLogout,
    });
  });

  const setupApiMock = () => {
    (api.get as Mock).mockImplementation((url, config) => {
      if (url === "/api/leads") {
        if (config?.params?.status === "new") {
          return Promise.resolve({ data: { meta: { total: 15 } } });
        }
        if (config?.params?.status === "qualified") {
          return Promise.resolve({ data: { meta: { total: 5 } } });
        }
        return Promise.resolve({ data: { meta: { total: 42 } } });
      }
      if (url === "/api/escalations") {
        return Promise.resolve({ data: { meta: { total: 3 } } });
      }
      return Promise.resolve({ data: {} });
    });
  };

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>,
    );
  };

  it("renders dashboard headers, charts, and stat cards correctly", async () => {
    setupApiMock();
    renderComponent();

    // CHANGED: Await for UI settling to clear act(...) errors
    await waitFor(() => {
      expect(screen.getByText("Total Leads")).toBeInTheDocument();
    });

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("New Leads")).toBeInTheDocument();
    expect(screen.getByText("Qualified Leads")).toBeInTheDocument();
    expect(screen.getByText("Escalated Leads")).toBeInTheDocument();
  });

  it("fetches dashboard statistics on mount and updates the state", async () => {
    setupApiMock();
    renderComponent();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(4);
      expect(screen.getAllByText("42").length).toBeGreaterThan(0);
      expect(screen.getAllByText("15").length).toBeGreaterThan(0);
      expect(screen.getAllByText("5").length).toBeGreaterThan(0);
      expect(screen.getAllByText("3").length).toBeGreaterThan(0);
    });
  });

  it("calls the logout function when the logout button is clicked", async () => {
    setupApiMock();
    renderComponent();

    // CHANGED: Await API calls before interacting to clear act(...) errors
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(4);
    });

    const logoutBtn = screen.getByRole("button", { name: /log out/i });
    fireEvent.click(logoutBtn);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it("handles API errors gracefully without crashing the UI", async () => {
    (api.get as Mock).mockRejectedValue(new Error("Network Error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderComponent();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to fetch dashboard stats",
        expect.any(Error),
      );
    });

    consoleSpy.mockRestore();
  });
});
