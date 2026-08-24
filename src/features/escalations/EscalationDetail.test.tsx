// src/features/escalations/EscalationDetail.test.tsx
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi, describe, it, expect, beforeEach, type Mock } from "vitest";
import { EscalationDetail } from "./EscalationDetail";
import { api } from "@/services/api";
import { UserRole } from "@/types/auth";

// ADDED: Mock the external API service for both GET and PATCH requests
vi.mock("@/services/api", () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

// ADDED: Mock the Sidebar to isolate the core component
vi.mock("@/components/SideBar", () => ({
  Sidebar: () => <div data-testid="mock-sidebar">Sidebar</div>,
}));

const mockNavigate = vi.fn();
// ADDED: Mock react-router-dom navigation, but retain real routing for useParams compatibility
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockEscalation = {
  _id: "esc_123",
  lead_id: "lead_456",
  message_id: "msg_789",
  reason: "Customer requested pricing negotiation",
  priority: "high",
  assigned_to: "user_2",
  status: "open",
  created_at: "2026-08-24T10:00:00Z",
  resolved_at: null,
};

const mockUsers = [
  { _id: "user_1", email: "manager@example.com", role: UserRole.SALES_MANAGER },
  { _id: "user_2", email: "exec1@example.com", role: UserRole.SALES_EXECUTIVE },
  { _id: "user_3", email: "exec2@example.com", role: UserRole.SALES_EXECUTIVE },
];

describe("EscalationDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (id = "esc_123") => {
    return render(
      <MemoryRouter initialEntries={[`/escalations/${id}`]}>
        <Routes>
          <Route path="/escalations/:id" element={<EscalationDetail />} />
        </Routes>
      </MemoryRouter>,
    );
  };

  const setupApiMocks = () => {
    (api.get as Mock).mockImplementation((url) => {
      if (url.includes("/api/escalations/")) {
        return Promise.resolve({ data: mockEscalation });
      }
      if (url === "/api/users") {
        return Promise.resolve({ data: mockUsers });
      }
      return Promise.reject(new Error("Not Found"));
    });
  };

  it("renders loading state initially, then loads escalation and users", async () => {
    setupApiMocks();
    renderComponent();

    // Verify initial loading state
    expect(screen.getByText(/Loading escalation/i)).toBeInTheDocument();

    await waitFor(() => {
      // Verify data rendered
      expect(
        screen.getByText("Customer requested pricing negotiation"),
      ).toBeInTheDocument();
      expect(screen.getByText("msg_789")).toBeInTheDocument();
      expect(screen.getByText("lead_456")).toBeInTheDocument();
      expect(screen.getByText(/high priority/i)).toBeInTheDocument();
    });

    // Verify API calls
    expect(api.get).toHaveBeenCalledWith("/api/escalations/esc_123");
    expect(api.get).toHaveBeenCalledWith("/api/users");

    // Verify only SALES_EXECUTIVE users are populated in the select dropdown
    const assignedSelect = screen.getByLabelText(/Assigned user/i);
    expect(assignedSelect).toHaveTextContent("exec1@example.com");
    expect(assignedSelect).toHaveTextContent("exec2@example.com");
    expect(assignedSelect).not.toHaveTextContent("manager@example.com");
  });

  it("handles fetch error state gracefully", async () => {
    (api.get as Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { detail: "Escalation not found in database" } },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Escalation not found in database",
      );
    });

    // Verify retry button presence
    expect(
      screen.getByRole("button", { name: /Try again/i }),
    ).toBeInTheDocument();
  });

  it("allows updating status and assigned user, then successfully saves", async () => {
    setupApiMocks();
    (api.patch as Mock).mockResolvedValueOnce({
      data: { ...mockEscalation, status: "in_progress", assigned_to: "user_3" },
    });
    const user = userEvent.setup();

    renderComponent();

    // Wait for load
    await waitFor(() => {
      expect(
        screen.getByText("Customer requested pricing negotiation"),
      ).toBeInTheDocument();
    });

    // Change status
    const statusSelect = screen.getByLabelText(/Status/i);
    await user.selectOptions(statusSelect, "in_progress");

    // Change assignee
    const assignSelect = screen.getByLabelText(/Assigned user/i);
    await user.selectOptions(assignSelect, "user_3");

    // Submit save
    const saveBtn = screen.getByRole("button", { name: /Save changes/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith("/api/escalations/esc_123", {
        status: "in_progress",
        assigned_to: "user_3",
      });
      expect(screen.getByRole("status")).toHaveTextContent(
        "Escalation updated successfully.",
      );
    });
  });

  it("handles errors during the save operation", async () => {
    setupApiMocks();
    (api.patch as Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { detail: "Permission denied" } },
    });
    const user = userEvent.setup();

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Save changes/i }),
      ).toBeInTheDocument();
    });

    const saveBtn = screen.getByRole("button", { name: /Save changes/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalled();
      expect(screen.getByRole("alert")).toHaveTextContent("Permission denied");
    });
  });

  it("navigates back to list when back button is clicked", async () => {
    setupApiMocks();
    renderComponent();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "←" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "←" }));

    expect(mockNavigate).toHaveBeenCalledWith("/escalations");
  });
});
