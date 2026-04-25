import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import Users from "../Users";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { userApi } from "@/api/userApi";
import { usePermission } from "@/hooks/usePermission";

vi.mock("@/api/userApi", () => ({
  userApi: {
    getUsers: vi.fn(),
    getUserById: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    getRoles: vi.fn(),
  },
}));

vi.mock("@/hooks/usePermission", () => ({
  usePermission: vi.fn(),
}));

describe("Users", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.clearAllMocks();
    vi.mocked(usePermission).mockReturnValue(true);
  });

  const mockUsers = [
    { id: 1, username: "user1", email: "user1@example.com", roles: [{ id: 1, name: "ROLE_USER" }] },
    { id: 2, username: "admin", email: "admin@example.com", roles: [{ id: 2, name: "ROLE_ADMIN" }] },
  ];

  const mockRoles = [
    { id: 1, name: "ROLE_USER", permissions: [] },
    { id: 2, name: "ROLE_ADMIN", permissions: [] },
  ];

  const renderUsers = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Users />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it("renders loading state", () => {
    vi.mocked(userApi.getUsers).mockImplementation(() => new Promise(() => {}));
    vi.mocked(userApi.getRoles).mockImplementation(() => new Promise(() => {}));
    
    renderUsers();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("renders users list", async () => {
    vi.mocked(userApi.getUsers).mockResolvedValue(mockUsers);
    vi.mocked(userApi.getRoles).mockResolvedValue(mockRoles);
    
    renderUsers();
    
    await waitFor(() => {
      expect(screen.getByText("user1")).toBeInTheDocument();
      expect(screen.getByText("admin")).toBeInTheDocument();
    });
  });

  it("shows add user button", async () => {
    vi.mocked(userApi.getUsers).mockResolvedValue([]);
    vi.mocked(userApi.getRoles).mockResolvedValue(mockRoles);
    
    renderUsers();
    
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add user/i })).toBeInTheDocument();
    });
  });

  it("shows error state when fetch fails", async () => {
    vi.mocked(userApi.getUsers).mockRejectedValue(new Error("Failed to fetch"));
    vi.mocked(userApi.getRoles).mockResolvedValue(mockRoles);
    
    renderUsers();
    
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it("opens modal when add button is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(userApi.getUsers).mockResolvedValue([]);
    vi.mocked(userApi.getRoles).mockResolvedValue(mockRoles);
    
    renderUsers();
    
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add user/i })).toBeInTheDocument();
    });
    
    await user.click(screen.getByRole("button", { name: /add user/i }));
    
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  it("displays user roles as badges", async () => {
    vi.mocked(userApi.getUsers).mockResolvedValue(mockUsers);
    vi.mocked(userApi.getRoles).mockResolvedValue(mockRoles);
    
    renderUsers();
    
    await waitFor(() => {
      expect(screen.getByText("ROLE_USER")).toBeInTheDocument();
      expect(screen.getByText("ROLE_ADMIN")).toBeInTheDocument();
    });
  });
});
