import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { useWebSocket } from "./useWebSocket";
import { Client } from "@stomp/stompjs";

// Mock @stomp/stompjs
vi.mock("@stomp/stompjs");

describe("useWebSocket", () => {
  let mockClient: any;
  let mockActivate: ReturnType<typeof vi.fn>;
  let mockDeactivate: ReturnType<typeof vi.fn>;
  let mockSubscribe: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock localStorage
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    });

    mockActivate = vi.fn();
    mockDeactivate = vi.fn();
    mockSubscribe = vi.fn();

    mockClient = {
      activate: mockActivate,
      deactivate: mockDeactivate,
      subscribe: mockSubscribe,
      onConnect: null,
    };

    vi.mocked(Client).mockImplementation(() => mockClient);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const createWrapper = (token: string | null) => {
    vi.mocked(localStorage.getItem).mockReturnValue(token);

    return ({ children }: { children: ReactNode }) => (
      <AuthProvider>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </AuthProvider>
    );
  };

  it("does not activate connection when no token", () => {
    const wrapper = createWrapper(null);

    renderHook(() => useWebSocket(), { wrapper });

    expect(Client).not.toHaveBeenCalled();
    expect(mockActivate).not.toHaveBeenCalled();
  });

  it("activates connection when token exists", async () => {
    const wrapper = createWrapper("test-token");

    renderHook(() => useWebSocket(), { wrapper });

    await waitFor(() => {
      expect(Client).toHaveBeenCalledWith(
        expect.objectContaining({
          brokerURL: expect.stringContaining("ws://"),
          connectHeaders: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        })
      );
      expect(mockActivate).toHaveBeenCalled();
    });
  });

  it("deactivates connection on unmount", async () => {
    const wrapper = createWrapper("test-token");

    const { unmount } = renderHook(() => useWebSocket(), { wrapper });

    await waitFor(() => {
      expect(mockActivate).toHaveBeenCalled();
    });

    unmount();

    expect(mockDeactivate).toHaveBeenCalled();
  });

  it("connects with proper configuration", async () => {
    const wrapper = createWrapper("test-token");

    renderHook(() => useWebSocket(), { wrapper });

    await waitFor(() => {
      expect(Client).toHaveBeenCalledWith(
        expect.objectContaining({
          brokerURL: expect.stringContaining("ws://"),
          connectHeaders: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
          reconnectDelay: 5000,
        })
      );
    });
  });
});
