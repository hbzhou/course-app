import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import Profile from "../Profile";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthContext } from "@/context/auth-context";
import { useLogout } from "@/hooks/useAuth";

vi.mock("@/context/auth-context", () => ({
  useAuthContext: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useLogout: vi.fn(),
}));

describe("Profile", () => {
  let queryClient: QueryClient;
  const mutateAsyncMock = vi.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.clearAllMocks();
    vi.mocked(useLogout).mockReturnValue({
      mutateAsync: mutateAsyncMock,
      isPending: false,
    } as ReturnType<typeof useLogout>);
    vi.mocked(useAuthContext).mockReturnValue({
      user: null,
      token: null,
      authStatus: "anonymous",
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });
  });

  const renderProfile = () => {

    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Profile />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it("renders nothing when not logged in", () => {
    const { container } = renderProfile();
    expect(container.firstChild).toBeNull();
  });

  it("renders user info when logged in", () => {
    vi.mocked(useAuthContext).mockReturnValue({
      user: {
        name: "testuser",
        email: "test@example.com",
        authType: "oauth2",
      },
      token: null,
      authStatus: "authenticated",
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    renderProfile();

    expect(screen.getByText("testuser")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
  });

  it("calls logout mutation on button click", async () => {
    const user = userEvent.setup();
    mutateAsyncMock.mockResolvedValue(undefined);
    vi.mocked(useAuthContext).mockReturnValue({
      user: {
        name: "testuser",
        email: "test@example.com",
        authType: "oauth2",
      },
      token: null,
      authStatus: "authenticated",
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });
    
    renderProfile();
    
    const logoutButton = screen.getByRole("button", { name: /logout/i });
    await user.click(logoutButton);
    
    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
    });
  });

  it("navigates to login after logout", async () => {
    const user = userEvent.setup();
    mutateAsyncMock.mockResolvedValue(undefined);
    vi.mocked(useAuthContext).mockReturnValue({
      user: {
        name: "testuser",
        email: "test@example.com",
        authType: "oauth2",
      },
      token: null,
      authStatus: "authenticated",
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });
    
    renderProfile();
    
    const logoutButton = screen.getByRole("button", { name: /logout/i });
    await user.click(logoutButton);
    
    await waitFor(() => {
      expect(window.location.pathname).toBe("/login");
    });
  });
});
