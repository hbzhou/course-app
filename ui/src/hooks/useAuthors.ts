import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authorApi, authorCrudApi } from "@/api/authorApi";
import { Author } from "@/types/author";
import { createCrudHooks, useEntityQuery, useUpdateMutation, useDeleteMutation } from "./useCrudHooks";

export const AUTHORS_QUERY_KEY = ["authors"];

// Use generic hooks for standard operations
export const useAuthors = () => useEntityQuery<Author>(AUTHORS_QUERY_KEY, authorCrudApi.getAll);
export const useUpdateAuthor = () => useUpdateMutation<Author>(AUTHORS_QUERY_KEY, authorCrudApi.update);
export const useDeleteAuthor = () => useDeleteMutation<Author>(AUTHORS_QUERY_KEY, authorCrudApi.delete);

// Custom create hook since authorApi.createAuthor takes string instead of entity
export const useCreateAuthor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => authorApi.createAuthor(name),
    onSuccess: (newAuthor) => {
      queryClient.setQueryData<Author[]>(AUTHORS_QUERY_KEY, (old) =>
        old ? [...old, newAuthor] : [newAuthor]
      );
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: AUTHORS_QUERY_KEY });
    },
  });
};
