import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { AuthProvider } from "../AuthContext";
import { useAuthContext } from "../auth-context";
import { authApi } from "@/api/authApi";
import type { ReactNode } from "react";

vi.mock("@/api/authApi", () => ({
  authApi: {
    getCurrentUser: vi.fn(),
  },
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bootstraps authenticated user from session endpoint", async () => {
    vi.mocked(authApi.getCurrentUser).mockResolvedValue({
      name: "testuser",
      email: "test@example.com",
      provider: "azure",
      authType: "session",
    });

    const { result } = renderHook(() => useAuthContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.name).toBe("testuser");
      expect(result.current.authStatus).toBe("authenticated");
    });
  });

  it("is anonymous when session bootstrap fails", async () => {
    vi.mocked(authApi.getCurrentUser).mockRejectedValue(new Error("Unauthorized"));

    const { result } = renderHook(() => useAuthContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.authStatus).toBe("anonymous");
    });
  });

  it("sets authenticated user on login", async () => {
    vi.mocked(authApi.getCurrentUser).mockRejectedValue(new Error("Unauthorized"));
    const { result } = renderHook(() => useAuthContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.authStatus).toBe("anonymous");
    });

    act(() => {
      result.current.login({
        username: "session-user",
        email: "session@example.com",
      });
    });

    await waitFor(() => {
      expect(result.current.user).toEqual({
        name: "session-user",
        email: "session@example.com",
        authType: "session",
      });
      expect(result.current.authStatus).toBe("authenticated");
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  it("clears user on logout", async () => {
    vi.mocked(authApi.getCurrentUser).mockResolvedValue({
      name: "testuser",
      email: "test@example.com",
      provider: "azure",
      authType: "session",
    });

    const { result } = renderHook(() => useAuthContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    act(() => {
      result.current.logout();
    });

    await waitFor(() => {
      expect(result.current.user).toBeNull();
      expect(result.current.authStatus).toBe("anonymous");
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  it("refreshSession updates user and status", async () => {
    vi.mocked(authApi.getCurrentUser)
      .mockRejectedValueOnce(new Error("Unauthorized"))
      .mockResolvedValueOnce({
        name: "session-user",
        email: "session@example.com",
        provider: "azure",
        authType: "session",
      });

    const { result } = renderHook(() => useAuthContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.authStatus).toBe("anonymous");
    });

    await act(async () => {
      await result.current.refreshSession();
    });

    await waitFor(() => {
      expect(result.current.authStatus).toBe("authenticated");
      expect(result.current.user?.name).toBe("session-user");
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  it("throws error when used outside provider", () => {
    expect(() => {
      renderHook(() => useAuthContext());
    }).toThrow("useAuthContext must be used within an AuthProvider");
  });
});
