import { createCrudApi } from "./createCrudApi";
import { Course } from "@/types/course";

// Generic CRUD API for courses
const crudApi = createCrudApi<Course>("/api/courses");

// Re-export with original naming for backward compatibility
export const courseApi = {
  getCourses: crudApi.getAll,
  createCourse: crudApi.create,
  updateCourse: crudApi.update,
  deleteCourse: crudApi.delete,
};

// Also export the standard CRUD interface for generic hook usage
export { crudApi as courseCrudApi };
