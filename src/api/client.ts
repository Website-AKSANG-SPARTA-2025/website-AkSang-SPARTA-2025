/**
 * Thin client for this app's own API routes.
 *
 * Every handler in src/app/api replies through src/lib/api.ts, so responses
 * always take one of two shapes:
 *
 *   { success: true,  message?: string, data: T }
 *   { success: false, message: string,  errors?: unknown }
 *
 * apiFetch collapses that into "resolve with data, or throw ApiError", so
 * callers only write a try/catch instead of re-checking `success` every time.
 */

export type ApiSuccess<T> = {
  success: true;
  message?: string;
  data: T;
};

export type ApiFailure = {
  success: false;
  message: string;
  errors?: unknown;
};

export class ApiError extends Error {
  readonly status: number;
  /** Field-level detail — zod's flattened error when validation failed. */
  readonly errors?: unknown;

  constructor(message: string, status: number, errors?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

export type ApiResult<T> = {
  data: T;
  /** Handlers use 202 to mean "accepted, verification email sent". */
  status: number;
  message?: string;
};

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  let response: Response;

  try {
    response = await fetch(path, { credentials: "include", ...init });
  } catch {
    // Offline, DNS failure, request aborted — never reached the server.
    throw new ApiError("Tidak dapat terhubung ke server", 0);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiError(
      `Respons server tidak valid (${response.status})`,
      response.status,
    );
  }

  if (!isEnvelope(body)) {
    throw new ApiError(
      `Respons server tidak dikenali (${response.status})`,
      response.status,
    );
  }

  if (!body.success) {
    throw new ApiError(body.message, response.status, body.errors);
  }

  return {
    data: body.data as T,
    status: response.status,
    message: body.message,
  };
}

export function postJson<T>(path: string, payload: unknown) {
  return apiFetch<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function isEnvelope(value: unknown): value is ApiSuccess<unknown> | ApiFailure {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  if (typeof record.success !== "boolean") return false;
  return record.success ? "data" in record : typeof record.message === "string";
}
