import { render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { LeadList } from "./LeadList";
import { api } from "@/services/api";

vi.mock("@/services/api");

describe("LeadList", () => {
  const mockLeads = {
    data: {
      data: [
        {
          _id: "1",
          name: "John Doe",
          status: "new",
          priority: "high",
          source: "Web",
        },
      ],
      meta: { page: 1, page_size: 10, total: 1, total_pages: 1 },
    },
  };

  it("renders loading state initially and then displays leads", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockLeads);
    render(
      <BrowserRouter>
        <LeadList />
      </BrowserRouter>,
    );

    expect(screen.getByText(/Loading leads.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("new")).toBeInTheDocument();
    });
  });

  it("displays error message on API failure", async () => {
    vi.mocked(api.get).mockRejectedValueOnce({
      response: { data: { detail: "Server Error" } },
    });
    render(
      <BrowserRouter>
        <LeadList />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Server Error")).toBeInTheDocument();
    });
  });
});
