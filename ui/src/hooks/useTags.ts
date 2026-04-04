import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tagApi } from "@/api/tagApi";
import { Tag } from "@/types/tag";
import { QUERY_STALE_TIME_MS } from "@/lib/queryConfig";

export const TAGS_QUERY_KEY = ["tags"];

export const useTags = () => {
  return useQuery({
    queryKey: TAGS_QUERY_KEY,
    queryFn: tagApi.getTags,
    staleTime: QUERY_STALE_TIME_MS,
  });
};

export const useCreateTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tag: Omit<Tag, "id">) => tagApi.createTag(tag),
    onSuccess: (newTag) => {
      queryClient.setQueryData<Tag[]>(TAGS_QUERY_KEY, (old) => {
        if (!old) return [newTag];
        return [...old, newTag];
      });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: TAGS_QUERY_KEY });
    },
  });
};

export const useUpdateTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tag: Tag) => tagApi.updateTag(tag),
    onMutate: async (updatedTag: Tag) => {
      await queryClient.cancelQueries({ queryKey: TAGS_QUERY_KEY });
      const previousTags = queryClient.getQueryData<Tag[]>(TAGS_QUERY_KEY);

      if (previousTags) {
        queryClient.setQueryData<Tag[]>(
          TAGS_QUERY_KEY,
          previousTags.map((tag) => (tag.id === updatedTag.id ? updatedTag : tag))
        );
      }

      return { previousTags };
    },
    onError: (_err, _tag, context) => {
      if (context?.previousTags) {
        queryClient.setQueryData(TAGS_QUERY_KEY, context.previousTags);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TAGS_QUERY_KEY });
    },
  });
};

export const useDeleteTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tagId: number) => tagApi.deleteTag(tagId),
    onMutate: async (tagId: number) => {
      await queryClient.cancelQueries({ queryKey: TAGS_QUERY_KEY });
      const previousTags = queryClient.getQueryData<Tag[]>(TAGS_QUERY_KEY);

      if (previousTags) {
        queryClient.setQueryData<Tag[]>(
          TAGS_QUERY_KEY,
          previousTags.filter((tag) => tag.id !== tagId)
        );
      }

      return { previousTags };
    },
    onError: (_err, _tagId, context) => {
      if (context?.previousTags) {
        queryClient.setQueryData(TAGS_QUERY_KEY, context.previousTags);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TAGS_QUERY_KEY });
    },
  });
};
