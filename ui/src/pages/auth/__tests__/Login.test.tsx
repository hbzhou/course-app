import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { BrowserRouter, MemoryRouter, Route, Routes } from "react-router-dom";
import Login from "../Login";
import { AuthProvider } from "@/context/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/api/authApi", () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}));

import { authApi } from "@/api/authApi";

describe("Login", () => {
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
    vi.stubGlobal("sessionStorage", {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    });
  });

  const renderLogin = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Login />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    );
  };

  it("renders login form", () => {
    renderLogin();
    
    expect(screen.getByRole("heading", { name: /login/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^login$/i })).toBeInTheDocument();
  });

  it("shows link to registration", () => {
    renderLogin();
    expect(screen.getByRole("link", { name: /register here/i })).toBeInTheDocument();
  });

  it("submits login form with valid credentials", async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.login).mockResolvedValue({
      id: 1,
      username: "testuser",
      name: "Test User",
      token: "test-token",
    });
    
    renderLogin();
    
    await user.type(screen.getByLabelText(/username/i), "testuser");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /^login$/i }));
    
    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        username: "testuser",
        password: "password123",
      });
    });
  });

  it("shows error message on login failure", async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.login).mockRejectedValue(new Error("Invalid credentials"));
    
    renderLogin();
    
    await user.type(screen.getByLabelText(/username/i), "wronguser");
    await user.type(screen.getByLabelText(/password/i), "wrongpass");
    await user.click(screen.getByRole("button", { name: /^login$/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it("disables submit button while loading", async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.login).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );
    
    renderLogin();
    
    await user.type(screen.getByLabelText(/username/i), "testuser");
    await user.type(screen.getByLabelText(/password/i), "password123");
    
    const submitButton = screen.getByRole("button", { name: /^login$/i });
    await user.click(submitButton);
    
    expect(submitButton).toBeDisabled();
  });

  it("renders the default Azure AD button label", () => {
    renderLogin();
    expect(screen.getByRole("button", { name: /continue with azure ad/i })).toBeInTheDocument();
  });

  it("redirects browser to the configured provider authorization endpoint", async () => {
    const user = userEvent.setup();
    const originalLocation = window.location;
    const locationMock = {
      ...window.location,
      href: "http://localhost:3000/login",
    };
    Object.defineProperty(window, "location", {
      configurable: true,
      value: locationMock,
    });

    renderLogin();
    await user.click(screen.getByRole("button", { name: /continue with azure ad/i }));

    expect(window.location.href).toContain("/oauth2/authorization/azure");

    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("stores oauth2 return path when login is opened from a protected route", async () => {
    const user = userEvent.setup();
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, href: "http://localhost:3000/login" },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter
            initialEntries={[
              {
                pathname: "/login",
                state: { from: { pathname: "/courses" } },
              },
            ]}
          >
            <Routes>
              <Route path="/login" element={<Login />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    await user.click(screen.getByRole("button", { name: /continue with azure ad/i }));

    expect(sessionStorage.setItem).toHaveBeenCalledWith("oauth2_return_to", "/courses");

    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });
});
