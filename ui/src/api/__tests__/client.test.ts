import { describe, it, expect, beforeEach, vi } from "vitest";
import { ApiError, apiClient } from "../client";

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
        credentials: "include",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      })
    );

    const [, requestInit] = vi.mocked(fetch).mock.calls[0];
    const headers = requestInit?.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBeUndefined();
  });

  it("sends credentials include even when no bearer token exists", async () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await apiClient<{ ok: boolean }>("/api/auth/me", { method: "GET" });

    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/me",
      expect.objectContaining({
        method: "GET",
        credentials: "include",
      })
    );

    const [, requestInit] = vi.mocked(fetch).mock.calls[0];
    const headers = requestInit?.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it("adds json content-type when request body is present", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await apiClient<{ ok: boolean }>("/api/courses", {
      method: "POST",
      body: JSON.stringify({ title: "New Course" }),
    });

    const [, requestInit] = vi.mocked(fetch).mock.calls[0];
    const headers = requestInit?.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("passes request signal through to fetch", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const controller = new AbortController();
    await apiClient<{ ok: boolean }>("/api/courses", {
      method: "GET",
      signal: controller.signal,
    });

    const [, requestInit] = vi.mocked(fetch).mock.calls[0];
    expect(requestInit?.signal).toBe(controller.signal);
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
