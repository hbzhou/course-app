import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi } from "@/api/userApi";
import { ManagedUser, CreateUserRequest, UpdateUserRequest } from "@/types/managed-user";

export const USERS_QUERY_KEY = ["users"];
export const ROLES_QUERY_KEY = ["roles"];

export const useUsers = () => {
  return useQuery({
    queryKey: USERS_QUERY_KEY,
    queryFn: userApi.getUsers,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useRoles = () => {
  return useQuery({
    queryKey: ROLES_QUERY_KEY,
    queryFn: userApi.getRoles,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (user: CreateUserRequest) => userApi.createUser(user),
    onSuccess: (newUser) => {
      // Update cache with the new user from server response
      queryClient.setQueryData<ManagedUser[]>(USERS_QUERY_KEY, (old) => {
        if (!old) return [newUser];
        return [...old, newUser];
      });
    },
    onError: () => {
      // Refetch on error to ensure consistency
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (user: UpdateUserRequest) => userApi.updateUser(user),
    onMutate: async (updatedUser: UpdateUserRequest) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: USERS_QUERY_KEY });

      // Snapshot previous value
      const previousUsers = queryClient.getQueryData<ManagedUser[]>(USERS_QUERY_KEY);

      // Optimistically update
      if (previousUsers) {
        queryClient.setQueryData<ManagedUser[]>(
          USERS_QUERY_KEY,
          previousUsers.map((user) =>
            user.id === updatedUser.id ? { ...user, ...updatedUser } : user
          )
        );
      }

      return { previousUsers };
    },
    onError: (err, updatedUser, context) => {
      // Rollback on error
      if (context?.previousUsers) {
        queryClient.setQueryData(USERS_QUERY_KEY, context.previousUsers);
      }
    },
    onSettled: () => {
      // Always refetch to sync with server
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) => userApi.deleteUser(userId),
    // Optimistically update the cache before server responds
    onMutate: async (userId: number) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: USERS_QUERY_KEY });

      // Snapshot the previous value
      const previousUsers = queryClient.getQueryData<ManagedUser[]>(USERS_QUERY_KEY);

      // Optimistically update to the new value
      if (previousUsers) {
        queryClient.setQueryData<ManagedUser[]>(
          USERS_QUERY_KEY,
          previousUsers.filter((user) => user.id !== userId)
        );
      }

      // Return context with previous value
      return { previousUsers };
    },
    // If mutation fails, use the context returned from onMutate to roll back
    onError: (err, userId, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(USERS_QUERY_KEY, context.previousUsers);
      }
    },
    // Always refetch after error or success to ensure sync with server
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
  });
};
