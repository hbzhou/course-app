import { createCrudApi } from "./createCrudApi";
import { Tag } from "@/types/tag";

// Generic CRUD API for tags
const crudApi = createCrudApi<Tag>("/api/tags");

// Re-export with original naming for backward compatibility
export const tagApi = {
  getTags: crudApi.getAll,
  createTag: crudApi.create,
  updateTag: crudApi.update,
  deleteTag: crudApi.delete,
};

// Also export the standard CRUD interface for generic hook usage
export { crudApi as tagCrudApi };
