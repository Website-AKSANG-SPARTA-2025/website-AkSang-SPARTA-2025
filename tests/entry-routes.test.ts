import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationError } from "../errors/application-error";

const boundaries = vi.hoisted(() => ({
  createAttendance: vi.fn(),
  enrollWorkshop: vi.fn(),
  createVerification: vi.fn(),
  sendVerificationEmail: vi.fn(),
}));

vi.mock("../services/attendance.service", () => ({ createAttendance: boundaries.createAttendance }));
vi.mock("../services/workshop.service", () => ({ enrollWorkshop: boundaries.enrollWorkshop }));
vi.mock("../services/verification.service", () => ({ createVerification: boundaries.createVerification }));
vi.mock("../services/notification.service", () => ({
  sendVerificationEmail: boundaries.sendVerificationEmail,
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
  participant: { id: "participant-1", name: "Ada Lovelace", email: "ada@example.com" },
  attendance: { id: "attendance-1", status: "PENDING" },
  created: true,
};
const workshopResult = {
  participant: { id: "participant-2", name: "Grace Hopper", email: "grace@example.com" },
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
  boundaries.createVerification.mockReset();
  boundaries.sendVerificationEmail.mockReset();
  boundaries.createVerification.mockResolvedValue({
    participantId: "participant-1",
    purpose: "ATTENDANCE",
    verificationUrl: "https://app.example.test/api/verifications/verify?token=secret-token",
  });
});

describe("public entry routes", () => {
  it("creates Attendance, sends one ATTENDANCE email, and never exposes its token", async () => {
    boundaries.createAttendance.mockResolvedValue(attendanceResult);

    const response = await createAttendanceRoute(
      jsonRequest("https://app.example.test/api/attendances", attendanceInput),
    );
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body).toEqual({
      success: true,
      message: "Verification link has been sent to your email",
      data: { attendanceId: "attendance-1", status: "PENDING" },
    });
    expect(JSON.stringify(body)).not.toContain("secret-token");
    expect(boundaries.createVerification).toHaveBeenCalledWith("participant-1", "ATTENDANCE");
    expect(boundaries.sendVerificationEmail).toHaveBeenCalledWith({
      to: "ada@example.com",
      participantName: "Ada Lovelace",
      verificationUrl: "https://app.example.test/api/verifications/verify?token=secret-token",
      purpose: "ATTENDANCE",
    });
  });

  it("returns an existing pending Attendance without sending a replacement link", async () => {
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
    expect(boundaries.createVerification).not.toHaveBeenCalled();
    expect(boundaries.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("returns a safe provider failure after creating pending Attendance", async () => {
    boundaries.createAttendance.mockResolvedValue(attendanceResult);
    boundaries.sendVerificationEmail.mockRejectedValue(
      new ApplicationError("EXTERNAL_PROVIDER_ERROR", 502, "Unable to send verification email"),
    );

    const response = await createAttendanceRoute(
      jsonRequest("https://app.example.test/api/attendances", attendanceInput),
    );
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(JSON.stringify(body)).not.toContain("secret-token");
    expect(boundaries.createAttendance).toHaveBeenCalledTimes(1);
    expect(boundaries.createVerification).toHaveBeenCalledTimes(1);
  });

  it("maps a verified Attendance conflict and rejects invalid public input", async () => {
    boundaries.createAttendance.mockRejectedValue(
      new ApplicationError("CONFLICT", 409, "Attendance already verified"),
    );

    const conflict = await createAttendanceRoute(
      jsonRequest("https://app.example.test/api/attendances", attendanceInput),
    );
    expect(conflict.status).toBe(409);

    const invalid = await createAttendanceRoute(
      jsonRequest("https://app.example.test/api/attendances", { ...attendanceInput, participantId: "forged" }),
    );
    expect(invalid.status).toBe(400);
  });

  it("creates workshop enrollment with an isolated WORKSHOP verification email", async () => {
    boundaries.enrollWorkshop.mockResolvedValue(workshopResult);
    boundaries.createVerification.mockResolvedValue({
      participantId: "participant-2",
      purpose: "WORKSHOP",
      verificationUrl: "https://app.example.test/api/verifications/verify?token=workshop-secret",
    });

    const response = await enrollWorkshopRoute(
      jsonRequest("https://app.example.test/api/workshops/enroll", workshopInput),
    );
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body).toEqual({
      success: true,
      message: "Verification link has been sent to your email",
      data: { status: "PENDING", competitionPath: "CTF" },
    });
    expect(JSON.stringify(body)).not.toContain("workshop-secret");
    expect(boundaries.createAttendance).not.toHaveBeenCalled();
    expect(boundaries.createVerification).toHaveBeenCalledWith("participant-2", "WORKSHOP");
    expect(boundaries.sendVerificationEmail).toHaveBeenCalledWith({
      to: "grace@example.com",
      participantName: "Grace Hopper",
      verificationUrl: "https://app.example.test/api/verifications/verify?token=workshop-secret",
      purpose: "WORKSHOP",
    });
  });

  it("returns a pending workshop enrollment without overwriting or emailing it", async () => {
    boundaries.enrollWorkshop.mockResolvedValue({ ...workshopResult, created: false });

    const response = await enrollWorkshopRoute(
      jsonRequest("https://app.example.test/api/workshops/enroll", workshopInput),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      message: "Workshop registration is awaiting verification",
      data: { status: "PENDING", competitionPath: "CTF" },
    });
    expect(boundaries.createVerification).not.toHaveBeenCalled();
    expect(boundaries.sendVerificationEmail).not.toHaveBeenCalled();
  });
});
