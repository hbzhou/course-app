import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { AuthProvider } from "../AuthContext";
import { useAuthContext } from "../auth-context";
import type { ReactNode } from "react";

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe("AuthContext", () => {
  beforeEach(() => {
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    vi.stubGlobal("localStorage", localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("initializes with token from localStorage", () => {
    vi.mocked(localStorage.getItem).mockImplementation((key) => {
      if (key === "token") return "existing-token";
      return null;
    });
    
    const { result } = renderHook(() => useAuthContext(), { wrapper });
    
    expect(result.current.token).toBe("existing-token");
  });

  it("initializes with null when no token in localStorage", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    
    const { result } = renderHook(() => useAuthContext(), { wrapper });
    
    expect(result.current.token).toBeNull();
    expect(result.current.currentUser).toBeNull();
  });

  it("sets token and syncs to localStorage on login", async () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    const { result } = renderHook(() => useAuthContext(), { wrapper });
    
    act(() => {
      result.current.login({
        username: "testuser",
        email: "test@example.com",
        token: "new-token",
      });
    });

    await waitFor(() => {
      expect(result.current.token).toBe("new-token");
      expect(result.current.currentUser).toEqual({
        username: "testuser",
        email: "test@example.com",
        token: "new-token",
      });
      expect(localStorage.setItem).toHaveBeenCalledWith("token", "new-token");
    });
  });

  it("clears token and localStorage on logout", async () => {
    vi.mocked(localStorage.getItem).mockImplementation((key) => {
      if (key === "token") return "existing-token";
      return null;
    });
    const { result } = renderHook(() => useAuthContext(), { wrapper });

    act(() => {
      result.current.logout();
    });

    await waitFor(() => {
      expect(result.current.token).toBeNull();
      expect(result.current.currentUser).toBeNull();
      expect(localStorage.removeItem).toHaveBeenCalledWith("token");
    });
  });

  it("updates token via setToken", async () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    const { result } = renderHook(() => useAuthContext(), { wrapper });

    act(() => {
      result.current.setToken("updated-token");
    });

    await waitFor(() => {
      expect(result.current.token).toBe("updated-token");
      expect(localStorage.setItem).toHaveBeenCalledWith("token", "updated-token");
    });
  });

  it("throws error when used outside provider", () => {
    expect(() => {
      renderHook(() => useAuthContext());
    }).toThrow("useAuthContext must be used within an AuthProvider");
  });

  it("loginOAuth2 stores oauth2User, token, and authType", async () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    const { result } = renderHook(() => useAuthContext(), { wrapper });

    act(() => {
      result.current.loginOAuth2({
        name: "testuser",
        email: "test@example.com",
        accessToken: "access-tok",
        refreshToken: "refresh-tok",
        idToken: "id-tok",
        expiresIn: 300,
        tokenType: "Bearer",
      });
    });

    await waitFor(() => {
      expect(result.current.token).toBe("access-tok");
      expect(result.current.oauth2User?.name).toBe("testuser");
      expect(result.current.isOAuth2).toBe(true);
      expect(result.current.currentUser).toBeNull();
      expect(localStorage.setItem).toHaveBeenCalledWith("authType", "oauth2");
    });
  });

  it("logout clears OAuth2 state", async () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    const { result } = renderHook(() => useAuthContext(), { wrapper });

    act(() => {
      result.current.loginOAuth2({
        name: "testuser",
        email: "test@example.com",
        accessToken: "access-tok",
        refreshToken: "refresh-tok",
        idToken: "id-tok",
        expiresIn: 300,
        tokenType: "Bearer",
      });
    });

    act(() => {
      result.current.logout();
    });

    await waitFor(() => {
      expect(result.current.token).toBeNull();
      expect(result.current.oauth2User).toBeNull();
      expect(result.current.isOAuth2).toBe(false);
      expect(localStorage.removeItem).toHaveBeenCalledWith("oauth2User");
    });
  });
});
