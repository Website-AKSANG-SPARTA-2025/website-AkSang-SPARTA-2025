import { positiveIntegerEnv, requiredEnv } from "./env";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const cookieName = "participant_session";

export type ParticipantSession = { participantId: string; exp: number };

function sessionTtlDays(): number {
  return positiveIntegerEnv("SESSION_TTL_DAYS", 7);
}

async function sessionKey(): Promise<CryptoKey> {
  const secret = encoder.encode(requiredEnv("SESSION_SECRET"));
  if (secret.byteLength < 32)
    throw new Error("SESSION_SECRET must be at least 32 bytes");
  return crypto.subtle.importKey(
    "raw",
    secret,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function encodeBase64Url(value: Uint8Array): string {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value: string): ArrayBuffer | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  return Uint8Array.from(Buffer.from(value, "base64url")).buffer;
}

function isParticipantSession(value: unknown): value is ParticipantSession {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    Object.keys(record).length === 2 &&
    typeof record.participantId === "string" &&
    Boolean(record.participantId) &&
    typeof record.exp === "number" &&
    Number.isSafeInteger(record.exp)
  );
}

function sessionToken(request: Request): string | null {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;
  return (
    cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${cookieName}=`))
      ?.slice(cookieName.length + 1) ?? null
  );
}

function cookieAttributes(maxAge: number): string {
  return `HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

export async function createParticipantSession(
  participantId: string,
): Promise<string> {
  const payload = encodeBase64Url(
    encoder.encode(
      JSON.stringify({
        participantId,
        exp: Math.floor(Date.now() / 1_000) + sessionTtlDays() * 86_400,
      }),
    ),
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    await sessionKey(),
    encoder.encode(payload),
  );
  return `${payload}.${encodeBase64Url(new Uint8Array(signature))}`;
}

export async function readParticipantSession(
  request: Request,
): Promise<ParticipantSession | null> {
  const token = sessionToken(request);
  if (!token) return null;

  const [payload, signature, extra] = token.split(".");
  const signatureBytes = signature ? decodeBase64Url(signature) : null;
  if (!payload || !signatureBytes || extra !== undefined) return null;

  const key = await sessionKey();
  try {
    if (
      !(await crypto.subtle.verify(
        "HMAC",
        key,
        signatureBytes,
        encoder.encode(payload),
      ))
    )
      return null;
    const payloadBytes = decodeBase64Url(payload);
    if (!payloadBytes) return null;
    const parsed: unknown = JSON.parse(decoder.decode(payloadBytes));
    if (
      !isParticipantSession(parsed) ||
      parsed.exp <= Math.floor(Date.now() / 1_000)
    )
      return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function setParticipantSessionCookie(
  response: Response,
  participantId: string,
): Promise<Response> {
  const maxAge = sessionTtlDays() * 86_400;
  response.headers.append(
    "Set-Cookie",
    `${cookieName}=${await createParticipantSession(participantId)}; ${cookieAttributes(maxAge)}`,
  );
  return response;
}

export function clearParticipantSessionCookie(response: Response): Response {
  response.headers.append(
    "Set-Cookie",
    `${cookieName}=; ${cookieAttributes(0)}`,
  );
  return response;
}
