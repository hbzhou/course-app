import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCrudApi } from "./createCrudApi";
import * as clientModule from "./client";

vi.mock("./client", () => ({
  apiClient: vi.fn(),
}));

interface TestEntity {
  id: number;
  name: string;
}

describe("createCrudApi", () => {
  const mockApiClient = vi.mocked(clientModule.apiClient);
  const baseUrl = "/api/test";
  let api: ReturnType<typeof createCrudApi<TestEntity>>;

  beforeEach(() => {
    vi.clearAllMocks();
    api = createCrudApi<TestEntity>(baseUrl);
  });

  describe("getAll", () => {
    it("fetches all entities", async () => {
      const mockData: TestEntity[] = [
        { id: 1, name: "Test 1" },
        { id: 2, name: "Test 2" },
      ];
      mockApiClient.mockResolvedValueOnce(mockData);

      const result = await api.getAll();

      expect(mockApiClient).toHaveBeenCalledWith(baseUrl, { 
        method: "GET", 
        signal: undefined 
      });
      expect(result).toEqual(mockData);
    });
  });

  describe("create", () => {
    it("creates a new entity", async () => {
      const newEntity = { id: 0, name: "New Entity" };
      const created = { id: 3, name: "New Entity" };
      mockApiClient.mockResolvedValueOnce(created);

      const result = await api.create(newEntity);

      expect(mockApiClient).toHaveBeenCalledWith(baseUrl, {
        method: "POST",
        body: JSON.stringify(newEntity),
      });
      expect(result).toEqual(created);
    });
  });

  describe("update", () => {
    it("updates an existing entity", async () => {
      const updated = { id: 1, name: "Updated" };
      mockApiClient.mockResolvedValueOnce(updated);

      const result = await api.update(updated);

      expect(mockApiClient).toHaveBeenCalledWith(`${baseUrl}/1`, {
        method: "PUT",
        body: JSON.stringify(updated),
      });
      expect(result).toEqual(updated);
    });
  });

  describe("delete", () => {
    it("deletes an entity", async () => {
      mockApiClient.mockResolvedValueOnce(undefined);

      await api.delete(1);

      expect(mockApiClient).toHaveBeenCalledWith(`${baseUrl}/1`, {
        method: "DELETE",
      });
    });
  });
});
