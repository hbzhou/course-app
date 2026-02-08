import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authorApi } from "@/api/authorApi";
import { Author } from "@/types/author";

export const AUTHORS_QUERY_KEY = ["authors"];

export const useAuthors = () => {
  return useQuery({
    queryKey: AUTHORS_QUERY_KEY,
    queryFn: authorApi.getAuthors,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateAuthor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => authorApi.createAuthor(name),
    onSuccess: (newAuthor) => {
      // Update cache with the new author from server response
      queryClient.setQueryData<Author[]>(AUTHORS_QUERY_KEY, (old) => {
        if (!old) return [newAuthor];
        return [...old, newAuthor];
      });
    },
    onError: () => {
      // Refetch on error to ensure consistency
      queryClient.invalidateQueries({ queryKey: AUTHORS_QUERY_KEY });
    },
  });
};

export const useUpdateAuthor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (author: Author) => authorApi.updateAuthor(author),
    onMutate: async (updatedAuthor: Author) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: AUTHORS_QUERY_KEY });

      // Snapshot previous value
      const previousAuthors = queryClient.getQueryData<Author[]>(AUTHORS_QUERY_KEY);

      // Optimistically update
      if (previousAuthors) {
        queryClient.setQueryData<Author[]>(
          AUTHORS_QUERY_KEY,
          previousAuthors.map((author) =>
            author.id === updatedAuthor.id ? updatedAuthor : author
          )
        );
      }

      return { previousAuthors };
    },
    onError: (err, updatedAuthor, context) => {
      // Rollback on error
      if (context?.previousAuthors) {
        queryClient.setQueryData(AUTHORS_QUERY_KEY, context.previousAuthors);
      }
    },
    onSettled: () => {
      // Always refetch to sync with server
      queryClient.invalidateQueries({ queryKey: AUTHORS_QUERY_KEY });
    },
  });
};

export const useDeleteAuthor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (authorId: string) => authorApi.deleteAuthor(authorId),
    // Optimistically update the cache before server responds
    onMutate: async (authorId: string) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: AUTHORS_QUERY_KEY });

      // Snapshot the previous value
      const previousAuthors = queryClient.getQueryData<Author[]>(AUTHORS_QUERY_KEY);

      // Optimistically update to the new value
      if (previousAuthors) {
        queryClient.setQueryData<Author[]>(
          AUTHORS_QUERY_KEY,
          previousAuthors.filter((author) => author.id !== authorId)
        );
      }

      // Return context with previous value
      return { previousAuthors };
    },
    // If mutation fails, use the context returned from onMutate to roll back
    onError: (err, authorId, context) => {
      if (context?.previousAuthors) {
        queryClient.setQueryData(AUTHORS_QUERY_KEY, context.previousAuthors);
      }
    },
    // Always refetch after error or success to ensure sync with server
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: AUTHORS_QUERY_KEY });
    },
  });
};
