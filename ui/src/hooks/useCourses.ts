import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { courseApi } from "@/api/courseApi";
import { Course } from "@/types/course";

export const COURSES_QUERY_KEY = ["courses"];

export const useCourses = () => {
  return useQuery({
    queryKey: COURSES_QUERY_KEY,
    queryFn: courseApi.getCourses,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateCourse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (course: Course) => courseApi.createCourse(course),
    onSuccess: (newCourse) => {
      // Update cache with the new course from server response
      queryClient.setQueryData<Course[]>(COURSES_QUERY_KEY, (old) => {
        if (!old) return [newCourse];
        return [...old, newCourse];
      });
    },
    onError: () => {
      // Refetch on error to ensure consistency
      queryClient.invalidateQueries({ queryKey: COURSES_QUERY_KEY });
    },
  });
};

export const useUpdateCourse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (course: Course) => courseApi.updateCourse(course),
    onMutate: async (updatedCourse: Course) => {
      await queryClient.cancelQueries({ queryKey: COURSES_QUERY_KEY });
      const previousCourses = queryClient.getQueryData<Course[]>(COURSES_QUERY_KEY);

      if (previousCourses) {
        queryClient.setQueryData<Course[]>(
          COURSES_QUERY_KEY,
          previousCourses.map((course) =>
            course.id === updatedCourse.id ? updatedCourse : course
          )
        );
      }

      return { previousCourses };
    },
    onError: (err, updatedCourse, context) => {
      if (context?.previousCourses) {
        queryClient.setQueryData(COURSES_QUERY_KEY, context.previousCourses);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: COURSES_QUERY_KEY });
    },
  });
};

export const useDeleteCourse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (courseId: string) => courseApi.deleteCourse(courseId),
    onMutate: async (courseId: string) => {
      await queryClient.cancelQueries({ queryKey: COURSES_QUERY_KEY });
      const previousCourses = queryClient.getQueryData<Course[]>(COURSES_QUERY_KEY);

      if (previousCourses) {
        queryClient.setQueryData<Course[]>(
          COURSES_QUERY_KEY,
          previousCourses.filter((course) => course.id !== courseId)
        );
      }

      return { previousCourses };
    },
    onError: (err, courseId, context) => {
      if (context?.previousCourses) {
        queryClient.setQueryData(COURSES_QUERY_KEY, context.previousCourses);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: COURSES_QUERY_KEY });
    },
  });
};
