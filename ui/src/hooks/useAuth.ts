import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { authApi, LoginRequest, RegisterRequest, AuthResponse } from "@/api/authApi";
import { actions } from "@/store/auth/auth.slice";

export const useLogin = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginRequest) => authApi.login(credentials),
    onSuccess: (data: AuthResponse) => {
      // Store token and update Redux state
      localStorage.setItem("token", data.token);
      dispatch(
        actions.login({
          username: data.user.name,
          email: data.user.email,
          token: data.token,
        })
      );
      // Invalidate all queries on login to refetch with new token
      queryClient.invalidateQueries();
    },
  });
};

export const useRegister = () => {
  return useMutation({
    mutationFn: (data: RegisterRequest) => authApi.register(data),
  });
};

export const useLogout = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => authApi.logout(token),
    onSuccess: () => {
      // Clear token and update Redux state
      localStorage.removeItem("token");
      dispatch(actions.logout());
      // Clear all cached queries on logout
      queryClient.clear();
    },
  });
};
