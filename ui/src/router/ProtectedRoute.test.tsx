import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import { AuthProvider } from "@/context/AuthContext";

describe("ProtectedRoute", () => {
  it("redirects to /login when unauthenticated", () => {
    // Mock localStorage to return no token
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });

    render(
      <AuthProvider>
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
      </AuthProvider>
    );

    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });

  it("renders children when authenticated", () => {
    // Mock localStorage to return a token
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => "test-token"),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });

    render(
      <AuthProvider>
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
      </AuthProvider>
    );

    expect(screen.getByText("Courses Page")).toBeInTheDocument();
  });
});
