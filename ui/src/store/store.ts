import { configureStore } from "@reduxjs/toolkit";
import courseReducer, { CourseSliceState } from "./course/course.slice";
import authorReducer, { AuthorSliceState } from "./author/author.slice";
import authReducer, { AuthSliceState } from "./auth/auth.slice";
import notificationReducer, { NotificationSliceState } from "./notification/notification.slice";

export interface AppState {
  courses: CourseSliceState;
  authors: AuthorSliceState;
  currentUser: AuthSliceState;
  notifications: NotificationSliceState;
}

export const store = configureStore({
  reducer: {
    courses: courseReducer,
    authors: authorReducer,
    currentUser: authReducer,
    notifications: notificationReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const selectCourses = (state: RootState) => state.courses;
export const selectAuthors = (state: RootState) => state.authors;
export const selectCurrentUser = (state: RootState) => state.currentUser;
export const selectNotifications = (state: RootState) => state.notifications.notifications;
export const selectUnreadCount = (state: RootState) =>
  state.notifications.notifications.filter((n) => !n.read).length;
