import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LeadDetail } from "./LeadDetail";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types/auth";

vi.mock("@/services/api");
vi.mock("@/context/AuthContext");

describe("LeadDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      hasRole: vi
        .fn()
        .mockImplementation((roles) => roles.includes(UserRole.OWNER)),
    });

    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url.includes("/api/leads/")) {
        return {
          data: {
            _id: "1",
            name: "Jane Smith",
            email: "jane@example.com",
            status: "new",
            priority: "high",
            source: "Web",
            assigned_to: "user_2",
          },
        };
      }
      if (url.includes("/api/activities")) {
        return {
          data: {
            data: [
              {
                _id: "a1",
                activity_type: "note",
                description: "Called user",
                created_at: "2026-08-10T10:00:00Z",
              },
            ],
          },
        };
      }
      if (url.includes("/api/followups")) {
        return {
          data: {
            data: [
              {
                _id: "f1",
                lead_id: "1",
                description: "Follow up call",
                status: "pending",
                due_at: "2026-08-11T10:00:00Z",
              },
            ],
          },
        };
      }
      if (url.includes("/api/users")) {
        return {
          data: [
            {
              _id: "user_2",
              email: "exec@example.com",
              role: UserRole.SALES_EXECUTIVE,
            },
          ],
        };
      }
      return { data: {} };
    });
  });

  const renderComponent = () =>
    render(
      <MemoryRouter initialEntries={["/leads/1"]}>
        <Routes>
          <Route path="/leads/:id" element={<LeadDetail />} />
        </Routes>
      </MemoryRouter>,
    );

  it("renders lead details, activities, and followups successfully", async () => {
    renderComponent();

    expect(screen.getByText(/Loading details.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      expect(screen.getByText("jane@example.com")).toBeInTheDocument();
      expect(screen.getByText("Called user")).toBeInTheDocument();
      expect(screen.getByText("Follow up call")).toBeInTheDocument();
    });
  });

  it("allows owner to see delete button and triggers delete API", async () => {
    window.confirm = vi.fn().mockReturnValue(true);
    vi.mocked(api.delete).mockResolvedValueOnce({});

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Delete Lead/i }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Delete Lead/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith("/api/leads/1");
    });
  });

  it("submits a new follow-up successfully", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValueOnce({});

    renderComponent();

    await waitFor(() =>
      expect(screen.getByPlaceholderText("Description")).toBeInTheDocument(),
    );

    await user.type(
      screen.getByPlaceholderText("Description"),
      "Send contract",
    );
    // Firing change event for datetime-local as userEvent typing can be tricky with specific browser implementations
    fireEvent.change(screen.getByDisplayValue(""), {
      target: { value: "2026-08-15T14:30" },
    });

    await user.click(screen.getByRole("button", { name: /Add Task/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/api/followups",
        expect.objectContaining({
          lead_id: "1",
          description: "Send contract",
        }),
      );
    });
  });
});
