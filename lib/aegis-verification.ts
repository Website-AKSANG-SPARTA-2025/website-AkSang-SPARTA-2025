import { ApplicationError } from "../errors/application-error";

const defaultBaseUrl = "https://aegis-api.i-jer.com";

type JsonRecord = Record<string, unknown>;

export type AegisSendResult =
  | { status: "sent"; expiresAt: string }
  | { status: "already_verified"; verifiedAt: string };

export type AegisStatusResult =
  | { status: "verified"; verifiedAt: string }
  | {
      status: "not_verified";
      registeredAt: string;
      linkActive: boolean;
      linkExpiresAt?: string;
    }
  | { status: "not_registered" };

function unavailable(): ApplicationError {
  return new ApplicationError("EXTERNAL_PROVIDER_ERROR", 502, "Verification service is unavailable");
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function timestamp(record: JsonRecord, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;
}

function verificationEndpoint(): string {
  const configured = process.env.AEGIS_VERIFICATION_BASE_URL?.trim();

  try {
    return new URL("/api/verification", configured || defaultBaseUrl).toString();
  } catch {
    throw unavailable();
  }
}

function apiKeyHeader(): Record<string, string> {
  const apiKey = process.env.AEGIS_VERIFICATION_API_KEY?.trim();
  return apiKey ? { "x-api-key": apiKey } : {};
}

function knownProviderError(body: unknown): ApplicationError {
  if (!isRecord(body) || body.status !== "error" || typeof body.error !== "string") return unavailable();

  if (body.error === "invalid_email") {
    return new ApplicationError("VALIDATION_ERROR", 400, "Invalid email address");
  }
  if (body.error === "resend_too_soon") {
    const retryAfter = body.retryAfter;
    return new ApplicationError(
      "RATE_LIMITED",
      429,
      "Please wait before requesting another verification email",
      typeof retryAfter === "number" && Number.isFinite(retryAfter) && retryAfter >= 0
        ? { retryAfter }
        : undefined,
    );
  }
  if (body.error === "too_many_requests") {
    return new ApplicationError("RATE_LIMITED", 429, "Too many verification requests");
  }
  if (body.error === "email_send_failed") {
    return new ApplicationError("EXTERNAL_PROVIDER_ERROR", 502, "Verification email could not be sent");
  }

  return unavailable();
}

async function responseBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw unavailable();
  }
}

async function requestAegis(init: RequestInit): Promise<unknown> {
  try {
    const response = await fetch(verificationEndpoint(), init);
    const body = await responseBody(response);
    if (!response.ok) throw knownProviderError(body);
    return body;
  } catch (error) {
    if (error instanceof ApplicationError) throw error;
    throw unavailable();
  }
}

export async function sendAegisVerification(email: string): Promise<AegisSendResult> {
  const body = await requestAegis({
    method: "POST",
    headers: { "Content-Type": "application/json", ...apiKeyHeader() },
    body: JSON.stringify({ email }),
  });

  if (!isRecord(body)) throw unavailable();
  if (body.status === "sent") {
    const expiresAt = timestamp(body, "expiresAt");
    if (expiresAt) return { status: "sent", expiresAt };
  }
  if (body.status === "already_verified") {
    const verifiedAt = timestamp(body, "verifiedAt");
    if (verifiedAt) return { status: "already_verified", verifiedAt };
  }
  throw knownProviderError(body);
}

export async function getAegisVerificationStatus(email: string): Promise<AegisStatusResult> {
  const endpoint = new URL(verificationEndpoint());
  endpoint.searchParams.set("email", email);

  try {
    const response = await fetch(endpoint.toString(), { headers: apiKeyHeader() });
    const body = await responseBody(response);
    if (!response.ok) throw knownProviderError(body);
    if (!isRecord(body)) throw unavailable();

    if (body.status === "verified") {
      const verifiedAt = timestamp(body, "verifiedAt");
      if (verifiedAt) return { status: "verified", verifiedAt };
    }
    if (body.status === "not_verified") {
      const registeredAt = timestamp(body, "registeredAt");
      const expiresAt = body.linkExpiresAt === undefined ? undefined : timestamp(body, "linkExpiresAt");
      if (registeredAt && typeof body.linkActive === "boolean" && expiresAt !== null) {
        return {
          status: "not_verified",
          registeredAt,
          linkActive: body.linkActive,
          ...(expiresAt ? { linkExpiresAt: expiresAt } : {}),
        };
      }
    }
    if (body.status === "not_registered") return { status: "not_registered" };
    throw knownProviderError(body);
  } catch (error) {
    if (error instanceof ApplicationError) throw error;
    throw unavailable();
  }
}
