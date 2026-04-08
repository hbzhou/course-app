import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Header from "../Header";
import { AuthProvider } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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

describe("Header", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
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

  it("renders header with all components", () => {
    renderHeader();
    
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByTestId("logo")).toBeInTheDocument();
    expect(screen.getByTestId("nav")).toBeInTheDocument();
    expect(screen.getByTestId("profile")).toBeInTheDocument();
    expect(screen.getByTestId("notifications")).toBeInTheDocument();
  });

  it("has sticky positioning and backdrop blur", () => {
    const { container } = renderHeader();
    const header = container.querySelector("header");
    
    expect(header).toHaveClass("sticky");
    expect(header).toHaveClass("top-0");
    expect(header).toHaveClass("backdrop-blur");
  });

  it("applies proper layout structure", () => {
    const { container } = renderHeader();
    const header = container.querySelector("header");
    
    expect(header?.querySelector(".container")).toBeInTheDocument();
    expect(header?.querySelector(".flex.justify-between")).toBeInTheDocument();
  });
});
