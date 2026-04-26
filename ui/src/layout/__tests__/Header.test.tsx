import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Header from "../Header";
import { AuthProvider } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { authApi } from "@/api/authApi";

vi.mock("../Logo", () => ({
  default: () => <div data-testid="logo">Logo</div>,
}));

vi.mock("../Nav", () => ({
  default: () => <nav data-testid="nav">Navigation</nav>,
}));

vi.mock("../Profile", () => ({
  default: () => <div data-testid="profile">Profile</div>,
}));

vi.mock("../NotificationBell", () => ({
  default: () => <div data-testid="notifications">Notifications</div>,
}));

vi.mock("@/api/authApi", () => ({
  authApi: {
    getCurrentUser: vi.fn(),
  },
}));

describe("Header", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.clearAllMocks();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    });
  });

  const renderHeader = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NotificationProvider>
            <BrowserRouter>
              <Header />
            </BrowserRouter>
          </NotificationProvider>
        </AuthProvider>
      </QueryClientProvider>
    );
  };

  it("renders header with all components when authenticated", async () => {
    vi.mocked(authApi.getCurrentUser).mockResolvedValue({
      name: "testuser",
      email: "test@example.com",
      provider: "azure",
      authType: "session",
      permissions: ["COURSE_VIEW"],
    });

    renderHeader();
    
    await waitFor(() => {
      expect(screen.getByRole("banner")).toBeInTheDocument();
      expect(screen.getByTestId("logo")).toBeInTheDocument();
      expect(screen.getByTestId("nav")).toBeInTheDocument();
      expect(screen.getByTestId("profile")).toBeInTheDocument();
      expect(screen.getByTestId("notifications")).toBeInTheDocument();
    });
  });

  it("does not render Nav, NotificationBell, or Profile when not authenticated", async () => {
    vi.mocked(authApi.getCurrentUser).mockRejectedValue(
      new Error("Unauthorized")
    );

    renderHeader();
    
    await waitFor(() => {
      // Logo should still be present
      expect(screen.getByTestId("logo")).toBeInTheDocument();
      
      // Nav should not be rendered
      expect(screen.queryByTestId("nav")).not.toBeInTheDocument();
      
      // NotificationBell should not be rendered
      expect(screen.queryByTestId("notifications")).not.toBeInTheDocument();
      
      // Profile should not be rendered
      expect(screen.queryByTestId("profile")).not.toBeInTheDocument();
    });
  });

  it("has sticky positioning and backdrop blur", () => {
    vi.mocked(authApi.getCurrentUser).mockRejectedValue(
      new Error("Unauthorized")
    );
    
    const { container } = renderHeader();
    const header = container.querySelector("header");
    
    expect(header).toHaveClass("sticky");
    expect(header).toHaveClass("top-0");
    expect(header).toHaveClass("backdrop-blur");
  });

  it("applies proper layout structure", () => {
    vi.mocked(authApi.getCurrentUser).mockRejectedValue(
      new Error("Unauthorized")
    );
    
    const { container } = renderHeader();
    const header = container.querySelector("header");
    
    expect(header?.querySelector(".container")).toBeInTheDocument();
    expect(header?.querySelector(".flex.justify-between")).toBeInTheDocument();
  });
});
