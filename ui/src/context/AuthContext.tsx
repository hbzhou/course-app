import { useState, useEffect, ReactNode } from "react";
import type { User } from "@/types/user";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(() => {
    return localStorage.getItem("token");
  });

  // Sync token changes to localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }, [token]);

  const login = (user: User) => {
    setCurrentUser(user);
    if (user.token) {
      setTokenState(user.token);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setTokenState(null);
    localStorage.removeItem("token");
  };

  const setToken = (newToken: string) => {
    setTokenState(newToken);
  };

  return (
    <AuthContext value={{ currentUser, token, login, logout, setToken }}>
      {children}
    </AuthContext>
  );
}
