import { apiClient } from "./client";
import { Tag } from "@/types/tag";

export const tagApi = {
  getTags: async (): Promise<Tag[]> => {
    return apiClient<Tag[]>("/api/tags", { method: "GET" });
  },

  createTag: async (tag: Omit<Tag, "id">): Promise<Tag> => {
    return apiClient<Tag>("/api/tags", {
      method: "POST",
      body: JSON.stringify(tag),
    });
  },

  updateTag: async (tag: Tag): Promise<Tag> => {
    return apiClient<Tag>(`/api/tags/${tag.id}`, {
      method: "PUT",
      body: JSON.stringify(tag),
    });
  },

  deleteTag: async (tagId: number): Promise<void> => {
    return apiClient<void>(`/api/tags/${tagId}`, { method: "DELETE" });
  },
};
