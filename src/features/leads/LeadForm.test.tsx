import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LeadForm } from "./LeadForm";
import { api } from "@/services/api";

vi.mock("@/services/api");

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

    fireEvent.click(screen.getByRole("button", { name: /Save Lead/i }));

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
    vi.mocked(api.post).mockResolvedValueOnce({ data: {} });

    // Extract the container from the render function
    const { container } = renderForm();

    // Query inputs directly by their form names instead of labels
    const nameInput = container.querySelector(
      'input[name="name"]',
    ) as HTMLInputElement;
    const phoneInput = container.querySelector(
      'input[name="phone"]',
    ) as HTMLInputElement;
    const emailInput = container.querySelector(
      'input[name="email"]',
    ) as HTMLInputElement;
    const sourceInput = container.querySelector(
      'input[name="source"]',
    ) as HTMLInputElement;

    await user.type(nameInput, "John Doe");
    await user.type(phoneInput, "1234567890");
    await user.type(emailInput, "john@example.com");
    await user.type(sourceInput, "Website");

    await user.click(screen.getByRole("button", { name: /Save Lead/i }));

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
    });
  });

  it("fetches lead data when in edit mode", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
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
    });
  });
});
