import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryKey,
} from "@tanstack/react-query";
import { QUERY_STALE_TIME_MS } from "@/lib/queryConfig";
import { CrudApi } from "@/api/createCrudApi";

/**
 * Generic query hook for fetching a list of entities.
 */
export function useEntityQuery<T extends { id: number }>(
  queryKey: QueryKey,
  fetchFn: (signal?: AbortSignal) => Promise<T[]>
) {
  return useQuery({
    queryKey,
    queryFn: ({ signal }) => fetchFn(signal),
    staleTime: QUERY_STALE_TIME_MS,
  });
}

/**
 * Generic create mutation with cache append on success.
 */
export function useCreateMutation<T extends { id: number }, TCreate = Omit<T, "id">>(
  queryKey: QueryKey,
  createFn: (data: TCreate) => Promise<T>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFn,
    onSuccess: (newItem) => {
      queryClient.setQueryData<T[]>(queryKey, (old) =>
        old ? [...old, newItem] : [newItem]
      );
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

/**
 * Generic update mutation with optimistic update and rollback.
 */
export function useUpdateMutation<T extends { id: number }>(
  queryKey: QueryKey,
  updateFn: (entity: T) => Promise<T>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateFn,
    onMutate: async (updatedItem: T) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<T[]>(queryKey);

      if (previous) {
        queryClient.setQueryData<T[]>(
          queryKey,
          previous.map((item) => (item.id === updatedItem.id ? updatedItem : item))
        );
      }

      return { previous };
    },
    onError: (_err, _item, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

/**
 * Generic delete mutation with optimistic removal and rollback.
 */
export function useDeleteMutation<T extends { id: number }>(
  queryKey: QueryKey,
  deleteFn: (id: number) => Promise<void>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteFn,
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<T[]>(queryKey);

      if (previous) {
        queryClient.setQueryData<T[]>(
          queryKey,
          previous.filter((item) => item.id !== id)
        );
      }

      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

/**
 * Factory that creates all CRUD hooks for an entity type at once.
 * Returns query and mutation hooks using the provided API module.
 */
export function createCrudHooks<T extends { id: number }, TCreate = Omit<T, "id">>(
  queryKey: QueryKey,
  api: CrudApi<T, TCreate>
) {
  return {
    useQuery: () => useEntityQuery<T>(queryKey, api.getAll),
    useCreate: () => useCreateMutation<T, TCreate>(queryKey, api.create),
    useUpdate: () => useUpdateMutation<T>(queryKey, api.update),
    useDelete: () => useDeleteMutation<T>(queryKey, api.delete),
  };
}
