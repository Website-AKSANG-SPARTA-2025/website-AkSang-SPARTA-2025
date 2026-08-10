import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const boundaries = vi.hoisted(() => ({
  findUnique: vi.fn(),
  setParticipantSessionCookie: vi.fn(),
}));

vi.mock("../lib/prisma", () => ({
  getPrisma: () => ({ participant: { findUnique: boundaries.findUnique } }),
}));
vi.mock("../lib/session", () => ({
  setParticipantSessionCookie: boundaries.setParticipantSessionCookie,
}));

import { POST as createDevelopmentSession } from "../app/api/dev/auth/session/route";

const originalNodeEnv = process.env.NODE_ENV;
const originalDevAuthSecret = process.env.DEV_AUTH_TEST_SECRET;

function jsonRequest(body: unknown): Request {
  return new Request("https://app.example.test/api/dev/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  Reflect.set(process.env, "NODE_ENV", "development");
  process.env.DEV_AUTH_TEST_SECRET = "development-test-secret";
  boundaries.findUnique.mockReset();
  boundaries.setParticipantSessionCookie.mockReset();
  boundaries.setParticipantSessionCookie.mockImplementation(async (response: Response) => response);
});

afterEach(() => {
  if (originalNodeEnv === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
  else Reflect.set(process.env, "NODE_ENV", originalNodeEnv);
  if (originalDevAuthSecret === undefined) delete process.env.DEV_AUTH_TEST_SECRET;
  else process.env.DEV_AUTH_TEST_SECRET = originalDevAuthSecret;
});

describe("development session route", () => {
  it("does not exist outside development", async () => {
    Reflect.set(process.env, "NODE_ENV", "production");

    const response = await createDevelopmentSession(
      jsonRequest({ email: "ada@example.com", secret: "development-test-secret" }),
    );

    expect(response.status).toBe(404);
    expect(boundaries.findUnique).not.toHaveBeenCalled();
  });

  it("rejects an invalid testing secret before looking up an email", async () => {
    const response = await createDevelopmentSession(
      jsonRequest({ email: "ada@example.com", secret: "wrong-secret" }),
    );

    expect(response.status).toBe(401);
    expect(boundaries.findUnique).not.toHaveBeenCalled();
  });

  it("refuses to issue a session for an unverified participant", async () => {
    boundaries.findUnique.mockResolvedValue({ id: "participant-1", emailVerifiedAt: null });

    const response = await createDevelopmentSession(
      jsonRequest({ email: "ada@example.com", secret: "development-test-secret" }),
    );

    expect(response.status).toBe(403);
    expect(boundaries.setParticipantSessionCookie).not.toHaveBeenCalled();
  });

  it("sets the local session cookie only for a verified participant", async () => {
    boundaries.findUnique.mockResolvedValue({
      id: "participant-1",
      email: "ada@example.com",
      emailVerifiedAt: new Date("2026-08-11T00:00:00.000Z"),
    });

    const response = await createDevelopmentSession(
      jsonRequest({ email: "Ada@Example.com", secret: "development-test-secret" }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      message: "Development session created",
      data: { email: "ada@example.com" },
    });
    expect(boundaries.findUnique).toHaveBeenCalledWith({ where: { email: "ada@example.com" } });
    expect(boundaries.setParticipantSessionCookie).toHaveBeenCalledWith(expect.any(Response), "participant-1");
  });
});
