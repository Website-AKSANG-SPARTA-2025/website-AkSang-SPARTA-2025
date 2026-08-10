import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationError } from "../errors/application-error";

const { requireVerifiedParticipantMock, confirmRsvpForVerifiedParticipantMock } = vi.hoisted(
  () => ({
    requireVerifiedParticipantMock: vi.fn(),
    confirmRsvpForVerifiedParticipantMock: vi.fn(),
  }),
);

vi.mock("../lib/auth", () => ({
  requireVerifiedParticipant: requireVerifiedParticipantMock,
}));

vi.mock("../services/rsvp.service", () => ({
  confirmRsvpForVerifiedParticipant: confirmRsvpForVerifiedParticipantMock,
}));

const { POST } = await import("../app/api/rsvps/confirm/route");

function buildRequest(body: unknown): Request {
  return new Request("http://localhost/api/rsvps/confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("BE-06B POST /api/rsvps/confirm", () => {
  beforeEach(() => {
    requireVerifiedParticipantMock.mockReset();
    confirmRsvpForVerifiedParticipantMock.mockReset();
  });

  it("rejects a non-empty body before touching session or service", async () => {
    const response = await POST(buildRequest({ participantId: "attacker-supplied-id" }));

    expect(response.status).toBe(400);
    expect(requireVerifiedParticipantMock).not.toHaveBeenCalled();
    expect(confirmRsvpForVerifiedParticipantMock).not.toHaveBeenCalled();
  });

  it("propagates 401 from requireVerifiedParticipant without calling the service", async () => {
    requireVerifiedParticipantMock.mockRejectedValue(
      new ApplicationError("UNAUTHORIZED", 401, "Authentication required"),
    );

    const response = await POST(buildRequest({}));

    expect(response.status).toBe(401);
    expect(confirmRsvpForVerifiedParticipantMock).not.toHaveBeenCalled();
  });

  it("confirms RSVP for the session-resolved participant", async () => {
    requireVerifiedParticipantMock.mockResolvedValue({
      id: "participant-1",
      name: "Ada Lovelace",
      email: "ada@example.com",
      emailVerifiedAt: new Date("2026-08-09T00:00:00Z"),
    });
    confirmRsvpForVerifiedParticipantMock.mockResolvedValue({
      id: "rsvp-1",
      participantId: "participant-1",
      status: "VERIFIED",
    });

    const response = await POST(buildRequest({}));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({
      success: true,
      message: "RSVP confirmed",
      data: { rsvpId: "rsvp-1", status: "VERIFIED" },
    });
    expect(confirmRsvpForVerifiedParticipantMock).toHaveBeenCalledWith("participant-1");
  });

  it("returns 409 when the RSVP is already verified", async () => {
    requireVerifiedParticipantMock.mockResolvedValue({
      id: "participant-1",
      name: "Ada Lovelace",
      email: "ada@example.com",
      emailVerifiedAt: new Date("2026-08-09T00:00:00Z"),
    });
    confirmRsvpForVerifiedParticipantMock.mockRejectedValue(
      new ApplicationError("CONFLICT", 409, "RSVP has already been confirmed"),
    );

    const response = await POST(buildRequest({}));

    expect(response.status).toBe(409);
  });
});
