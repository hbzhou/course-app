import { createContext, useContext } from "react";
import type { User, OAuth2User } from "@/types/user";

export interface AuthContextType {
  currentUser: User | null;
  oauth2User: OAuth2User | null;
  token: string | null;
  isOAuth2: boolean;
  login: (user: User) => void;
  loginOAuth2: (user: OAuth2User) => void;
  logout: () => void;
  setToken: (token: string) => void;
  refreshOAuth2Token: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
