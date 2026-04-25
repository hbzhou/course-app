import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePermission } from "../usePermission";
import { useAuthContext } from "@/context/auth-context";

vi.mock("@/context/auth-context", () => ({
  useAuthContext: vi.fn(),
}));

describe("usePermission", () => {
  it("returns true when user has the permission", () => {
    vi.mocked(useAuthContext).mockReturnValue({
      user: {
        name: "admin",
        email: "",
        authType: "session",
        permissions: ["COURSE_EDIT", "COURSE_VIEW"],
      },
      authStatus: "authenticated",
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    const { result } = renderHook(() => usePermission("COURSE_EDIT"));
    expect(result.current).toBe(true);
  });

  it("returns false when user lacks the permission", () => {
    vi.mocked(useAuthContext).mockReturnValue({
      user: {
        name: "user",
        email: "",
        authType: "session",
        permissions: ["COURSE_VIEW"],
      },
      authStatus: "authenticated",
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    const { result } = renderHook(() => usePermission("COURSE_EDIT"));
    expect(result.current).toBe(false);
  });

  it("returns false when user is not authenticated", () => {
    vi.mocked(useAuthContext).mockReturnValue({
      user: null,
      authStatus: "anonymous",
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    const { result } = renderHook(() => usePermission("COURSE_EDIT"));
    expect(result.current).toBe(false);
  });

  it("returns false during auth loading", () => {
    vi.mocked(useAuthContext).mockReturnValue({
      user: null,
      authStatus: "loading",
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    const { result } = renderHook(() => usePermission("COURSE_VIEW"));
    expect(result.current).toBe(false);
  });
});
