import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import Authors from "../Authors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as authorApi from "@/api/authorApi";

vi.mock("@/api/authorApi");

describe("Authors", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.clearAllMocks();
  });

  const renderAuthors = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Authors />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it("renders loading state", () => {
    vi.mocked(authorApi.authorCrudApi.getAll).mockImplementation(
      () => new Promise(() => {})
    );
    
    renderAuthors();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("renders authors list", async () => {
    vi.mocked(authorApi.authorCrudApi.getAll).mockResolvedValue([
      { id: 1, name: "Author One" },
      { id: 2, name: "Author Two" },
    ]);
    
    renderAuthors();
    
    await waitFor(() => {
      expect(screen.getByText("Author One")).toBeInTheDocument();
      expect(screen.getByText("Author Two")).toBeInTheDocument();
    });
  });

  it("shows add author button", async () => {
    vi.mocked(authorApi.authorCrudApi.getAll).mockResolvedValue([]);
    
    renderAuthors();
    
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add author/i })).toBeInTheDocument();
    });
  });

  it("shows error state when fetch fails", async () => {
    vi.mocked(authorApi.authorCrudApi.getAll).mockRejectedValue(
      new Error("Failed to fetch")
    );
    
    renderAuthors();
    
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it("opens modal when add button is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(authorApi.authorCrudApi.getAll).mockResolvedValue([]);
    
    renderAuthors();
    
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add author/i })).toBeInTheDocument();
    });
    
    await user.click(screen.getByRole("button", { name: /add author/i }));
    
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });
});
