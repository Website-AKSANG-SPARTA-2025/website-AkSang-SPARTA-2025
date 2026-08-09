import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationError } from "../errors/application-error";

const { findUniqueMock, readParticipantSessionMock } = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
  readParticipantSessionMock: vi.fn(),
}));

// BE-06A owns lib/session.ts and has not implemented it yet. Mocking the
// module lets requireVerifiedParticipant be tested in isolation against the
// documented `{ participantId } | null` contract instead of BE-06A's
// unfinished signature/expiry implementation.
vi.mock("../lib/session", () => ({
  readParticipantSession: readParticipantSessionMock,
}));

vi.mock("../lib/prisma", () => ({
  prisma: {
    participant: {
      findUnique: findUniqueMock,
    },
  },
}));

const { requireVerifiedParticipant } = await import("../lib/auth");

function buildRequest(): Request {
  return new Request("http://localhost/api/rsvps/confirm", { method: "POST" });
}

describe("BE-06B requireVerifiedParticipant", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
    readParticipantSessionMock.mockReset();
  });

  it("rejects a request with no resolvable session", async () => {
    readParticipantSessionMock.mockResolvedValue(null);

    await expect(requireVerifiedParticipant(buildRequest())).rejects.toMatchObject({
      status: 401,
    });
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("rejects a session whose participant no longer exists", async () => {
    readParticipantSessionMock.mockResolvedValue({ participantId: "missing-participant" });
    findUniqueMock.mockResolvedValue(null);

    await expect(requireVerifiedParticipant(buildRequest())).rejects.toBeInstanceOf(
      ApplicationError,
    );
  });

  it("rejects a session for an existing but unverified participant", async () => {
    readParticipantSessionMock.mockResolvedValue({ participantId: "participant-1" });
    findUniqueMock.mockResolvedValue({
      id: "participant-1",
      name: "Ada Lovelace",
      email: "ada@example.com",
      emailVerifiedAt: null,
    });

    await expect(requireVerifiedParticipant(buildRequest())).rejects.toMatchObject({
      status: 401,
    });
  });

  it("resolves the trusted participant for a verified session", async () => {
    const participant = {
      id: "participant-1",
      name: "Ada Lovelace",
      email: "ada@example.com",
      emailVerifiedAt: new Date("2026-08-09T00:00:00Z"),
    };
    readParticipantSessionMock.mockResolvedValue({ participantId: "participant-1" });
    findUniqueMock.mockResolvedValue(participant);

    await expect(requireVerifiedParticipant(buildRequest())).resolves.toEqual(participant);
    expect(findUniqueMock).toHaveBeenCalledWith({ where: { id: "participant-1" } });
  });

  it("never authorizes from a client-supplied participant id", async () => {
    readParticipantSessionMock.mockResolvedValue({ participantId: "participant-1" });
    findUniqueMock.mockResolvedValue({
      id: "participant-1",
      name: "Ada Lovelace",
      email: "ada@example.com",
      emailVerifiedAt: new Date("2026-08-09T00:00:00Z"),
    });

    const request = new Request("http://localhost/api/rsvps/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ participantId: "attacker-supplied-id" }),
    });

    await requireVerifiedParticipant(request);

    expect(readParticipantSessionMock).toHaveBeenCalledWith(request);
    expect(findUniqueMock).toHaveBeenCalledWith({ where: { id: "participant-1" } });
  });
});
