import { AppDispatch } from "@/store/store";
import {actions} from "./course.slice";
import { Course } from "@/types/course";

export const fetchCourses = () => async (dispatch: AppDispatch) => {
  const token = localStorage.getItem("token") ?? "";
  const response = await fetch("/api/courses", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch courses: ${response.status} ${response.statusText}`);
  }

  const courses: Course[] = await response.json();
  dispatch(actions.setCourses(courses));
};

export const createCourse = (course: Course) => async (dispatch: AppDispatch) => {
  const token = localStorage.getItem("token") ?? "";
  const response = await fetch("/api/courses", {
    method: "POST",
    body: JSON.stringify(course),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Failed to create course: ${response.status} ${response.statusText}`);
  }

  const createdCourse: Course = await response.json();
  dispatch(actions.addCourse(createdCourse));
};
