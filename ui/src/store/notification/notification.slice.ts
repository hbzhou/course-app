import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Notification, NotificationMessage } from "@/types/notification";

export interface NotificationSliceState {
  notifications: Notification[];
}

const initialState: NotificationSliceState = {
  notifications: [],
};

const operationLabel: Record<string, string> = {
  CREATED: "created",
  UPDATED: "updated",
  DELETED: "deleted",
};

const entityLabel: Record<string, string> = {
  COURSE: "Course",
  AUTHOR: "Author",
  USER: "User",
};

function buildMessage(msg: NotificationMessage): string {
  const entity = entityLabel[msg.entityType] ?? msg.entityType;
  const op = operationLabel[msg.operation] ?? msg.operation;
  const name = msg.entityName ? ` "${msg.entityName}"` : "";
  const by = msg.initiatedBy ? ` by ${msg.initiatedBy}` : "";
  return `${entity}${name} was ${op}${by}.`;
}

export const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<NotificationMessage>) => {
      const msg = action.payload;
      const notification: Notification = {
        id: `${msg.timestamp}-${Math.random().toString(36).slice(2)}`,
        message: buildMessage(msg),
        entityType: msg.entityType,
        operation: msg.operation,
        entityId: msg.entityId,
        timestamp: msg.timestamp,
        read: false,
      };
      // Keep last 50 notifications
      state.notifications = [notification, ...state.notifications].slice(0, 50);
    },
    markAllRead: (state) => {
      state.notifications.forEach((n) => (n.read = true));
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
  },
});

export const notificationActions = notificationSlice.actions;
export default notificationSlice.reducer;

