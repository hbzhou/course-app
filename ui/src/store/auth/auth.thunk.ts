import { AppDispatch } from "@/store/store";
import { actions } from "./auth.slice";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

interface AuthResponse {
  token: string;
  user: {
    name: string;
    email: string;
  };
}

const persistAuth = (dispatch: AppDispatch, authResponse: AuthResponse) => {
  localStorage.setItem("token", authResponse.token);
  const user = authResponse.user;
  dispatch(
    actions.login({
      username: user.name,
      email: user.email,
      token: authResponse.token,
    })
  );
};

export const login = (loginRequest: LoginRequest) => async (dispatch: AppDispatch) => {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(loginRequest),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Failed to login: ${response.status} ${response.statusText}`);
  }

  const loginResponse: AuthResponse = await response.json();
  persistAuth(dispatch, loginResponse);
};

export const register = (registerRequest: RegisterRequest) => async (_dispatch: AppDispatch) => {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(registerRequest),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Failed to register: ${response.status} ${response.statusText}`);
  }

  const registerResponse: AuthResponse = await response.json();
  return registerResponse;
};

export const logout =
  (token: string = "") =>
  async (dispatch: AppDispatch) => {
    const response = await fetch("/api/auth/logout", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `Failed to logout: ${response.status} ${response.statusText}`);
    }

    localStorage.removeItem("token");
    dispatch(actions.logout());
  };
