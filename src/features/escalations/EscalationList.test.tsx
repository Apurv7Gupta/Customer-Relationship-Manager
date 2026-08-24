import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach, type Mock } from "vitest";
import { EscalationList } from "./EscalationList";
import { api } from "@/services/api";

// Mock the external API service
vi.mock("@/services/api", () => ({
  api: {
    get: vi.fn(),
  },
}));

// Mock the Sidebar to isolate the component's core functionality
vi.mock("@/components/SideBar", () => ({
  Sidebar: () => <div data-testid="mock-sidebar">Sidebar</div>,
}));

const mockPaginatedResponse = {
  data: [
    {
      _id: "esc_123",
      lead_id: "lead_456",
      message_id: "msg_789",
      reason: "Customer is extremely dissatisfied with service",
      priority: "high",
      assigned_to: "mgr_1",
      status: "open",
      created_at: "2026-08-24T10:00:00Z",
      resolved_at: null,
    },
  ],
  meta: {
    page: 1,
    page_size: 10,
    total: 15,
    total_pages: 2,
  },
};

describe("EscalationList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (initialEntries = ["/escalations"]) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <EscalationList />
      </MemoryRouter>,
    );
  };

  it("displays loading state initially and then renders escalations", async () => {
    (api.get as Mock).mockResolvedValueOnce({ data: mockPaginatedResponse });

    renderComponent();

    // Verify loading state
    expect(screen.getByRole("status")).toHaveTextContent(
      /Loading escalations/i,
    );

    // Verify successful render
    await waitFor(() => {
      expect(
        screen.getByText("Customer is extremely dissatisfied with service"),
      ).toBeInTheDocument();
      expect(screen.getByText(/Lead lead_456/i)).toBeInTheDocument();
      expect(screen.getByText(/high priority/i)).toBeInTheDocument();
      expect(screen.getByText(/Page 1 of 2/i)).toBeInTheDocument();
    });

    expect(api.get).toHaveBeenCalledWith("/api/escalations", {
      params: { page: 1, page_size: 10, status: undefined },
    });
  });

  it("handles API error state and retry mechanism", async () => {
    const user = userEvent.setup();
    (api.get as Mock)
      .mockRejectedValueOnce({
        response: { data: { detail: "Database connection failed" } },
        isAxiosError: true,
      })
      .mockResolvedValueOnce({ data: mockPaginatedResponse }); // For the retry

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Database connection failed",
      );
    });

    // Test retry
    const retryBtn = screen.getByRole("button", { name: /try again/i });
    await user.click(retryBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Customer is extremely dissatisfied with service"),
      ).toBeInTheDocument();
    });

    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it("renders empty state when API returns empty array", async () => {
    (api.get as Mock).mockResolvedValueOnce({
      data: {
        data: [],
        meta: { page: 1, page_size: 10, total: 0, total_pages: 0 },
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText(/No escalations match the selected filter/i),
      ).toBeInTheDocument();
    });
  });

  it("updates search params and fetches new data when status filter changes", async () => {
    const user = userEvent.setup();
    (api.get as Mock)
      .mockResolvedValueOnce({ data: mockPaginatedResponse })
      .mockResolvedValueOnce({ data: mockPaginatedResponse });

    renderComponent();

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));

    const select = screen.getByLabelText(/Status Filter/i);
    await user.selectOptions(select, "resolved");

    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith("/api/escalations", {
        params: { page: 1, page_size: 10, status: "resolved" },
      });
    });
  });

  it("handles pagination controls correctly", async () => {
    const user = userEvent.setup();
    (api.get as Mock)
      .mockResolvedValueOnce({ data: mockPaginatedResponse }) // Page 1
      .mockResolvedValueOnce({
        data: {
          ...mockPaginatedResponse,
          meta: { ...mockPaginatedResponse.meta, page: 2 },
        },
      }); // Page 2

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Previous/i })).toBeDisabled();
    });

    const nextBtn = screen.getByRole("button", { name: /Next/i });
    expect(nextBtn).not.toBeDisabled();

    await user.click(nextBtn);

    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith("/api/escalations", {
        params: { page: 2, page_size: 10, status: undefined },
      });
      expect(screen.getByText(/Page 2 of 2/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Next/i })).toBeDisabled();
      expect(
        screen.getByRole("button", { name: /Previous/i }),
      ).not.toBeDisabled();
    });
  });

  it("initializes fetch with correct params from URL", async () => {
    (api.get as Mock).mockResolvedValueOnce({ data: mockPaginatedResponse });

    // Bootstrap with URL containing query parameters
    renderComponent(["/escalations?page=2&status=in_progress"]);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/api/escalations", {
        params: { page: 2, page_size: 10, status: "in_progress" },
      });
    });
  });
});
