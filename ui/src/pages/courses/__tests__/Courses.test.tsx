import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Courses from "../Courses";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as courseApi from "@/api/courseApi";
import * as authorApi from "@/api/authorApi";

vi.mock("@/api/courseApi");
vi.mock("@/api/authorApi");

describe("Courses", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.clearAllMocks();
  });

  const renderCourses = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Courses />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it("renders loading state", () => {
    vi.mocked(courseApi.courseCrudApi.getAll).mockImplementation(
      () => new Promise(() => {})
    );
    vi.mocked(authorApi.authorCrudApi.getAll).mockImplementation(
      () => new Promise(() => {})
    );
    
    renderCourses();
    expect(screen.getByText(/exploring available courses/i)).toBeInTheDocument();
  });

  it("renders courses grid", async () => {
    vi.mocked(courseApi.courseCrudApi.getAll).mockResolvedValue([
      { 
        id: 1, 
        title: "React Basics", 
        description: "Learn React", 
        authorIds: [1], 
        tagIds: [1],
        duration: 10,
        creationDate: "2024-01-01",
        authors: [{ id: 1, name: "Author 1" }],
        tags: []
      },
      { 
        id: 2, 
        title: "TypeScript", 
        description: "Learn TS", 
        authorIds: [2], 
        tagIds: [2],
        duration: 15,
        creationDate: "2024-01-02",
        authors: [{ id: 2, name: "Author 2" }],
        tags: []
      },
    ]);
    vi.mocked(authorApi.authorCrudApi.getAll).mockResolvedValue([
      { id: 1, name: "Author 1" },
    ]);
    
    renderCourses();
    
    await waitFor(() => {
      expect(screen.getByText("React Basics")).toBeInTheDocument();
      expect(screen.getByText("TypeScript")).toBeInTheDocument();
    });
  });

  it("shows create course button", async () => {
    vi.mocked(courseApi.courseCrudApi.getAll).mockResolvedValue([]);
    vi.mocked(authorApi.authorCrudApi.getAll).mockResolvedValue([]);
    
    renderCourses();
    
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /create course/i })).toBeInTheDocument();
    });
  });

  it("renders search bar", async () => {
    vi.mocked(courseApi.courseCrudApi.getAll).mockResolvedValue([]);
    vi.mocked(authorApi.authorCrudApi.getAll).mockResolvedValue([]);
    
    renderCourses();
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });
  });

  it("shows error state when fetch fails", async () => {
    vi.mocked(courseApi.courseCrudApi.getAll).mockRejectedValue(
      new Error("Failed to fetch")
    );
    vi.mocked(authorApi.authorCrudApi.getAll).mockResolvedValue([]);
    
    renderCourses();
    
    await waitFor(() => {
      expect(screen.getByText(/error loading courses/i)).toBeInTheDocument();
    });
  });
});
