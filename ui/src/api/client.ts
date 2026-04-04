// Base API client with common fetch configuration
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export class ApiError extends Error {
  status: number;
  statusText: string;
  details?: unknown;

  constructor(message: string, status: number, statusText: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.statusText = statusText;
    this.details = details;
  }
}

const parseResponseBody = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json().catch(() => undefined);
  }

  const text = await response.text();
  return text || undefined;
};

export const apiClient = async <T>(
  url: string,
  options?: RequestInit
): Promise<T> => {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await parseResponseBody(response);
    const errorMessage =
      typeof errorBody === "object" &&
      errorBody !== null &&
      "message" in errorBody &&
      typeof (errorBody as { message?: unknown }).message === "string"
        ? (errorBody as { message: string }).message
        : `Request failed: ${response.status} ${response.statusText}`;

    throw new ApiError(errorMessage, response.status, response.statusText, errorBody);
  }

  const body = await parseResponseBody(response);
  if (typeof body === "undefined") {
    return undefined as T;
  }

  return body as T;
};
