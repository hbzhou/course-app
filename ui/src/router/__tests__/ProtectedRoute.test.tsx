import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ProtectedRoute from "../ProtectedRoute";
import { useAuthContext } from "@/context/auth-context";

vi.mock("@/context/auth-context", () => ({
  useAuthContext: vi.fn(),
}));

describe("ProtectedRoute", () => {
  it("redirects to /login when unauthenticated", () => {
    vi.mocked(useAuthContext).mockReturnValue({
      user: null,
      authStatus: "anonymous",
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/courses"]}>
        <Routes>
          <Route
            path="/courses"
            element={
              <ProtectedRoute>
                <div>Courses Page</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });

  it("renders children when authenticated", () => {
    vi.mocked(useAuthContext).mockReturnValue({
      user: {
        name: "testuser",
        email: "test@example.com",
        authType: "session",
      },
      authStatus: "authenticated",
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/courses"]}>
        <Routes>
          <Route
            path="/courses"
            element={
              <ProtectedRoute>
                <div>Courses Page</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Courses Page")).toBeInTheDocument();
  });

  it("shows loading UI while auth bootstrap is in progress", () => {
    vi.mocked(useAuthContext).mockReturnValue({
      user: null,
      authStatus: "loading",
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/courses"]}>
        <Routes>
          <Route
            path="/courses"
            element={
              <ProtectedRoute>
                <div>Courses Page</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/checking authentication/i)).toBeInTheDocument();
  });
});
