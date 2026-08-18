import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { LoginPage } from "./LoginPage";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";

// ADDED: Mock the external API service to prevent real network requests during tests
vi.mock("@/services/api", () => ({
  api: {
    post: vi.fn(),
  },
}));

// ADDED: Mock the global auth context to verify state changes
vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

const mockNavigate = vi.fn();
// ADDED: Mock React Router's navigation and location hooks
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null }),
  };
});

describe("LoginPage", () => {
  const mockSetAuthData = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ setAuthData: mockSetAuthData });
  });

  const renderComponent = () =>
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>,
    );

  it("renders login form correctly", () => {
    renderComponent();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  it("displays field-level validation errors for empty submissions", async () => {
    renderComponent();
    const submitButton = screen.getByRole("button", { name: /sign in/i });

    fireEvent.click(submitButton);

    // ADDED: waitFor handles asynchronous form validation (Zod)
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  // Required Test: Incorrect credentials[cite: 1]
  it("displays global error message on invalid credentials", async () => {
    const user = userEvent.setup();
    (api.post as any).mockRejectedValueOnce({
      response: { data: { message: "Incorrect email or password" } },
    });

    renderComponent();

    await user.type(
      screen.getByLabelText(/email address/i),
      "test@example.com",
    );
    await user.type(screen.getByLabelText(/password/i), "wrongpassword");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Incorrect email or password"),
      ).toBeInTheDocument();
    });
    expect(mockSetAuthData).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // Required Test: Correct credentials[cite: 1]
  it("authenticates and redirects on successful login", async () => {
    const user = userEvent.setup();
    const mockResponse = {
      data: {
        user: { _id: "123", email: "test@example.com", role: "owner" },
        token: "mock-jwt-token",
      },
    };
    (api.post as any).mockResolvedValueOnce(mockResponse);

    renderComponent();

    await user.type(
      screen.getByLabelText(/email address/i),
      "test@example.com",
    );
    await user.type(screen.getByLabelText(/password/i), "correctpassword");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/api/auth/login", {
        email: "test@example.com",
        password: "correctpassword",
      });
    });

    // ADDED: Verify global auth state is updated with backend payload
    expect(mockSetAuthData).toHaveBeenCalledWith({
      user: mockResponse.data.user,
      token: mockResponse.data.token,
    });
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });
  });
});
