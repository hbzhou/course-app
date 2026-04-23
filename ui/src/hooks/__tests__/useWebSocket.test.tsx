import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useWebSocket } from "../useWebSocket";
import { Client } from "@stomp/stompjs";
import { useAuthContext } from "@/context/auth-context";
import { useNotificationContext } from "@/context/notification-context";

vi.mock("@stomp/stompjs", () => ({
  Client: vi.fn(),
}));

vi.mock("@/context/auth-context", () => ({
  useAuthContext: vi.fn(),
}));

vi.mock("@/context/notification-context", () => ({
  useNotificationContext: vi.fn(),
}));

describe("useWebSocket", () => {
  let mockActivate: ReturnType<typeof vi.fn>;
  let mockDeactivate: ReturnType<typeof vi.fn>;
  let mockSubscribe: ReturnType<typeof vi.fn>;
  let mockAddNotification: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockActivate = vi.fn();
    mockDeactivate = vi.fn();
    mockSubscribe = vi.fn();
    mockAddNotification = vi.fn();

    vi.mocked(useNotificationContext).mockReturnValue({
      notifications: [],
      unreadCount: 0,
      addNotification: mockAddNotification,
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      clearAll: vi.fn(),
    });

    vi.mocked(Client).mockImplementation(function(this: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const self = this as any;
      self.activate = mockActivate;
      self.deactivate = mockDeactivate;
      self.subscribe = mockSubscribe;
      return self;
    });
  });

  it("does not activate connection when not authenticated", () => {
    vi.mocked(useAuthContext).mockReturnValue({
      user: null,
      authStatus: "anonymous",
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    renderHook(() => useWebSocket());

    expect(Client).not.toHaveBeenCalled();
    expect(mockActivate).not.toHaveBeenCalled();
  });

  it("activates connection when authenticated", async () => {
    vi.mocked(useAuthContext).mockReturnValue({
      user: { name: "admin", email: "admin@test.com", authType: "session" },
      authStatus: "authenticated",
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    renderHook(() => useWebSocket());

    await waitFor(() => {
      expect(Client).toHaveBeenCalledWith(
        expect.objectContaining({
          brokerURL: expect.stringContaining("ws://"),
          reconnectDelay: 5000,
        })
      );
      expect(mockActivate).toHaveBeenCalled();
    });
  });

  it("does not send Authorization in connect headers", async () => {
    vi.mocked(useAuthContext).mockReturnValue({
      user: { name: "testuser", email: "test@example.com", provider: "azure", authType: "session" },
      authStatus: "authenticated",
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    renderHook(() => useWebSocket());

    await waitFor(() => {
      expect(Client).toHaveBeenCalled();
    });

    const clientConfig = vi.mocked(Client).mock.calls[0][0] as Record<string, unknown>;
    expect(clientConfig.connectHeaders).toBeUndefined();
  });

  it("deactivates connection on unmount", async () => {
    vi.mocked(useAuthContext).mockReturnValue({
      user: { name: "admin", email: "admin@test.com", authType: "session" },
      authStatus: "authenticated",
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    const { unmount } = renderHook(() => useWebSocket());

    await waitFor(() => {
      expect(mockActivate).toHaveBeenCalled();
    });

    unmount();

    expect(mockDeactivate).toHaveBeenCalled();
  });
});
