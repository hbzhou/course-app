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
    getProviders: vi.fn(),
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
    vi.mocked(authApi.getProviders).mockResolvedValue([
      { providerId: "azure", displayName: "Azure AD" },
      { providerId: "keycloak", displayName: "Keycloak" },
      { providerId: "google", displayName: "Google" },
      { providerId: "github", displayName: "GitHub" },
    ]);
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
      user: { name: "testuser", email: "test@example.com" },
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

  it("renders provider buttons for all returned providers", async () => {
    renderLogin();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /microsoft/i })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /keycloak/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /google/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /github/i })).toBeInTheDocument();
  });

  it("renders brand logo inside Google provider button", async () => {
    renderLogin();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /google/i })).toBeInTheDocument();
    });
    const googleBtn = screen.getByRole("button", { name: /google/i });
    expect(googleBtn.querySelector("svg")).toBeInTheDocument();
  });

  it("renders brand logo inside Microsoft provider button", async () => {
    renderLogin();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /microsoft/i })).toBeInTheDocument();
    });
    const msBtn = screen.getByRole("button", { name: /microsoft/i });
    expect(msBtn.querySelector("svg")).toBeInTheDocument();
  });

  it("renders brand logo inside Keycloak provider button", async () => {
    renderLogin();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /keycloak/i })).toBeInTheDocument();
    });
    const keycloakBtn = screen.getByRole("button", { name: /keycloak/i });
    expect(keycloakBtn.querySelector("svg")).toBeInTheDocument();
  });

  it("renders brand logo inside GitHub provider button", async () => {
    renderLogin();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /github/i })).toBeInTheDocument();
    });
    const githubBtn = screen.getByRole("button", { name: /github/i });
    expect(githubBtn.querySelector("svg")).toBeInTheDocument();
  });

  it("redirects to Azure AD authorization endpoint when Azure button clicked", async () => {
    const user = userEvent.setup();
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, href: "http://localhost:3000/login" },
    });

    renderLogin();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /microsoft/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /microsoft/i }));

    expect(window.location.href).toContain("/oauth2/authorization/azure");

    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("redirects to Keycloak authorization endpoint when Keycloak button clicked", async () => {
    const user = userEvent.setup();
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, href: "http://localhost:3000/login" },
    });

    renderLogin();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /keycloak/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /keycloak/i }));

    expect(window.location.href).toContain("/oauth2/authorization/keycloak");

    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("redirects to GitHub authorization endpoint when GitHub button clicked", async () => {
    const user = userEvent.setup();
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, href: "http://localhost:3000/login" },
    });

    renderLogin();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /github/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /github/i }));

    expect(window.location.href).toContain("/oauth2/authorization/github");

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

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /microsoft/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /microsoft/i }));

    expect(sessionStorage.setItem).toHaveBeenCalledWith("oauth2_return_to", "/courses");

    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("hides OAuth2 section when providers fetch fails", async () => {
    vi.mocked(authApi.getProviders).mockRejectedValue(new Error("Network error"));

    renderLogin();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^login$/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /continue with/i })).not.toBeInTheDocument();
  });

  it("shows loading state while providers are being fetched", () => {
    vi.mocked(authApi.getProviders).mockImplementation(
      () => new Promise(() => {})
    );

    renderLogin();

    expect(screen.getByText(/loading providers/i)).toBeInTheDocument();
  });
});
