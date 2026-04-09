import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { useCourses, useCreateCourse, useUpdateCourse, useDeleteCourse } from "../useCourses";
import { courseCrudApi } from "@/api/courseApi";

// Mock the courseApi module
vi.mock("@/api/courseApi", () => ({
  courseCrudApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("useCourses hooks", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe("useCourses", () => {
    it("fetches courses successfully", async () => {
      const mockCourses = [
        { id: 1, title: "React Basics", description: "Learn React", authorIds: [1], tagIds: [1] },
        { id: 2, title: "TypeScript", description: "Learn TS", authorIds: [2], tagIds: [2] },
      ];

      vi.mocked(courseCrudApi.getAll).mockResolvedValue(mockCourses);

      const { result } = renderHook(() => useCourses(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockCourses);
      expect(courseCrudApi.getAll).toHaveBeenCalledOnce();
    });

    it("handles fetch error", async () => {
      vi.mocked(courseCrudApi.getAll).mockRejectedValue(new Error("Fetch failed"));

      const { result } = renderHook(() => useCourses(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe("useCreateCourse", () => {
    it("creates course successfully", async () => {
      const newCourse = { title: "New Course", description: "Desc", authorIds: [1], tagIds: [1] };
      const createdCourse = { id: 3, ...newCourse };

      vi.mocked(courseCrudApi.create).mockResolvedValue(createdCourse);

      const { result } = renderHook(() => useCreateCourse(), { wrapper });

      result.current.mutate(newCourse);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(createdCourse);
      expect(courseCrudApi.create).toHaveBeenCalled();
      expect(courseCrudApi.create.mock.calls[0][0]).toEqual(newCourse);
    });

    it("handles create error", async () => {
      const newCourse = { title: "New Course", description: "Desc", authorIds: [1], tagIds: [1] };

      vi.mocked(courseCrudApi.create).mockRejectedValue(new Error("Create failed"));

      const { result } = renderHook(() => useCreateCourse(), { wrapper });

      result.current.mutate(newCourse);

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe("useUpdateCourse", () => {
    it("updates course successfully", async () => {
      const updatedCourse = { id: 1, title: "Updated", description: "Desc", authorIds: [1], tagIds: [1] };

      vi.mocked(courseCrudApi.update).mockResolvedValue(updatedCourse);

      const { result } = renderHook(() => useUpdateCourse(), { wrapper });

      result.current.mutate(updatedCourse);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(updatedCourse);
      expect(courseCrudApi.update).toHaveBeenCalled();
      expect(courseCrudApi.update.mock.calls[0][0]).toEqual(updatedCourse);
    });

    it("handles update error", async () => {
      const updatedCourse = { id: 1, title: "Updated", description: "Desc", authorIds: [1], tagIds: [1] };

      vi.mocked(courseCrudApi.update).mockRejectedValue(new Error("Update failed"));

      const { result } = renderHook(() => useUpdateCourse(), { wrapper });

      result.current.mutate(updatedCourse);

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe("useDeleteCourse", () => {
    it("deletes course successfully", async () => {
      vi.mocked(courseCrudApi.delete).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteCourse(), { wrapper });

      result.current.mutate(1);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(courseCrudApi.delete).toHaveBeenCalled();
      expect(courseCrudApi.delete.mock.calls[0][0]).toBe(1);
    });

    it("handles delete error", async () => {
      vi.mocked(courseCrudApi.delete).mockRejectedValue(new Error("Delete failed"));

      const { result } = renderHook(() => useDeleteCourse(), { wrapper });

      result.current.mutate(1);

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeInstanceOf(Error);
    });
  });
});
