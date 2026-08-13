import type { ApiErrorCode, ApiResponse } from "./types";

// The ONLY place fetch is called in this app. Base URL, credentials, and error mapping from
// the response envelope all live here — never call fetch/axios from a component.

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!BASE_URL) {
    throw new ApiError("INTERNAL", "NEXT_PUBLIC_API_URL is not set", 0);
  }

  const res = await fetch(`${BASE_URL}/api/v1${path}`, {
    ...init,
    credentials: "include", // session cookie is Domain=.nexashopping.in
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  let body: ApiResponse<T> | null = null;
  try {
    body = (await res.json()) as ApiResponse<T>;
  } catch {
    /* empty / non-JSON body handled below */
  }

  if (!res.ok || !body || body.success === false) {
    const err =
      body && body.success === false
        ? body.error
        : { code: "INTERNAL" as ApiErrorCode, message: res.statusText || "Request failed" };
    throw new ApiError(err.code, err.message, res.status, err.details);
  }

  return body.data;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: data === undefined ? undefined : JSON.stringify(data) }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: data === undefined ? undefined : JSON.stringify(data) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
