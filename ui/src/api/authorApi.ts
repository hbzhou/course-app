import { apiClient } from "./client";
import { Author } from "@/types/author";

export const authorApi = {
  getAuthors: async (): Promise<Author[]> => {
    return apiClient<Author[]>("/api/authors", {
      method: "GET",
    });
  },

  createAuthor: async (name: string): Promise<Author> => {
    return apiClient<Author>("/api/authors", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  updateAuthor: async (author: Author): Promise<Author> => {
    return apiClient<Author>(`/api/authors/${author.id}`, {
      method: "PUT",
      body: JSON.stringify({ name: author.name }),
    });
  },

  deleteAuthor: async (authorId: string): Promise<void> => {
    return apiClient<void>(`/api/authors/${authorId}`, {
      method: "DELETE",
    });
  },
};
