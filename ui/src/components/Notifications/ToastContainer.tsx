import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { selectNotifications } from "@/store/store";
import { notificationActions } from "@/store/notification/notification.slice";
import {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
} from "@/common/Toast";
import type { ToastProps } from "@/common/Toast";

const AUTO_DISMISS_MS = 5000;

const operationLabel: Record<string, string> = {
  CREATED: "Created",
  UPDATED: "Updated",
  DELETED: "Deleted",
};

const operationVariant: Record<string, ToastProps["variant"]> = {
  CREATED: "created",
  UPDATED: "updated",
  DELETED: "deleted",
};

const ToastContainer: React.FC = () => {
  const notifications = useSelector(selectNotifications);
  const dispatch = useDispatch();

  // Only unread toasts, newest 5
  const toasts = notifications.filter((n) => !n.read).slice(0, 5);

  const dismiss = () => dispatch(notificationActions.markAllRead());

  return (
    <ToastProvider duration={AUTO_DISMISS_MS}>
      {toasts.map((n) => (
        <Toast
          key={n.id}
          variant={operationVariant[n.operation] ?? "default"}
          onOpenChange={(open) => { if (!open) dismiss(); }}
        >
          <div className="flex-1 grid gap-1">
            <ToastTitle>{operationLabel[n.operation] ?? n.operation}</ToastTitle>
            <ToastDescription>{n.message}</ToastDescription>
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
};

export default ToastContainer;

