import { courseCrudApi } from "@/api/courseApi";
import { Course } from "@/types/course";
import { createCrudHooks } from "./useCrudHooks";

export const COURSES_QUERY_KEY = ["courses"];

// Create all CRUD hooks using the generic factory
const courseHooks = createCrudHooks<Course>(COURSES_QUERY_KEY, courseCrudApi);

// Re-export with original naming for backward compatibility
export const useCourses = courseHooks.useQuery;
export const useCreateCourse = courseHooks.useCreate;
export const useUpdateCourse = courseHooks.useUpdate;
export const useDeleteCourse = courseHooks.useDelete;
