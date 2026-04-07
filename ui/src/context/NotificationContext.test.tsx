import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { NotificationProvider, useNotificationContext } from "./NotificationContext";
import type { ReactNode } from "react";
import type { Notification } from "@/types/notification";

const wrapper = ({ children }: { children: ReactNode }) => (
  <NotificationProvider>{children}</NotificationProvider>
);

const mockNotification: Notification = {
  id: "1",
  message: "Test notification",
  entityType: "COURSE",
  operation: "CREATED",
  timestamp: Date.now(),
  read: false,
};

describe("NotificationContext", () => {
  it("initializes with empty notifications", () => {
    const { result } = renderHook(() => useNotificationContext(), { wrapper });
    
    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });

  it("adds notification to the list", () => {
    const { result } = renderHook(() => useNotificationContext(), { wrapper });

    act(() => {
      result.current.addNotification(mockNotification);
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0]).toEqual(mockNotification);
    expect(result.current.unreadCount).toBe(1);
  });

  it("adds multiple notifications", () => {
    const { result } = renderHook(() => useNotificationContext(), { wrapper });

    act(() => {
      result.current.addNotification(mockNotification);
      result.current.addNotification({ ...mockNotification, id: "2", message: "Second" });
    });

    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.unreadCount).toBe(2);
  });

  it("marks notification as read", () => {
    const { result } = renderHook(() => useNotificationContext(), { wrapper });

    act(() => {
      result.current.addNotification(mockNotification);
    });

    act(() => {
      result.current.markAsRead("1");
    });

    expect(result.current.notifications[0].read).toBe(true);
    expect(result.current.unreadCount).toBe(0);
  });

  it("marks all notifications as read", () => {
    const { result } = renderHook(() => useNotificationContext(), { wrapper });

    act(() => {
      result.current.addNotification(mockNotification);
      result.current.addNotification({ ...mockNotification, id: "2" });
      result.current.addNotification({ ...mockNotification, id: "3" });
    });

    expect(result.current.unreadCount).toBe(3);

    act(() => {
      result.current.markAllAsRead();
    });

    expect(result.current.unreadCount).toBe(0);
    expect(result.current.notifications.every((n) => n.read)).toBe(true);
  });

  it("clears all notifications", () => {
    const { result } = renderHook(() => useNotificationContext(), { wrapper });

    act(() => {
      result.current.addNotification(mockNotification);
      result.current.addNotification({ ...mockNotification, id: "2" });
    });

    expect(result.current.notifications).toHaveLength(2);

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.notifications).toHaveLength(0);
    expect(result.current.unreadCount).toBe(0);
  });

  it("throws error when used outside provider", () => {
    expect(() => {
      renderHook(() => useNotificationContext());
    }).toThrow("useNotificationContext must be used within a NotificationProvider");
  });
});
