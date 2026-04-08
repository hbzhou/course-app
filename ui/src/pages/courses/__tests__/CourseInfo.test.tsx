import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import CourseInfo from "../CourseInfo";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as courseApi from "@/api/courseApi";

vi.mock("@/api/courseApi");

describe("CourseInfo", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.clearAllMocks();
  });

  it("renders loading state", () => {
    vi.mocked(courseApi.courseCrudApi.getAll).mockImplementation(
      () => new Promise(() => {})
    );
    
    window.history.pushState({}, "", "/courses/1");
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/courses/:id" element={<CourseInfo />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    );
    
    expect(screen.getByText(/loading course/i)).toBeInTheDocument();
  });

  it("renders course details", async () => {
    vi.mocked(courseApi.courseCrudApi.getAll).mockResolvedValue([
      {
        id: 1,
        title: "Test Course",
        description: "Test course description",
        duration: 10,
        creationDate: "01/01/2024",
        authors: [{ id: 1, name: "Author One" }],
        tags: [{ id: 1, name: "Tag One", color: "#ff0000" }],
      },
    ]);
    
    window.history.pushState({}, "", "/courses/1");
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/courses/:id" element={<CourseInfo />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText("Test Course")).toBeInTheDocument();
      expect(screen.getByText("Test course description")).toBeInTheDocument();
      expect(screen.getByText("10 hours")).toBeInTheDocument();
      expect(screen.getByText("01/01/2024")).toBeInTheDocument();
    });
  });

  it("renders authors", async () => {
    vi.mocked(courseApi.courseCrudApi.getAll).mockResolvedValue([
      {
        id: 1,
        title: "Test Course",
        description: "Test description",
        duration: 5,
        creationDate: "01/01/2024",
        authors: [
          { id: 1, name: "Author One" },
          { id: 2, name: "Author Two" },
        ],
        tags: [],
      },
    ]);
    
    window.history.pushState({}, "", "/courses/1");
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/courses/:id" element={<CourseInfo />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText("Author One")).toBeInTheDocument();
      expect(screen.getByText("Author Two")).toBeInTheDocument();
    });
  });

  it("renders tags with colors", async () => {
    vi.mocked(courseApi.courseCrudApi.getAll).mockResolvedValue([
      {
        id: 1,
        title: "Test Course",
        description: "Test description",
        duration: 5,
        creationDate: "01/01/2024",
        authors: [],
        tags: [
          { id: 1, name: "Tag One", color: "#ff0000" },
          { id: 2, name: "Tag Two", color: "#00ff00" },
        ],
      },
    ]);
    
    window.history.pushState({}, "", "/courses/1");
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/courses/:id" element={<CourseInfo />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText("Tag One")).toBeInTheDocument();
      expect(screen.getByText("Tag Two")).toBeInTheDocument();
    });
  });

  it("shows error state when fetch fails", async () => {
    vi.mocked(courseApi.courseCrudApi.getAll).mockRejectedValue(
      new Error("Failed to fetch")
    );
    
    window.history.pushState({}, "", "/courses/1");
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/courses/:id" element={<CourseInfo />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/error loading course/i)).toBeInTheDocument();
    });
  });

  it("shows not found message for invalid course id", async () => {
    vi.mocked(courseApi.courseCrudApi.getAll).mockResolvedValue([
      { id: 1, title: "Test Course", description: "Test", duration: 5, creationDate: "01/01/2024", authors: [], tags: [] },
    ]);
    
    window.history.pushState({}, "", "/courses/999");
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/courses/:id" element={<CourseInfo />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/course not found/i)).toBeInTheDocument();
    });
  });

  it("renders back to courses button", async () => {
    vi.mocked(courseApi.courseCrudApi.getAll).mockResolvedValue([
      { id: 1, title: "Test Course", description: "Test", duration: 5, creationDate: "01/01/2024", authors: [], tags: [] },
    ]);
    
    window.history.pushState({}, "", "/courses/1");
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/courses/:id" element={<CourseInfo />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /back to courses/i })).toBeInTheDocument();
    });
  });
});
