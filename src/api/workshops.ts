import { postJson } from "./client";

/** The Prisma CompetitionPath enum, mirrored for the client. */
export type CompetitionPath = "CTF" | "BCC" | "CP";

/**
 * Mirrors createWorkshopEnrollmentSchema in src/schemas.
 *
 * That schema is .strict() — any extra key is rejected outright rather than
 * ignored, so only these five fields may be sent.
 */
export type EnrollWorkshopInput = {
  name: string;
  email: string;
  competitionPath: CompetitionPath;
  /** ^\+?[0-9]{8,20}$ — digits only, optional leading +. */
  phoneNumber: string;
  nim?: string;
};

export type EnrollWorkshopData = {
  status: string;
  competitionPath: CompetitionPath;
  verifiedAt?: string;
};

/**
 * POST /api/workshops/enroll — the unauthenticated path, for someone
 * registering with their name and email.
 *
 * 200 — registration already existed, or the email was already verified.
 * 202 — created, and a verification email has been sent.
 */
export function enrollWorkshop(input: EnrollWorkshopInput) {
  return postJson<EnrollWorkshopData>("/api/workshops/enroll", input);
}
