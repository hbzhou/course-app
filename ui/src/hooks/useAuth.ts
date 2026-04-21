import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/context/auth-context";
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
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      // Clear auth context (which clears localStorage)
      logout();
      // Clear all cached queries on logout
      queryClient.clear();
    },
  });
};

export const useProviders = () => {
  return useQuery({
    queryKey: ["oauth2-providers"],
    queryFn: () => authApi.getProviders(),
    staleTime: 5 * 60 * 1000,
  });
};
