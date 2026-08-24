import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach, type Mock } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { UserManagement } from "./UserManagement";
import { api } from "@/services/api";
import { UserRole } from "@/types/auth";

vi.mock("@/services/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock("@/components/SideBar", () => ({
  Sidebar: () => <div data-testid="mock-sidebar">Sidebar</div>,
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

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

describe("UserManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <MemoryRouter initialEntries={["/users"]}>
        <Routes>
          <Route path="/users" element={<UserManagement />} />
        </Routes>
      </MemoryRouter>,
    );

  it("fetches and displays the user list on mount", async () => {
    (api.get as Mock).mockResolvedValueOnce({
      data: [
        { _id: "1", email: "admin@example.com", role: UserRole.OWNER },
        {
          _id: "2",
          email: "sales@example.com",
          role: UserRole.SALES_EXECUTIVE,
        },
      ],
    });

    renderComponent();

    expect(screen.getByText(/Loading users.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("admin@example.com")).toBeInTheDocument();
      // Used getAllByText to avoid conflict with the select dropdown option
      expect(screen.getAllByText("owner").length).toBeGreaterThan(0);
      expect(screen.getByText("sales@example.com")).toBeInTheDocument();
      expect(screen.getAllByText("sales executive").length).toBeGreaterThan(0);
    });

    expect(api.get).toHaveBeenCalledWith("/api/users");
  });

  it("handles fetch errors gracefully", async () => {
    (api.get as Mock).mockRejectedValueOnce({
      response: { data: { detail: "Failed to load users from database" } },
    });

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load users from database"),
      ).toBeInTheDocument();
    });
  });

  it("validates form inputs before submission", async () => {
    (api.get as Mock).mockResolvedValueOnce({ data: [] });
    renderComponent();

    // Await initial fetch to prevent act(...) state warnings
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));

    const submitBtn = screen.getByRole("button", { name: /Create User/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Invalid email address")).toBeInTheDocument();
      expect(
        screen.getByText("Password must be at least 8 characters"),
      ).toBeInTheDocument();
    });

    expect(api.post).not.toHaveBeenCalled();
  });

  it("submits valid form data and refreshes the user list", async () => {
    const user = userEvent.setup();
    (api.get as Mock)
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({
        data: [
          { _id: "3", email: "new@example.com", role: UserRole.SALES_MANAGER },
        ],
      });
    (api.post as Mock).mockResolvedValueOnce({ data: { message: "Success" } });

    const { container } = renderComponent();

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));

    const emailInput = container.querySelector(
      'input[name="email"]',
    ) as HTMLInputElement;
    const passInput = container.querySelector(
      'input[name="password"]',
    ) as HTMLInputElement;
    const roleSelect = container.querySelector(
      'select[name="role"]',
    ) as HTMLSelectElement;

    await user.type(emailInput, "new@example.com");
    await user.type(passInput, "securepassword123");
    await user.selectOptions(roleSelect, UserRole.SALES_MANAGER);

    const submitBtn = screen.getByRole("button", { name: /Create User/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/api/users", {
        email: "new@example.com",
        password: "securepassword123",
        role: UserRole.SALES_MANAGER,
      });
      expect(api.get).toHaveBeenCalledTimes(2);
      expect(screen.getByText("new@example.com")).toBeInTheDocument();
    });
  });

  it("displays form errors on submission failure", async () => {
    const user = userEvent.setup();
    (api.get as Mock).mockResolvedValueOnce({ data: [] });
    (api.post as Mock).mockRejectedValueOnce({
      response: { data: { detail: "Email already exists" } },
    });

    const { container } = renderComponent();

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));

    const emailInput = container.querySelector(
      'input[name="email"]',
    ) as HTMLInputElement;
    const passInput = container.querySelector(
      'input[name="password"]',
    ) as HTMLInputElement;

    await user.type(emailInput, "duplicate@example.com");
    await user.type(passInput, "securepassword123");

    const submitBtn = screen.getByRole("button", { name: /Create User/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Email already exists",
      );
    });
  });

  it("navigates back when the back button is clicked", async () => {
    (api.get as Mock).mockResolvedValueOnce({ data: [] });
    renderComponent();

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));

    // Select the first button explicitly to avoid conflict with the submit button
    const backBtn = screen.getAllByRole("button")[0];
    fireEvent.click(backBtn);

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
