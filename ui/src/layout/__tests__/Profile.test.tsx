import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import Profile from "../Profile";
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

describe("Profile", () => {
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

  const renderProfile = (hasToken = false) => {
    if (hasToken) {
      vi.mocked(localStorage.getItem).mockReturnValue("test-token");
    } else {
      vi.mocked(localStorage.getItem).mockReturnValue(null);
    }

    return render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Profile />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    );
  };

  it("renders nothing when not logged in", () => {
    const { container } = renderProfile(false);
    expect(container.firstChild).toBeNull();
  });

  it("renders user info when logged in", () => {
    renderProfile(true);
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
  });

  it("calls logout mutation on button click", async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.logout).mockResolvedValue(undefined);
    
    renderProfile(true);
    
    const logoutButton = screen.getByRole("button", { name: /logout/i });
    await user.click(logoutButton);
    
    await waitFor(() => {
      expect(authApi.logout).toHaveBeenCalledWith("test-token");
    });
  });

  it("navigates to login after logout", async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.logout).mockResolvedValue(undefined);
    
    renderProfile(true);
    
    const logoutButton = screen.getByRole("button", { name: /logout/i });
    await user.click(logoutButton);
    
    await waitFor(() => {
      expect(window.location.pathname).toBe("/login");
    });
  });
});
