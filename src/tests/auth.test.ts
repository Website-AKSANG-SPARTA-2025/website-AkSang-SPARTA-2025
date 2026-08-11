import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let participant: { id: string; emailVerifiedAt: Date | null } | null = null;
const findUnique = vi.fn(async () => participant);

vi.mock("../lib/prisma", () => ({
  getPrisma: () => ({ participant: { findUnique } }),
}));

import { requireParticipant, requireVerifiedParticipant } from "../lib/auth";
import { createParticipantSession } from "../lib/session";

const originalSecret = process.env.SESSION_SECRET;
const originalTtl = process.env.SESSION_TTL_DAYS;

function requestWithToken(token?: string): Request {
  return new Request("https://app.example.test/protected", {
    headers: token ? { Cookie: `participant_session=${token}` } : {},
  });
}

beforeEach(() => {
  process.env.SESSION_SECRET = "12345678901234567890123456789012";
  process.env.SESSION_TTL_DAYS = "7";
  participant = null;
  findUnique.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  if (originalSecret === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = originalSecret;
  if (originalTtl === undefined) delete process.env.SESSION_TTL_DAYS;
  else process.env.SESSION_TTL_DAYS = originalTtl;
});

describe("verified participant resolution", () => {
  it("resolves a valid signed session before email verification", async () => {
    const token = await createParticipantSession("participant-1");
    const unverified = { id: "participant-1", emailVerifiedAt: null };
    participant = unverified;

    await expect(requireParticipant(requestWithToken(token))).resolves.toBe(
      unverified,
    );
    expect(findUnique).toHaveBeenCalledWith({ where: { id: "participant-1" } });
  });

  it("rejects absent and tampered sessions", async () => {
    await expect(
      requireVerifiedParticipant(requestWithToken()),
    ).rejects.toMatchObject({ status: 401 });

    const token = await createParticipantSession("participant-1");
    await expect(
      requireVerifiedParticipant(requestWithToken(`${token}x`)),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("rejects missing or unverified participants", async () => {
    const token = await createParticipantSession("participant-1");
    await expect(
      requireVerifiedParticipant(requestWithToken(token)),
    ).rejects.toMatchObject({ status: 401 });

    participant = { id: "participant-1", emailVerifiedAt: null };
    await expect(
      requireVerifiedParticipant(requestWithToken(token)),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("rejects an expired session before looking up a participant", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-11T00:00:00.000Z"));
    process.env.SESSION_TTL_DAYS = "1";
    const token = await createParticipantSession("participant-1");
    vi.setSystemTime(new Date("2026-08-12T00:00:00.000Z"));

    await expect(
      requireVerifiedParticipant(requestWithToken(token)),
    ).rejects.toMatchObject({ status: 401 });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("returns the exact verified participant from the trusted session ID", async () => {
    const token = await createParticipantSession("participant-1");
    const verified = {
      id: "participant-1",
      emailVerifiedAt: new Date("2026-08-11T00:00:00.000Z"),
    };
    participant = verified;

    await expect(
      requireVerifiedParticipant(requestWithToken(token)),
    ).resolves.toBe(verified);
    expect(findUnique).toHaveBeenCalledWith({ where: { id: "participant-1" } });
  });
});
