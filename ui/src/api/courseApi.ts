import { apiClient } from "./client";
import { Course } from "@/types/course";

export const courseApi = {
  getCourses: async (): Promise<Course[]> => {
    return apiClient<Course[]>("/api/courses", {
      method: "GET",
    });
  },

  createCourse: async (course: Course): Promise<Course> => {
    return apiClient<Course>("/api/courses", {
      method: "POST",
      body: JSON.stringify(course),
    });
  },

  updateCourse: async (course: Course): Promise<Course> => {
    return apiClient<Course>(`/api/courses/${course.id}`, {
      method: "PUT",
      body: JSON.stringify(course),
    });
  },

  deleteCourse: async (courseId: string): Promise<void> => {
    return apiClient<void>(`/api/courses/${courseId}`, {
      method: "DELETE",
    });
  },
};
