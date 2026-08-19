import { render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { LeadDetail } from "./LeadDetail";
import { api } from "@/services/api";

vi.mock("@/services/api");

describe("LeadDetail", () => {
  it("renders lead data, activities, and followups", async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url.includes("/api/leads/")) {
        return {
          data: {
            _id: "1",
            name: "Jane Smith",
            email: "jane@example.com",
            status: "contacted",
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
                description: "Left a voicemail",
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
                description: "Call back tomorrow",
                status: "pending",
                due_at: "2026-08-11T10:00:00Z",
              },
            ],
          },
        };
      }
      return { data: {} };
    });

    render(
      <BrowserRouter>
        <Routes>
          <Route path="/leads/:id" element={<LeadDetail />} />
        </Routes>
      </BrowserRouter>,
      { route: "/leads/1" } as any,
    );

    await waitFor(() => {
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      expect(screen.getByText("jane@example.com")).toBeInTheDocument();
      expect(screen.getByText("Left a voicemail")).toBeInTheDocument();
      expect(screen.getByText("Call back tomorrow")).toBeInTheDocument();
    });
  });
});
