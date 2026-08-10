import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationError } from "../errors/application-error";

const { createRsvpMock, dispatchVerificationLinkMock } = vi.hoisted(() => ({
  createRsvpMock: vi.fn(),
  dispatchVerificationLinkMock: vi.fn(),
}));

vi.mock("../services/rsvp.service", () => ({ createRsvp: createRsvpMock }));
vi.mock("../services/verification-dispatch", () => ({
  dispatchVerificationLink: dispatchVerificationLinkMock,
}));

import { POST } from "../app/api/rsvps/route";

function post(body: unknown): Request {
  return new Request("http://localhost/api/rsvps", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  createRsvpMock.mockResolvedValue({
    participantId: "participant-1",
    rsvpId: "rsvp-1",
    status: "PENDING",
    isNew: true,
  });
  dispatchVerificationLinkMock.mockResolvedValue(undefined);
});

describe("POST /api/rsvps", () => {
  it("returns 202 with the pending RSVP for a new participant", async () => {
    const response = await POST(post({ name: "Ada Lovelace", email: "ada@example.com" }));

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({
      success: true,
      message: "Verification link has been sent to your email",
      data: { rsvpId: "rsvp-1", status: "PENDING" },
    });
  });

  it("dispatches the RSVP-purpose verification seam with the trusted participant id", async () => {
    await POST(post({ name: "Ada Lovelace", email: "ada@example.com" }));

    expect(dispatchVerificationLinkMock).toHaveBeenCalledWith({
      participantId: "participant-1",
      purpose: "RSVP",
    });
  });

  it("returns 200 with the existing pending RSVP and no new link message", async () => {
    createRsvpMock.mockResolvedValue({
      participantId: "participant-1",
      rsvpId: "rsvp-1",
      status: "PENDING",
      isNew: false,
    });

    const response = await POST(post({ name: "Ada Lovelace", email: "ada@example.com" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      message: "RSVP is awaiting verification",
      data: { rsvpId: "rsvp-1", status: "PENDING" },
    });
  });

  it("maps an existing VERIFIED RSVP to 409 conflict", async () => {
    createRsvpMock.mockRejectedValue(
      new ApplicationError("CONFLICT", 409, "RSVP already verified"),
    );

    const response = await POST(post({ name: "Ada Lovelace", email: "ada@example.com" }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      success: false,
      message: "RSVP already verified",
    });
  });

  it("rejects an invalid payload with 400 and validation details", async () => {
    const response = await POST(post({ name: "A", email: "not-an-email" }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe("Invalid request payload");
    expect(body.errors.fieldErrors.name).toBeDefined();
    expect(body.errors.fieldErrors.email).toBeDefined();
  });

  it("rejects extra fields through the strict schema", async () => {
    const response = await POST(
      post({ name: "Ada Lovelace", email: "ada@example.com", participantId: "x" }),
    );

    expect(response.status).toBe(400);
    expect((await response.json()).message).toBe("Invalid request payload");
  });

  it("maps malformed JSON to a 400 validation error", async () => {
    const response = await POST(post("{not-json"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      message: "Invalid request payload",
    });
  });

  it("never calls the service or seam for malformed payloads", async () => {
    await POST(post({ name: "A", email: "bad" }));

    expect(createRsvpMock).not.toHaveBeenCalled();
    expect(dispatchVerificationLinkMock).not.toHaveBeenCalled();
  });
});
