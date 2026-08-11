export function isDevelopmentApiTester(
  environment: string | undefined,
): boolean {
  return environment === "development";
}

export async function readApiResult(response: Response): Promise<{
  status: number;
  ok: boolean;
  body: unknown;
}> {
  const isJson = response.headers
    .get("content-type")
    ?.includes("application/json");

  return {
    status: response.status,
    ok: response.ok,
    body: isJson ? await response.json() : await response.text(),
  };
}

export function retryAfterFrom(body: unknown): number | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const errors = (body as { errors?: unknown }).errors;
  if (!errors || typeof errors !== "object" || Array.isArray(errors))
    return null;
  const retryAfter = (errors as { retryAfter?: unknown }).retryAfter;

  return typeof retryAfter === "number" &&
    Number.isFinite(retryAfter) &&
    retryAfter > 0
    ? retryAfter
    : null;
}
