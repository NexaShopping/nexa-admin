import { tokenStore } from "./auth-store";
import type { ApiErrorCode, ApiResponse, PageMeta } from "./types";

// The ONLY place fetch is called in this app. Base URL, auth header, and error mapping from
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

async function requestFull<T>(path: string, init: RequestInit = {}): Promise<{ data: T; meta?: PageMeta }> {
  if (!BASE_URL) {
    throw new ApiError("INTERNAL", "NEXT_PUBLIC_API_URL is not set", 0);
  }

  const token = tokenStore.get();
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  const res = await fetch(`${BASE_URL}/api/v1${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

  return { data: body.data, meta: body.meta };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return (await requestFull<T>(path, init)).data;
}

// For endpoints that respond with a raw file (e.g. CSV/PDF exports) instead of the standard
// { success, data } JSON envelope — request() would fail trying to res.json() a CSV body.
async function download(path: string): Promise<Blob> {
  if (!BASE_URL) throw new ApiError("INTERNAL", "NEXT_PUBLIC_API_URL is not set", 0);
  const token = tokenStore.get();
  const res = await fetch(`${BASE_URL}/api/v1${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    let message = res.statusText || "Request failed";
    let code: ApiErrorCode = "INTERNAL";
    try {
      const body = (await res.json()) as ApiResponse<never>;
      if (body.success === false) { message = body.error.message; code = body.error.code; }
    } catch { /* non-JSON error body */ }
    throw new ApiError(code, message, res.status);
  }
  return res.blob();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  // Same as `get`, but also surfaces `meta` (cursor pagination) — for list endpoints.
  getPage: <T>(path: string) => requestFull<T>(path),
  download,
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: data === undefined ? undefined : JSON.stringify(data) }),
  postForm: <T>(path: string, data: FormData) => request<T>(path, { method: "POST", body: data }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: data === undefined ? undefined : JSON.stringify(data) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
