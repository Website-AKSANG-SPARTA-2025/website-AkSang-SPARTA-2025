import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationError } from "../errors/application-error";

const boundaries = vi.hoisted(() => ({
  requireParticipant: vi.fn(),
}));

vi.mock("../lib/auth", () => ({
  requireParticipant: boundaries.requireParticipant,
}));

import { GET as getCurrentParticipant } from "../app/api/auth/me/route";
import { POST as logout } from "../app/api/auth/logout/route";

beforeEach(() => {
  boundaries.requireParticipant.mockReset();
});

describe("production-safe auth routes", () => {
  it("returns the local participant represented by a valid session without checking Aegis", async () => {
    boundaries.requireParticipant.mockResolvedValue({
      id: "participant-1",
      name: "Ada Lovelace",
      email: "ada@example.com",
      emailVerifiedAt: new Date("2026-08-11T00:00:00.000Z"),
    });

    const response = await getCurrentParticipant(new Request("https://app.example.test/api/auth/me"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: {
        participant: {
          id: "participant-1",
          name: "Ada Lovelace",
          email: "ada@example.com",
          verified: true,
          verifiedAt: "2026-08-11T00:00:00.000Z",
        },
      },
    });
    expect(boundaries.requireParticipant).toHaveBeenCalledWith(expect.any(Request));
  });

  it("returns the existing authentication error when no valid session is present", async () => {
    boundaries.requireParticipant.mockRejectedValue(
      new ApplicationError("UNAUTHORIZED", 401, "Authentication required"),
    );

    const response = await getCurrentParticipant(new Request("https://app.example.test/api/auth/me"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ success: false, message: "Authentication required" });
  });

  it("clears the participant cookie even when logout is called without a session", async () => {
    const response = await logout();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, message: "Logged out", data: {} });
    expect(response.headers.get("set-cookie")).toContain("participant_session=;");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
