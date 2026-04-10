import { useState, useEffect, ReactNode } from "react";
import type { User, OAuth2User } from "@/types/user";
import { AuthContext } from "./auth-context";
import { apiClient } from "@/api/client";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [oauth2User, setOAuth2User] = useState<OAuth2User | null>(() => {
    const stored = localStorage.getItem("oauth2User");
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setTokenState] = useState<string | null>(() => {
    return localStorage.getItem("token");
  });
  const [isOAuth2, setIsOAuth2] = useState<boolean>(() => {
    return localStorage.getItem("authType") === "oauth2";
  });

  // Sync token changes to localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }, [token]);

  // Sync OAuth2 user to localStorage
  useEffect(() => {
    if (oauth2User) {
      localStorage.setItem("oauth2User", JSON.stringify(oauth2User));
      localStorage.setItem("authType", "oauth2");
    } else {
      localStorage.removeItem("oauth2User");
      if (!currentUser) {
        localStorage.removeItem("authType");
      }
    }
  }, [oauth2User, currentUser]);

  const login = (user: User) => {
    setCurrentUser(user);
    setOAuth2User(null);
    setIsOAuth2(false);
    if (user.token) {
      setTokenState(user.token);
    }
    localStorage.setItem("authType", "legacy");
  };

  const loginOAuth2 = (user: OAuth2User) => {
    setOAuth2User(user);
    setCurrentUser(null);
    setIsOAuth2(true);
    setTokenState(user.accessToken);
    localStorage.setItem("authType", "oauth2");
  };

  const logout = () => {
    setCurrentUser(null);
    setOAuth2User(null);
    setTokenState(null);
    setIsOAuth2(false);
    localStorage.removeItem("token");
    localStorage.removeItem("oauth2User");
    localStorage.removeItem("authType");
  };

  const setToken = (newToken: string) => {
    setTokenState(newToken);
  };

  const refreshOAuth2Token = async () => {
    if (!oauth2User?.refreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      const response = await apiClient<{
        accessToken: string;
        idToken?: string;
        refreshToken?: string;
        expiresIn?: number;
        tokenType: string;
        user: { name: string; email: string };
      }>("/api/auth/oauth2/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken: oauth2User.refreshToken }),
      });

      const updatedUser: OAuth2User = {
        name: response.user.name,
        email: response.user.email,
        accessToken: response.accessToken,
        idToken: response.idToken,
        refreshToken: response.refreshToken || oauth2User.refreshToken,
        expiresIn: response.expiresIn,
        tokenType: response.tokenType,
      };

      loginOAuth2(updatedUser);
    } catch (error) {
      console.error("Failed to refresh token", error);
      logout();
      throw error;
    }
  };

  return (
    <AuthContext
      value={{
        currentUser,
        oauth2User,
        token,
        isOAuth2,
        login,
        loginOAuth2,
        logout,
        setToken,
        refreshOAuth2Token,
      }}
    >
      {children}
    </AuthContext>
  );
}
