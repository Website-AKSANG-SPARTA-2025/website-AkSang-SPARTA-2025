import { postJson } from "./client";

/** Mirrors createAttendanceSchema in src/schemas. */
export type CreateAttendanceInput = {
  name: string;
  email: string;
  attendeeType: "STUDENT" | "PUBLIC";
  /** Required by the schema when attendeeType is STUDENT. */
  institution?: string;
};

export type CreateAttendanceData = {
  attendanceId: string;
  status: string;
  verifiedAt?: string;
};

/**
 * POST /api/attendances
 *
 * 200 — attendance already existed, or the email was already verified.
 * 202 — created, and a verification email has been sent.
 */
export function createAttendance(input: CreateAttendanceInput) {
  return postJson<CreateAttendanceData>("/api/attendances", input);
}
