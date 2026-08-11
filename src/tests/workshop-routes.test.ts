import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationError } from "../errors/application-error";

const boundaries = vi.hoisted(() => ({
  requireVerifiedParticipant: vi.fn(),
  registerParticipant: vi.fn(),
}));

vi.mock("../lib/auth", () => ({
  requireVerifiedParticipant: boundaries.requireVerifiedParticipant,
}));
vi.mock("../services/workshop.service", () => ({
  registerParticipant: boundaries.registerParticipant,
}));

import { POST } from "../app/api/workshops/register/route";

function jsonRequest(body: unknown): Request {
  return new Request("https://app.example.test/api/workshops/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  boundaries.requireVerifiedParticipant.mockReset();
  boundaries.registerParticipant.mockReset();
  boundaries.requireVerifiedParticipant.mockResolvedValue({
    id: "participant-1",
  });
});

describe("workshop activation route", () => {
  it("requires a verified session", async () => {
    boundaries.requireVerifiedParticipant.mockRejectedValue(
      new ApplicationError("UNAUTHORIZED", 401, "Authentication required"),
    );

    const response = await POST(
      jsonRequest({ competitionPath: "CTF", phoneNumber: "+62812345678" }),
    );

    expect(response.status).toBe(401);
    expect(boundaries.registerParticipant).not.toHaveBeenCalled();
  });

  it("rejects forged identity fields and invalid registration data", async () => {
    const forged = await POST(
      jsonRequest({
        competitionPath: "CTF",
        phoneNumber: "+62812345678",
        name: "forged",
      }),
    );
    const invalid = await POST(jsonRequest({ competitionPath: "CTF" }));

    expect(forged.status).toBe(400);
    expect(invalid.status).toBe(400);
    expect(boundaries.registerParticipant).not.toHaveBeenCalled();
  });

  it("activates workshop registration with trusted identity only", async () => {
    boundaries.registerParticipant.mockResolvedValue({
      id: "registration-1",
      competitionPath: "CTF",
    });

    const response = await POST(
      jsonRequest({ competitionPath: "CTF", phoneNumber: "+62812345678" }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({
      success: true,
      message: "Workshop registration successful",
      data: {
        id: "registration-1",
        competitionPath: "CTF",
        invitationAvailable: true,
      },
    });
    expect(boundaries.registerParticipant).toHaveBeenCalledWith(
      "participant-1",
      {
        competitionPath: "CTF",
        phoneNumber: "+62812345678",
      },
    );
    expect(JSON.stringify(body)).not.toContain("participant-1");
  });

  it("maps an existing pending or active registration to conflict", async () => {
    boundaries.registerParticipant.mockRejectedValue(
      new ApplicationError(
        "CONFLICT",
        409,
        "Workshop participant already registered",
      ),
    );

    const response = await POST(
      jsonRequest({ competitionPath: "CTF", phoneNumber: "+62812345678" }),
    );

    expect(response.status).toBe(409);
  });
});
