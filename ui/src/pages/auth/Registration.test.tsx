import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import Registration from "./Registration";
import { AuthProvider } from "@/context/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/api/authApi", () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

import { authApi } from "@/api/authApi";

describe("Registration", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.clearAllMocks();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    });
  });

  const renderRegistration = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Registration />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    );
  };

  it("renders registration form", () => {
    renderRegistration();
    
    expect(screen.getByRole("heading", { name: /create an account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /register/i })).toBeInTheDocument();
  });

  it("shows link to login", () => {
    renderRegistration();
    expect(screen.getByRole("link", { name: /login here/i })).toBeInTheDocument();
  });

  it("submits registration form with valid data", async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.register).mockResolvedValue({
      id: 1,
      email: "newuser@example.com",
      name: "New User",
    });
    
    renderRegistration();
    
    await user.type(screen.getByLabelText(/^name/i), "New User");
    await user.type(screen.getByLabelText(/email/i), "newuser@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /register/i }));
    
    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledWith({
        name: "New User",
        email: "newuser@example.com",
        password: "password123",
      });
    });
  });

  it("shows error message on registration failure", async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.register).mockRejectedValue(new Error("Email already exists"));
    
    renderRegistration();
    
    await user.type(screen.getByLabelText(/^name/i), "Test User");
    await user.type(screen.getByLabelText(/email/i), "existing@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /register/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
    });
  });

  it("navigates to login after successful registration", async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.register).mockResolvedValue({
      id: 1,
      email: "newuser@example.com",
      name: "New User",
    });
    
    renderRegistration();
    
    await user.type(screen.getByLabelText(/^name/i), "New User");
    await user.type(screen.getByLabelText(/email/i), "newuser@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /register/i }));
    
    await waitFor(() => {
      expect(window.location.pathname).toBe("/login");
    });
  });
});
