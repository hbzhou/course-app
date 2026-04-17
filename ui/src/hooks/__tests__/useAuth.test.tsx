import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useLogin, useRegister, useLogout } from "../useAuth";
import { AuthProvider } from "@/context/AuthContext";
import * as authApiModule from "@/api/authApi";
import type { ReactNode } from "react";

vi.mock("@/api/authApi");

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </AuthProvider>
  );
};

describe("useAuth hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    vi.stubGlobal("localStorage", localStorageMock);
    vi.spyOn(authApiModule.authApi, "getCurrentUser").mockRejectedValue(new Error("Unauthorized"));
  });

  describe("useLogin", () => {
    it("logs in user successfully", async () => {
      const mockResponse = {
        user: { name: "testuser", email: "test@example.com" },
        token: "test-token",
      };
      vi.spyOn(authApiModule.authApi, "login").mockResolvedValue(mockResponse);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useLogin(), { wrapper });

      result.current.mutate({ username: "testuser", password: "password" });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(authApiModule.authApi.login).toHaveBeenCalledWith({
        username: "testuser",
        password: "password",
      });
    });

    it("handles login error", async () => {
      vi.spyOn(authApiModule.authApi, "login").mockRejectedValue(new Error("Login failed"));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useLogin(), { wrapper });

      result.current.mutate({ username: "testuser", password: "wrong" });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe("useRegister", () => {
    it("registers user successfully", async () => {
      const mockResponse = { message: "User registered" };
      vi.spyOn(authApiModule.authApi, "register").mockResolvedValue(mockResponse);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useRegister(), { wrapper });

      result.current.mutate({
        name: "newuser",
        email: "new@example.com",
        password: "password",
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(authApiModule.authApi.register).toHaveBeenCalledWith({
        name: "newuser",
        email: "new@example.com",
        password: "password",
      });
    });
  });

  describe("useLogout", () => {
    it("logs out user successfully", async () => {
      vi.spyOn(authApiModule.authApi, "logout").mockResolvedValue(undefined);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useLogout(), { wrapper });

      result.current.mutate();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(authApiModule.authApi.logout).toHaveBeenCalledWith();
    });
  });
});
