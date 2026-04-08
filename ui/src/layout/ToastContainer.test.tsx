import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import ToastContainer from "./ToastContainer";
import { NotificationProvider } from "@/context/NotificationContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

describe("ToastContainer", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.clearAllMocks();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    });
  });

  const renderToastContainer = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <NotificationProvider>
          <ToastContainer />
        </NotificationProvider>
      </QueryClientProvider>
    );
  };

  it("renders without errors", () => {
    renderToastContainer();
    // ToastContainer should render without crashing
    expect(document.body).toBeTruthy();
  });

  it("does not render toasts when there are no notifications", () => {
    renderToastContainer();
    
    // Toasts should not be visible
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
