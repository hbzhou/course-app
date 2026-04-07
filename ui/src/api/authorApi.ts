import { createCrudApi } from "./createCrudApi";
import { Author } from "@/types/author";

// Generic CRUD API for authors
const crudApi = createCrudApi<Author>("/api/authors");

// Re-export with original naming for backward compatibility
// Note: createAuthor has a custom signature (takes name string)
export const authorApi = {
  getAuthors: crudApi.getAll,
  createAuthor: (name: string) => crudApi.create({ name } as Omit<Author, "id">),
  updateAuthor: crudApi.update,
  deleteAuthor: crudApi.delete,
};

// Also export the standard CRUD interface for generic hook usage
export { crudApi as authorCrudApi };
