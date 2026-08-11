import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationError } from "../errors/application-error";

const boundaries = vi.hoisted(() => ({
  requireVerifiedParticipant: vi.fn(),
  confirmAttendanceForVerifiedParticipant: vi.fn(),
}));

vi.mock("../lib/auth", () => ({
  requireVerifiedParticipant: boundaries.requireVerifiedParticipant,
}));
vi.mock("../services/attendance.service", () => ({
  confirmAttendanceForVerifiedParticipant:
    boundaries.confirmAttendanceForVerifiedParticipant,
}));

import { POST as confirmRoute } from "../app/api/attendances/confirm/route";

function jsonRequest(body: unknown): Request {
  return new Request("https://app.example.test/api/attendances/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  boundaries.requireVerifiedParticipant.mockReset();
  boundaries.confirmAttendanceForVerifiedParticipant.mockReset();
  boundaries.requireVerifiedParticipant.mockResolvedValue({
    id: "participant-1",
  });
});

describe("verified Attendance confirmation route", () => {
  it("requires a verified session before trusting any confirmation", async () => {
    boundaries.requireVerifiedParticipant.mockRejectedValue(
      new ApplicationError("UNAUTHORIZED", 401, "Authentication required"),
    );

    const response = await confirmRoute(
      jsonRequest({ attendeeType: "PUBLIC" }),
    );

    expect(response.status).toBe(401);
    expect(
      boundaries.confirmAttendanceForVerifiedParticipant,
    ).not.toHaveBeenCalled();
  });

  it("rejects identity fields and incomplete student classification", async () => {
    const forgedIdentity = await confirmRoute(
      jsonRequest({ attendeeType: "PUBLIC", email: "forged@example.com" }),
    );
    const missingInstitution = await confirmRoute(
      jsonRequest({ attendeeType: "STUDENT" }),
    );

    expect(forgedIdentity.status).toBe(400);
    expect(missingInstitution.status).toBe(400);
    expect(
      boundaries.confirmAttendanceForVerifiedParticipant,
    ).not.toHaveBeenCalled();
  });

  it("creates a verified Attendance using only the trusted participant ID", async () => {
    boundaries.confirmAttendanceForVerifiedParticipant.mockResolvedValue({
      attendance: { id: "attendance-1", status: "VERIFIED" },
      created: true,
    });

    const response = await confirmRoute(
      jsonRequest({ attendeeType: "PUBLIC" }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({
      success: true,
      message: "Attendance confirmed",
      data: { attendanceId: "attendance-1", status: "VERIFIED" },
    });
    expect(
      boundaries.confirmAttendanceForVerifiedParticipant,
    ).toHaveBeenCalledWith("participant-1", {
      attendeeType: "PUBLIC",
    });
    expect(JSON.stringify(body)).not.toContain("participant-1");
  });

  it("returns 200 for a matching pending Attendance promotion and 409 for conflicts", async () => {
    boundaries.confirmAttendanceForVerifiedParticipant.mockResolvedValue({
      attendance: { id: "attendance-1", status: "VERIFIED" },
      created: false,
    });
    const promoted = await confirmRoute(
      jsonRequest({ attendeeType: "PUBLIC" }),
    );
    expect(promoted.status).toBe(200);

    boundaries.confirmAttendanceForVerifiedParticipant.mockRejectedValue(
      new ApplicationError(
        "CONFLICT",
        409,
        "Attendance classification does not match",
      ),
    );
    const conflict = await confirmRoute(
      jsonRequest({ attendeeType: "PUBLIC" }),
    );
    expect(conflict.status).toBe(409);
  });
});
