import { apiClient } from "./client";
import { ManagedUser, CreateUserRequest, UpdateUserRequest, Role } from "@/types/managed-user";

export const userApi = {
  getUsers: async (): Promise<ManagedUser[]> => {
    return apiClient<ManagedUser[]>("/api/users", {
      method: "GET",
    });
  },

  getUserById: async (userId: number): Promise<ManagedUser> => {
    return apiClient<ManagedUser>(`/api/users/${userId}`, {
      method: "GET",
    });
  },

  createUser: async (user: CreateUserRequest): Promise<ManagedUser> => {
    return apiClient<ManagedUser>("/api/users", {
      method: "POST",
      body: JSON.stringify(user),
    });
  },

  updateUser: async (user: UpdateUserRequest): Promise<ManagedUser> => {
    return apiClient<ManagedUser>(`/api/users/${user.id}`, {
      method: "PUT",
      body: JSON.stringify(user),
    });
  },

  deleteUser: async (userId: number): Promise<void> => {
    return apiClient<void>(`/api/users/${userId}`, {
      method: "DELETE",
    });
  },

  getRoles: async (): Promise<Role[]> => {
    return apiClient<Role[]>("/api/roles", {
      method: "GET",
    });
  },
};
