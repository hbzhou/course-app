import { createContext, useContext } from "react";
import type { User } from "@/types/user";

export interface AuthenticatedUser {
  name: string;
  email: string;
  provider?: string;
  authType: "legacy" | "bearer" | "session";
}

export type AuthStatus = "loading" | "authenticated" | "anonymous";

export interface AuthContextType {
  user: AuthenticatedUser | null;
  authStatus: AuthStatus;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  refreshSession: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
