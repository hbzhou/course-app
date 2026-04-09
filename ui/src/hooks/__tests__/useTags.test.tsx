import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from "../useTags";
import { tagCrudApi } from "@/api/tagApi";

// Mock the tagApi module
vi.mock("@/api/tagApi", () => ({
  tagCrudApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("useTags hooks", () => {
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

  describe("useTags", () => {
    it("fetches tags successfully", async () => {
      const mockTags = [
        { id: 1, name: "React" },
        { id: 2, name: "TypeScript" },
      ];

      vi.mocked(tagCrudApi.getAll).mockResolvedValue(mockTags);

      const { result } = renderHook(() => useTags(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockTags);
      expect(tagCrudApi.getAll).toHaveBeenCalledOnce();
    });

    it("handles fetch error", async () => {
      vi.mocked(tagCrudApi.getAll).mockRejectedValue(new Error("Fetch failed"));

      const { result } = renderHook(() => useTags(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe("useCreateTag", () => {
    it("creates tag successfully", async () => {
      const newTag = { name: "New Tag" };
      const createdTag = { id: 3, name: "New Tag" };

      vi.mocked(tagCrudApi.create).mockResolvedValue(createdTag);

      const { result } = renderHook(() => useCreateTag(), { wrapper });

      result.current.mutate(newTag);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(createdTag);
      expect(tagCrudApi.create).toHaveBeenCalled();
      expect(tagCrudApi.create.mock.calls[0][0]).toEqual(newTag);
    });

    it("handles create error", async () => {
      const newTag = { name: "New Tag" };

      vi.mocked(tagCrudApi.create).mockRejectedValue(new Error("Create failed"));

      const { result } = renderHook(() => useCreateTag(), { wrapper });

      result.current.mutate(newTag);

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe("useUpdateTag", () => {
    it("updates tag successfully", async () => {
      const updatedTag = { id: 1, name: "Updated Tag" };

      vi.mocked(tagCrudApi.update).mockResolvedValue(updatedTag);

      const { result } = renderHook(() => useUpdateTag(), { wrapper });

      result.current.mutate(updatedTag);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(updatedTag);
      expect(tagCrudApi.update).toHaveBeenCalled();
      expect(tagCrudApi.update.mock.calls[0][0]).toEqual(updatedTag);
    });

    it("handles update error", async () => {
      const updatedTag = { id: 1, name: "Updated Tag" };

      vi.mocked(tagCrudApi.update).mockRejectedValue(new Error("Update failed"));

      const { result } = renderHook(() => useUpdateTag(), { wrapper });

      result.current.mutate(updatedTag);

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe("useDeleteTag", () => {
    it("deletes tag successfully", async () => {
      vi.mocked(tagCrudApi.delete).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteTag(), { wrapper });

      result.current.mutate(1);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(tagCrudApi.delete).toHaveBeenCalled();
      expect(tagCrudApi.delete.mock.calls[0][0]).toBe(1);
    });

    it("handles delete error", async () => {
      vi.mocked(tagCrudApi.delete).mockRejectedValue(new Error("Delete failed"));

      const { result } = renderHook(() => useDeleteTag(), { wrapper });

      result.current.mutate(1);

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeInstanceOf(Error);
    });
  });
});
