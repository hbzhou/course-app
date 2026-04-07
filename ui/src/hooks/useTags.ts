import { tagCrudApi } from "@/api/tagApi";
import { Tag } from "@/types/tag";
import { createCrudHooks } from "./useCrudHooks";

export const TAGS_QUERY_KEY = ["tags"];

// Create all CRUD hooks using the generic factory
const tagHooks = createCrudHooks<Tag>(TAGS_QUERY_KEY, tagCrudApi);

// Re-export with original naming for backward compatibility
export const useTags = tagHooks.useQuery;
export const useCreateTag = tagHooks.useCreate;
export const useUpdateTag = tagHooks.useUpdate;
export const useDeleteTag = tagHooks.useDelete;
