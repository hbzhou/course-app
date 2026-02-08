import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import authReducer, { AuthSliceState } from "@/store/auth/auth.slice";

const makeStore = (preloadedUser: AuthSliceState) =>
  configureStore({
    reducer: {
      currentUser: authReducer,
    },
    preloadedState: {
      currentUser: preloadedUser,
    },
  });

describe("ProtectedRoute", () => {
  beforeEach(() => {
    // Some Vitest/jsdom setups don't provide a full localStorage implementation.
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it("redirects to /login when unauthenticated", () => {
    const store = makeStore({});

    render(
      <Provider store={store}>
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
      </Provider>
    );

    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });

  it("renders children when authenticated", () => {
    const store = makeStore({ token: "abc" });

    render(
      <Provider store={store}>
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
      </Provider>
    );

    expect(screen.getByText("Courses Page")).toBeInTheDocument();
  });
});
