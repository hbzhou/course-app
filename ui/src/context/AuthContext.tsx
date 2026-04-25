import { useState, useEffect, useCallback, useRef, ReactNode } from "react";
import type { User } from "@/types/user";
import type { AuthenticatedUser, AuthStatus } from "./auth-context";
import { AuthContext } from "./auth-context";
import { authApi } from "@/api/authApi";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const refreshRequestIdRef = useRef(0);

  const login = (userData: User) => {
    setUser({
      name: userData.username,
      email: userData.email,
      authType: "session",
      permissions: [],
    });
    setAuthStatus("authenticated");
  };

  const logout = () => {
    setUser(null);
    setAuthStatus("anonymous");
  };

  const refreshSession = useCallback(async () => {
    const requestId = ++refreshRequestIdRef.current;
    setAuthStatus("loading");

    try {
      const sessionUser = await authApi.getCurrentUser();
      if (requestId !== refreshRequestIdRef.current) return;
      setUser({
        name: sessionUser.name,
        email: sessionUser.email,
        provider: sessionUser.provider,
        authType: sessionUser.authType,
        permissions: sessionUser.permissions ?? [],
      });
      setAuthStatus("authenticated");
    } catch {
      if (requestId !== refreshRequestIdRef.current) return;
      setUser(null);
      setAuthStatus("anonymous");
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  return (
    <AuthContext
      value={{
        user,
        authStatus,
        isAuthenticated: authStatus === "authenticated",
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext>
  );
}
