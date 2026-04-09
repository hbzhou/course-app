import { createContext, useContext } from "react";
import type { User } from "@/types/user";

export interface AuthContextType {
  currentUser: User | null;
  token: string | null;
  login: (user: User) => void;
  logout: () => void;
  setToken: (token: string) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
