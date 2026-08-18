import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { LoginPage } from "./LoginPage";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";

vi.mock("@/services/api", () => ({
  api: {
    post: vi.fn(),
  },
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const mockNavigate = vi.fn();
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
    vi.mocked(useAuth).mockReturnValue({ setAuthData: mockSetAuthData } as any);
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

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it("displays global error message on invalid credentials", async () => {
    const user = userEvent.setup();
    (api.post as any).mockRejectedValueOnce({
      response: { data: { detail: "Incorrect email or password" } },
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

  it("authenticates and redirects on successful login", async () => {
    const user = userEvent.setup();
    const mockResponse = {
      data: {
        user: { _id: "123", email: "test@example.com", role: "owner" },
        // Mapped mock token key to match the OAuth2 access_token response
        access_token: "mock-jwt-token",
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
      // Assert that the request contains the form-urlencoded headers
      expect(api.post).toHaveBeenCalledWith(
        "/api/auth/login",
        expect.any(URLSearchParams),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );
    });

    // Verify the OAuth2 specific payload fields mapping email to username
    const formDataArg = vi.mocked(api.post).mock.calls[0][1] as URLSearchParams;
    expect(formDataArg.get("username")).toBe("test@example.com");
    expect(formDataArg.get("password")).toBe("correctpassword");

    expect(mockSetAuthData).toHaveBeenCalledWith({
      user: mockResponse.data.user,
      token: mockResponse.data.access_token,
    });
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });
  });
});
