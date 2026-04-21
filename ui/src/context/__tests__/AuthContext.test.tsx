import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    vi.stubGlobal("localStorage", localStorageMock);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("bootstraps authenticated user from session endpoint", async () => {
    vi.mocked(localStorage.getItem).mockImplementation((key: string) => {
      if (key === "token") return null;
      if (key === "authType") return null;
      if (key === "legacyUser") return null;
      return null;
    });
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

  it("is anonymous when session bootstrap fails and no legacy token exists", async () => {
    vi.mocked(localStorage.getItem).mockImplementation((key: string) => {
      if (key === "token") return null;
      if (key === "authType") return null;
      if (key === "legacyUser") return null;
      return null;
    });
    vi.mocked(authApi.getCurrentUser).mockRejectedValue(new Error("Unauthorized"));

    const { result } = renderHook(() => useAuthContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.authStatus).toBe("anonymous");
    });
  });

  it("sets authenticated legacy user on login", async () => {
    vi.mocked(localStorage.getItem).mockImplementation((key: string) => {
      if (key === "token") return null;
      if (key === "authType") return null;
      if (key === "legacyUser") return null;
      return null;
    });
    vi.mocked(authApi.getCurrentUser).mockRejectedValue(new Error("Unauthorized"));
    const { result } = renderHook(() => useAuthContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.authStatus).toBe("anonymous");
    });

    act(() => {
      result.current.login({
        username: "legacy-user",
        email: "legacy@example.com",
        token: "legacy-token",
      });
    });

    await waitFor(() => {
      expect(result.current.token).toBe("legacy-token");
      expect(result.current.user).toEqual({
        name: "legacy-user",
        email: "legacy@example.com",
        authType: "legacy",
      });
      expect(result.current.authStatus).toBe("authenticated");
      expect(result.current.isAuthenticated).toBe(true);
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "legacyUser",
        JSON.stringify({
          name: "legacy-user",
          email: "legacy@example.com",
          authType: "legacy",
        })
      );
    });
  });

  it("refreshSession updates user and status", async () => {
    vi.mocked(localStorage.getItem).mockImplementation((key: string) => {
      if (key === "token") return null;
      if (key === "authType") return null;
      if (key === "legacyUser") return null;
      return null;
    });
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

  it("keeps legacy auth without calling session endpoint when token exists", async () => {
    vi.mocked(localStorage.getItem).mockImplementation((key: string) => {
      if (key === "token") return "legacy-token";
      if (key === "authType") return "legacy";
      if (key === "legacyUser") {
        return JSON.stringify({ name: "legacy-user", email: "legacy@example.com" });
      }
      return null;
    });

    const { result } = renderHook(() => useAuthContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual({
        name: "legacy-user",
        email: "legacy@example.com",
        authType: "legacy",
      });
    });

    expect(authApi.getCurrentUser).not.toHaveBeenCalled();
  });

  it("treats token-only stored state as legacy bootstrap", async () => {
    vi.mocked(localStorage.getItem).mockImplementation((key: string) => {
      if (key === "token") return "legacy-token";
      if (key === "authType") return null;
      if (key === "legacyUser") {
        return JSON.stringify({ name: "legacy-user", email: "legacy@example.com" });
      }
      return null;
    });

    const { result } = renderHook(() => useAuthContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual({
        name: "legacy-user",
        email: "legacy@example.com",
        authType: "legacy",
      });
    });

    expect(authApi.getCurrentUser).not.toHaveBeenCalled();
  });

  it("clears stale token when cookie session bootstrap succeeds", async () => {
    vi.mocked(localStorage.getItem).mockImplementation((key: string) => {
      if (key === "token") return "stale-token";
      if (key === "authType") return "session";
      if (key === "legacyUser") return null;
      return null;
    });
    vi.mocked(authApi.getCurrentUser).mockResolvedValue({
      name: "session-user",
      email: "session@example.com",
      provider: "azure",
      authType: "session",
    });

    const { result } = renderHook(() => useAuthContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.user?.name).toBe("session-user");
      expect(result.current.token).toBeNull();
    });

    expect(localStorage.removeItem).toHaveBeenCalledWith("token");
  });

  it("clears stale non-legacy token when session bootstrap fails", async () => {
    vi.mocked(localStorage.getItem).mockImplementation((key: string) => {
      if (key === "token") return "stale-token";
      if (key === "authType") return "session";
      if (key === "legacyUser") return null;
      return null;
    });
    vi.mocked(authApi.getCurrentUser).mockRejectedValue(new Error("Unauthorized"));

    const { result } = renderHook(() => useAuthContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.authStatus).toBe("anonymous");
      expect(result.current.token).toBeNull();
    });

    expect(localStorage.removeItem).toHaveBeenCalledWith("token");
    expect(localStorage.removeItem).toHaveBeenCalledWith("authType");
    expect(localStorage.removeItem).toHaveBeenCalledWith("legacyUser");
  });

  it("throws error when used outside provider", () => {
    expect(() => {
      renderHook(() => useAuthContext());
    }).toThrow("useAuthContext must be used within an AuthProvider");
  });
});
