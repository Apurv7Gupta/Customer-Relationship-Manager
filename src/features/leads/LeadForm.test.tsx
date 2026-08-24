import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach, type Mock } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LeadForm } from "./LeadForm";
import { api } from "@/services/api";

vi.mock("@/services/api");

vi.mock("@/context/AuthContext", () => ({
  useAuth: vi.fn().mockReturnValue({ logout: vi.fn() }),
}));

vi.mock("@/components/SideBar", () => ({
  Sidebar: () => <div data-testid="mock-sidebar">Sidebar</div>,
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

describe("LeadForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderForm = (route = "/leads/new", path = "/leads/new") =>
    render(
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path} element={<LeadForm />} />
        </Routes>
      </MemoryRouter>,
    );

  it("validates required fields on creation submit", async () => {
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: /Create Lead/i }));

    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument();
      expect(
        screen.getByText("Valid phone number required"),
      ).toBeInTheDocument();
      expect(screen.getByText("Invalid email address")).toBeInTheDocument();
    });
  });

  it("submits valid data to create a lead", async () => {
    const user = userEvent.setup();
    (api.post as Mock).mockResolvedValueOnce({ data: {} });

    renderForm();

    const nameInput = screen.getByPlaceholderText("e.g. Jane Doe");
    const phoneInput = screen.getByPlaceholderText("+1 (555) 000-0000");
    const emailInput = screen.getByPlaceholderText("jane@example.com");
    const sourceInput = screen.getByPlaceholderText(
      "Website, Social, Referral...",
    );

    await user.type(nameInput, "John Doe");
    await user.type(phoneInput, "1234567890");
    await user.type(emailInput, "john@example.com");
    await user.type(sourceInput, "Website");

    await user.click(screen.getByRole("button", { name: /Create Lead/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/api/leads",
        expect.objectContaining({
          name: "John Doe",
          phone: "1234567890",
          email: "john@example.com",
          source: "Website",
        }),
      );
      expect(mockNavigate).toHaveBeenCalledWith("/leads");
    });
  });

  it("fetches lead data when in edit mode", async () => {
    (api.get as Mock).mockResolvedValueOnce({
      data: {
        name: "Existing Lead",
        phone: "0987654321",
        email: "existing@example.com",
        source: "Referral",
        status: "contacted",
        priority: "high",
      },
    });

    renderForm("/leads/1/edit", "/leads/:id/edit");

    await waitFor(() => {
      expect(screen.getByDisplayValue("Existing Lead")).toBeInTheDocument();
      expect(screen.getByDisplayValue("0987654321")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Update Lead/i }),
      ).toBeInTheDocument();
    });
  });
});
