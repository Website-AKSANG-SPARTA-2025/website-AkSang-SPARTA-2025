import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationError } from "../errors/application-error";

const boundaries = vi.hoisted(() => ({
  createAttendance: vi.fn(),
  enrollWorkshop: vi.fn(),
  sendVerification: vi.fn(),
}));

vi.mock("../services/attendance.service", () => ({ createAttendance: boundaries.createAttendance }));
vi.mock("../services/workshop.service", () => ({ enrollWorkshop: boundaries.enrollWorkshop }));
vi.mock("../services/verification.service", () => ({
  sendVerification: boundaries.sendVerification,
}));

import { POST as createAttendanceRoute } from "../app/api/attendances/route";
import { POST as enrollWorkshopRoute } from "../app/api/workshops/enroll/route";

const attendanceInput = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  attendeeType: "PUBLIC",
};
const workshopInput = {
  name: "Grace Hopper",
  email: "grace@example.com",
  competitionPath: "CTF",
  phoneNumber: "+62812345678",
};
const attendanceResult = {
  participant: { id: "participant-1", name: "Ada Lovelace", email: "ada@example.com", emailVerifiedAt: null },
  attendance: { id: "attendance-1", status: "PENDING" },
  created: true,
};
const workshopResult = {
  participant: { id: "participant-2", name: "Grace Hopper", email: "grace@example.com", emailVerifiedAt: null },
  registration: { id: "registration-1", status: "PENDING", competitionPath: "CTF" },
  created: true,
};

function jsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  boundaries.createAttendance.mockReset();
  boundaries.enrollWorkshop.mockReset();
  boundaries.sendVerification.mockReset();
  boundaries.sendVerification.mockResolvedValue({
    status: "sent",
    expiresAt: "2026-08-11T01:00:00.000Z",
  });
});

describe("public entry routes", () => {
  it("creates unverified pending Attendance and asks Aegis to send its verification email", async () => {
    boundaries.createAttendance.mockResolvedValue(attendanceResult);

    const response = await createAttendanceRoute(
      jsonRequest("https://app.example.test/api/attendances", attendanceInput),
    );
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body).toEqual({
      success: true,
      message: "Verification email has been sent",
      data: { attendanceId: "attendance-1", status: "PENDING" },
    });
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(boundaries.sendVerification).toHaveBeenCalledWith(attendanceResult.participant);
  });

  it("keeps an existing pending Attendance without requesting another Aegis email", async () => {
    boundaries.createAttendance.mockResolvedValue({ ...attendanceResult, created: false });

    const response = await createAttendanceRoute(
      jsonRequest("https://app.example.test/api/attendances", attendanceInput),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      message: "Attendance is awaiting verification",
      data: { attendanceId: "attendance-1", status: "PENDING" },
    });
    expect(boundaries.sendVerification).not.toHaveBeenCalled();
  });

  it("keeps new Attendance pending when Aegis delivery is unavailable", async () => {
    boundaries.createAttendance.mockResolvedValue(attendanceResult);
    boundaries.sendVerification.mockRejectedValue(
      new ApplicationError("EXTERNAL_PROVIDER_ERROR", 502, "Verification email could not be sent"),
    );

    const response = await createAttendanceRoute(
      jsonRequest("https://app.example.test/api/attendances", attendanceInput),
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      success: false,
      message: "Verification email could not be sent",
    });
    expect(boundaries.createAttendance).toHaveBeenCalledTimes(1);
  });

  it("returns a locally synchronized verified Attendance when Aegis already knows the email", async () => {
    boundaries.createAttendance.mockResolvedValue(attendanceResult);
    boundaries.sendVerification.mockResolvedValue({
      status: "already_verified",
      verifiedAt: "2026-08-11T01:00:00.000Z",
    });

    const response = await createAttendanceRoute(
      jsonRequest("https://app.example.test/api/attendances", attendanceInput),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      message: "Email is already verified",
      data: {
        attendanceId: "attendance-1",
        status: "VERIFIED",
        verifiedAt: "2026-08-11T01:00:00.000Z",
      },
    });
  });

  it("creates workshop enrollment and sends through Aegis without exposing a token", async () => {
    boundaries.enrollWorkshop.mockResolvedValue(workshopResult);

    const response = await enrollWorkshopRoute(
      jsonRequest("https://app.example.test/api/workshops/enroll", workshopInput),
    );
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body).toEqual({
      success: true,
      message: "Verification email has been sent",
      data: { status: "PENDING", competitionPath: "CTF" },
    });
    expect(JSON.stringify(body)).not.toMatch(/token|aegis-api/i);
    expect(boundaries.sendVerification).toHaveBeenCalledWith(workshopResult.participant);
  });
});
