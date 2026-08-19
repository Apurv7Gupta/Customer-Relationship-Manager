import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { LeadForm } from "./LeadForm";
import { api } from "@/services/api";

vi.mock("@/services/api");

describe("LeadForm", () => {
  const renderForm = () =>
    render(
      <BrowserRouter>
        <LeadForm />
      </BrowserRouter>,
    );

  it("validates required fields on submit", async () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: /save lead/i }));

    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument();
      expect(
        screen.getByText("Valid phone number required"),
      ).toBeInTheDocument();
    });
  });

  it("displays specific error message on duplicate phone number rejection", async () => {
    vi.mocked(api.post).mockRejectedValueOnce({
      response: {
        data: { detail: "A lead with this phone number already exists." },
      },
    });

    renderForm();

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: "Test User" },
    });
    fireEvent.change(screen.getByLabelText(/phone/i), {
      target: { value: "1234567890" },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/source/i), {
      target: { value: "Web" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save lead/i }));

    await waitFor(() => {
      expect(
        screen.getByText("A lead with this phone number already exists."),
      ).toBeInTheDocument();
    });
  });
});
