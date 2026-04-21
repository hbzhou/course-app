import { useState, useEffect, useCallback, useRef, ReactNode } from "react";
import type { User } from "@/types/user";
import type { AuthenticatedUser, AuthStatus } from "./auth-context";
import { AuthContext } from "./auth-context";
import { authApi } from "@/api/authApi";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [token, setTokenState] = useState<string | null>(() => {
    return localStorage.getItem("token");
  });
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const userRef = useRef<AuthenticatedUser | null>(null);
  const refreshRequestIdRef = useRef(0);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Sync token changes to localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }, [token]);

  const login = (user: User) => {
    const legacyUser: AuthenticatedUser = {
      name: user.username,
      email: user.email,
      authType: "legacy",
    };

    setUser(legacyUser);
    setAuthStatus("authenticated");
    if (user.token) {
      setTokenState(user.token);
    }
    localStorage.setItem("authType", "legacy");
    localStorage.setItem("legacyUser", JSON.stringify(legacyUser));
  };

  const logout = () => {
    setUser(null);
    setTokenState(null);
    setAuthStatus("anonymous");
    localStorage.removeItem("token");
    localStorage.removeItem("authType");
    localStorage.removeItem("legacyUser");
  };

  const refreshSession = useCallback(async () => {
    const requestId = ++refreshRequestIdRef.current;
    const authType = localStorage.getItem("authType");
    const hasLegacyToken = Boolean(token) && (
      authType === "legacy" || authType === null || userRef.current?.authType === "legacy"
    );

    if (hasLegacyToken) {
      let legacyUser: AuthenticatedUser = userRef.current?.authType === "legacy"
        ? userRef.current
        : {
            name: "",
            email: "",
            authType: "legacy",
          };

      const storedLegacyUser = localStorage.getItem("legacyUser");
      if (storedLegacyUser) {
        try {
          const parsed = JSON.parse(storedLegacyUser) as { name?: string; email?: string };
          legacyUser = {
            name: parsed.name ?? "",
            email: parsed.email ?? "",
            authType: "legacy",
          };
        } catch {
          // Ignore malformed localStorage payload and keep fallback legacy user.
        }
      }

      if (requestId !== refreshRequestIdRef.current) return;
      setUser(legacyUser);
      setAuthStatus("authenticated");
      return;
    }

    setAuthStatus("loading");

    try {
      const sessionUser = await authApi.getCurrentUser();
      if (requestId !== refreshRequestIdRef.current) return;

      setUser({
        name: sessionUser.name,
        email: sessionUser.email,
        provider: sessionUser.provider,
        authType: sessionUser.authType,
      });
      setAuthStatus("authenticated");

      if (token) {
        setTokenState(null);
      }
      localStorage.removeItem("legacyUser");
    } catch {
      if (requestId !== refreshRequestIdRef.current) return;
      setUser(null);
      setAuthStatus("anonymous");

      if (token && authType !== "legacy") {
        setTokenState(null);
        localStorage.removeItem("token");
        localStorage.removeItem("authType");
        localStorage.removeItem("legacyUser");
      }
    }
  }, [token]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  return (
    <AuthContext
      value={{
        user,
        token,
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
