import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import Tags from "../Tags";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as tagApi from "@/api/tagApi";
import { usePermission } from "@/hooks/usePermission";

vi.mock("@/api/tagApi");

vi.mock("@/hooks/usePermission", () => ({
  usePermission: vi.fn(),
}));

describe("Tags", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.clearAllMocks();
    vi.mocked(usePermission).mockReturnValue(true);
  });

  const renderTags = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Tags />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it("renders loading state", () => {
    vi.mocked(tagApi.tagCrudApi.getAll).mockImplementation(
      () => new Promise(() => {})
    );
    
    renderTags();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("renders tags list", async () => {
    vi.mocked(tagApi.tagCrudApi.getAll).mockResolvedValue([
      { id: 1, name: "React" },
      { id: 2, name: "TypeScript" },
    ]);
    
    renderTags();
    
    await waitFor(() => {
      expect(screen.getByText("React")).toBeInTheDocument();
      expect(screen.getByText("TypeScript")).toBeInTheDocument();
    });
  });

  it("shows add tag button", async () => {
    vi.mocked(tagApi.tagCrudApi.getAll).mockResolvedValue([]);
    
    renderTags();
    
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add tag/i })).toBeInTheDocument();
    });
  });

  it("shows error state when fetch fails", async () => {
    vi.mocked(tagApi.tagCrudApi.getAll).mockRejectedValue(
      new Error("Failed to fetch")
    );
    
    renderTags();
    
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it("opens modal when add button is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(tagApi.tagCrudApi.getAll).mockResolvedValue([]);
    
    renderTags();
    
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add tag/i })).toBeInTheDocument();
    });
    
    await user.click(screen.getByRole("button", { name: /add tag/i }));
    
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });
});
