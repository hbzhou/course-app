import { describe, it, expect, beforeEach, vi } from "vitest";
import { ApiError, apiClient } from "./client";

describe("apiClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => "test-token"),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it("returns parsed json on success", async () => {
    const payload = { id: 1, title: "Course" };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await apiClient<typeof payload>("/api/courses", { method: "GET" });

    expect(result).toEqual(payload);
    expect(fetch).toHaveBeenCalledWith(
      "/api/courses",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("returns undefined for 204 no-content responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, {
        status: 204,
      })
    );

    const result = await apiClient<void>("/api/courses/1", { method: "DELETE" });

    expect(result).toBeUndefined();
  });

  it("throws ApiError with status and details when request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Unauthorized", code: "AUTH_401" }), {
        status: 401,
        statusText: "Unauthorized",
        headers: { "Content-Type": "application/json" },
      })
    );

    const rejected = apiClient("/api/courses", { method: "GET" });

    await expect(rejected).rejects.toBeInstanceOf(ApiError);
    await expect(rejected).rejects.toMatchObject({
      message: "Unauthorized",
      status: 401,
      statusText: "Unauthorized",
      details: { message: "Unauthorized", code: "AUTH_401" },
    });
  });
});
