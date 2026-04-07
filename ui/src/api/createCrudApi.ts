import { apiClient } from "./client";

/**
 * Generic CRUD API wrapper contract.
 * Entity types must have a numeric `id` field.
 */
export interface CrudApi<T extends { id: number }, TCreate = Omit<T, "id">> {
  getAll: (signal?: AbortSignal) => Promise<T[]>;
  create: (data: TCreate) => Promise<T>;
  update: (entity: T) => Promise<T>;
  delete: (id: number) => Promise<void>;
}

/**
 * Factory to create a standard CRUD API module for REST endpoints.
 *
 * @param endpoint - Base API path (e.g., "/api/courses")
 * @returns Object with getAll, create, update, delete functions
 */
export function createCrudApi<T extends { id: number }, TCreate = Omit<T, "id">>(
  endpoint: string
): CrudApi<T, TCreate> {
  return {
    getAll: (signal?: AbortSignal) =>
      apiClient<T[]>(endpoint, { method: "GET", signal }),

    create: (data: TCreate) =>
      apiClient<T>(endpoint, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    update: (entity: T) =>
      apiClient<T>(`${endpoint}/${entity.id}`, {
        method: "PUT",
        body: JSON.stringify(entity),
      }),

    delete: (id: number) =>
      apiClient<void>(`${endpoint}/${id}`, { method: "DELETE" }),
  };
}
