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

  logout: async (token: string): Promise<void> => {
    return apiClient<void>("/api/auth/logout", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};
