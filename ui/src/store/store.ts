import { configureStore } from "@reduxjs/toolkit";
import authReducer, { AuthSliceState } from "./auth/auth.slice";
import notificationReducer, { NotificationSliceState } from "./notification/notification.slice";

export interface AppState {
  currentUser: AuthSliceState;
  notifications: NotificationSliceState;
}

export const store = configureStore({
  reducer: {
    currentUser: authReducer,
    notifications: notificationReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const selectCurrentUser = (state: RootState) => state.currentUser;
export const selectNotifications = (state: RootState) => state.notifications.notifications;
export const selectUnreadCount = (state: RootState) =>
  state.notifications.notifications.filter((n) => !n.read).length;
