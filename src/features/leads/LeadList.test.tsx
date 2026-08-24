import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach, type Mock } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { LeadList } from "./LeadList";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";

vi.mock("@/services/api", () => ({
  api: { get: vi.fn() },
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: vi.fn(),
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
      tbody: ({ children, ...props }: any) => (
        <tbody {...props}>{children}</tbody>
      ),
      tr: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
    },
  };
});

describe("LeadList", () => {
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as Mock).mockReturnValue({
      logout: mockLogout,
    });
  });

  const renderComponent = () =>
    render(
      <BrowserRouter>
        <LeadList />
      </BrowserRouter>,
    );

  it("fetches and displays leads on initial load", async () => {
    (api.get as Mock).mockResolvedValueOnce({
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

  it("updates search parameters when submitting the search form", async () => {
    const user = userEvent.setup();
    (api.get as Mock)
      .mockResolvedValueOnce({
        data: {
          data: [],
          meta: { page: 1, page_size: 10, total: 0, total_pages: 1 },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: [{ _id: "1", name: "Alice", status: "new", priority: "high" }],
          meta: { page: 1, page_size: 10, total: 1, total_pages: 1 },
        },
      });

    renderComponent();

    const searchInput = screen.getByPlaceholderText(
      /Search by name, email, or phone.../i,
    );

    await user.type(searchInput, "Alice{enter}");

    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith(
        "/api/leads",
        expect.objectContaining({
          params: expect.objectContaining({
            search: "Alice",
            page: 1,
            page_size: 10,
          }),
        }),
      );
    });
  });

  it("updates API query parameters when changing the status filter", async () => {
    const user = userEvent.setup();
    (api.get as Mock).mockResolvedValue({
      data: {
        data: [],
        meta: { page: 1, page_size: 10, total: 0, total_pages: 1 },
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(1);
    });

    // CHANGED: Selected by role instead of label to prevent DOM linking errors
    const statusDropdown = screen.getByRole("combobox");
    await user.selectOptions(statusDropdown, "qualified");

    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith(
        "/api/leads",
        expect.objectContaining({
          params: expect.objectContaining({
            status: "qualified",
            page: 1,
            page_size: 10,
          }),
        }),
      );
    });
  });

  it("handles pagination control clicks", async () => {
    const user = userEvent.setup();
    (api.get as Mock)
      .mockResolvedValueOnce({
        data: {
          data: [{ _id: "1", name: "Alice", status: "new", priority: "high" }],
          meta: { page: 1, page_size: 10, total: 15, total_pages: 2 },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: [
            { _id: "2", name: "Bob", status: "qualified", priority: "medium" },
          ],
          meta: { page: 2, page_size: 10, total: 15, total_pages: 2 },
        },
      });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    const nextButton = screen.getByRole("button", { name: /Next/i });
    expect(nextButton).not.toBeDisabled();

    await user.click(nextButton);

    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith(
        "/api/leads",
        expect.objectContaining({
          params: expect.objectContaining({ page: 2, page_size: 10 }),
        }),
      );
      expect(screen.getByText("Bob")).toBeInTheDocument();
    });
  });
});
