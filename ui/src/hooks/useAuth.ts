import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/context/AuthContext";
import { authApi, LoginRequest, RegisterRequest, AuthResponse } from "@/api/authApi";

export const useLogin = () => {
  const { login } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginRequest) => authApi.login(credentials),
    onSuccess: (data: AuthResponse) => {
      // Update auth context (which syncs to localStorage)
      login({
        username: data.user.name,
        email: data.user.email,
        token: data.token,
      });
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
  const { logout } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => authApi.logout(token),
    onSuccess: () => {
      // Clear auth context (which clears localStorage)
      logout();
      // Clear all cached queries on logout
      queryClient.clear();
    },
  });
};
