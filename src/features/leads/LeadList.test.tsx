import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { LeadList } from "./LeadList";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types/auth";

vi.mock("@/services/api");
vi.mock("@/context/AuthContext");

describe("LeadList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      hasRole: vi
        .fn()
        .mockImplementation((roles) => roles.includes(UserRole.OWNER)),
    });
  });

  const renderComponent = () =>
    render(
      <BrowserRouter>
        <LeadList />
      </BrowserRouter>,
    );

  it("fetches and displays leads on initial load", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        data: [
          { _id: "1", name: "Alice", status: "new", priority: "high" },
          { _id: "2", name: "Bob", status: "qualified", priority: "medium" },
        ],
        meta: { page: 1, page_size: 10, total: 2, total_pages: 1 },
      },
    });

    renderComponent();

    expect(screen.getByText(/Loading leads.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
    });
  });

  it("updates search parameters when typing in the search box", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: [],
        meta: { page: 1, page_size: 10, total: 0, total_pages: 1 },
      },
    });

    renderComponent();

    const searchInput = screen.getByPlaceholderText(
      /Search by name, email, or phone.../i,
    );
    await user.type(searchInput, "Alice");

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        "/api/leads",
        expect.objectContaining({
          params: expect.objectContaining({ search: "Alice" }),
        }),
      );
    });
  });

  it("hides the Create Lead button for non-owners", async () => {
    (useAuth as any).mockReturnValue({
      hasRole: vi.fn().mockReturnValue(false),
    });
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        data: [],
        meta: { page: 1, page_size: 10, total: 0, total_pages: 1 },
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(
        screen.queryByRole("link", { name: /Create Lead/i }),
      ).not.toBeInTheDocument();
    });
  });
});
