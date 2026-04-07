import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "@/types/user";

interface AuthContextType {
  currentUser: User | null;
  token: string | null;
  login: (user: User) => void;
  logout: () => void;
  setToken: (token: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
