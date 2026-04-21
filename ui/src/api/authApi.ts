import { apiClient } from "./client";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    name: string;
    email: string;
  };
}

export interface CurrentUserResponse {
  name: string;
  email: string;
  provider: string;
  authType: "bearer" | "session";
}

export const authApi = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    return apiClient<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    return apiClient<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getCurrentUser: async (): Promise<CurrentUserResponse> => {
    return apiClient<CurrentUserResponse>("/api/auth/me");
  },

  logout: async (): Promise<void> => {
    return apiClient<void>("/api/auth/logout", {
      method: "DELETE",
    });
  },
};
