import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearParticipantSessionCookie,
  createParticipantSession,
  readParticipantSession,
  setParticipantSessionCookie,
} from "../lib/session";

const originalSecret = process.env.SESSION_SECRET;
const originalTtl = process.env.SESSION_TTL_DAYS;
const originalNodeEnv = process.env.NODE_ENV;

function requestWithToken(token: string): Request {
  return new Request("https://app.example.test/protected", {
    headers: { Cookie: `other=value; participant_session=${token}` },
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-11T00:00:00.000Z"));
  process.env.SESSION_SECRET = "12345678901234567890123456789012";
  process.env.SESSION_TTL_DAYS = "7";
  Reflect.set(process.env, "NODE_ENV", "test");
});

afterEach(() => {
  vi.useRealTimers();
  if (originalSecret === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = originalSecret;
  if (originalTtl === undefined) delete process.env.SESSION_TTL_DAYS;
  else process.env.SESSION_TTL_DAYS = originalTtl;
  if (originalNodeEnv === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
  else Reflect.set(process.env, "NODE_ENV", originalNodeEnv);
});

describe("participant sessions", () => {
  it("signs a payload containing only participantId and exp", async () => {
    const token = await createParticipantSession("participant-1");
    const [payload] = token.split(".");
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));

    expect(token.split(".")).toHaveLength(2);
    expect(decoded).toEqual({ participantId: "participant-1", exp: 1787011200 });
    await expect(readParticipantSession(requestWithToken(token))).resolves.toEqual(decoded);
    await expect(readParticipantSession(requestWithToken(`${token}x`))).resolves.toBeNull();
  });

  it("rejects expired and malformed session values", async () => {
    process.env.SESSION_TTL_DAYS = "1";
    const token = await createParticipantSession("participant-1");
    vi.setSystemTime(new Date("2026-08-12T00:00:00.000Z"));

    await expect(readParticipantSession(requestWithToken(token))).resolves.toBeNull();
    await expect(readParticipantSession(new Request("https://app.example.test"))).resolves.toBeNull();
    await expect(
      readParticipantSession(
        new Request("https://app.example.test", { headers: { Cookie: "participant_session=not-a-token" } }),
      ),
    ).resolves.toBeNull();
  });

  it("sets and clears the approved cookie attributes", async () => {
    const localResponse = await setParticipantSessionCookie(new Response(), "participant-1");
    const localCookie = localResponse.headers.get("set-cookie")!;

    expect(localCookie).toContain("participant_session=");
    expect(localCookie).toContain("HttpOnly");
    expect(localCookie).toContain("SameSite=Lax");
    expect(localCookie).toContain("Path=/");
    expect(localCookie).toContain("Max-Age=604800");
    expect(localCookie).not.toContain("Secure");

    Reflect.set(process.env, "NODE_ENV", "production");
    const productionResponse = await setParticipantSessionCookie(new Response(), "participant-1");
    expect(productionResponse.headers.get("set-cookie")).toContain("Secure");

    const cleared = clearParticipantSessionCookie(new Response());
    expect(cleared.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
