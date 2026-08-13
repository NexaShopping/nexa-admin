// Response types, hand-written from nexa-docs/docs/API.md. This is the ONLY place API
// response types live in this repo. Adding a field is safe; a rename/removal in API.md means
// updating it here too. Endpoint-specific types are added as endpoints are built (Phase 1+).

export interface PageMeta {
  cursor?: string;
  hasMore: boolean;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PageMeta;
}

// Stable SCREAMING_SNAKE codes from API.md. Panels switch on `code`, never on `message`.
export type ApiErrorCode =
  | "VALIDATION_FAILED"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "BUSINESS_RULE_FAILED"
  | "RATE_LIMITED"
  | "INTERNAL"
  // tolerate codes added server-side before this file catches up
  | (string & {});

export interface ApiErrorPayload {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
}

export interface ApiFailure {
  success: false;
  error: ApiErrorPayload;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
