import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Course } from "@/types/course";

export type CourseSliceState = Array<Course>;

const initialState: CourseSliceState = [];

export const courseSlice = createSlice({
  name: "course",
  initialState,
  reducers: {
    setCourses: (state: CourseSliceState, action: PayloadAction<Array<Course>>) => {
      return [...action.payload];
    },
    addCourse: (state: CourseSliceState, action: PayloadAction<Course>) => {
      return [...state, action.payload];
    },
  },
});

export const actions = courseSlice.actions;

export default courseSlice.reducer;
