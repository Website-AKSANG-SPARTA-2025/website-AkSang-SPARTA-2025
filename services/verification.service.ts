import type { Participant } from "../generated/prisma/client";
import { ApplicationError } from "../errors/application-error";
import {
  getAegisVerificationStatus,
  sendAegisVerification,
  type AegisSendResult,
} from "../lib/aegis-verification";
import { getPrisma } from "../lib/prisma";

import { normalizeEmail } from "./participant.service";

export type VerificationPurpose = "ATTENDANCE" | "WORKSHOP";

type VerificationParticipant = Pick<Participant, "id" | "email" | "emailVerifiedAt">;

export type VerificationStatus =
  | { verified: true; status: "verified"; verifiedAt: string }
  | {
      verified: false;
      status: "not_verified";
      registeredAt: string;
      linkActive: boolean;
      linkExpiresAt?: string;
    }
  | { verified: false; status: "not_registered" };

function verifiedAt(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApplicationError("EXTERNAL_PROVIDER_ERROR", 502, "Verification service is unavailable");
  }
  return date;
}

async function synchronizeVerifiedParticipant(participantId: string, value: string): Promise<void> {
  const timestamp = verifiedAt(value);

  await getPrisma().$transaction(async (transaction) => {
    await transaction.participant.updateMany({
      where: { id: participantId, emailVerifiedAt: null },
      data: { emailVerifiedAt: timestamp },
    });
    await transaction.attendance.updateMany({
      where: { participantId, status: "PENDING" },
      data: { status: "VERIFIED" },
    });
    await transaction.workshopRegistration.updateMany({
      where: { participantId, status: "PENDING" },
      data: { status: "ACTIVE" },
    });
  });
}

export async function sendVerification(
  participant: VerificationParticipant,
): Promise<AegisSendResult> {
  const result = await sendAegisVerification(participant.email);
  if (result.status === "already_verified") {
    await synchronizeVerifiedParticipant(participant.id, result.verifiedAt);
  }
  return result;
}

export async function getVerificationStatus(
  participant: VerificationParticipant,
): Promise<VerificationStatus> {
  if (participant.emailVerifiedAt) {
    return {
      verified: true,
      status: "verified",
      verifiedAt: participant.emailVerifiedAt.toISOString(),
    };
  }

  const result = await getAegisVerificationStatus(participant.email);
  if (result.status === "verified") {
    await synchronizeVerifiedParticipant(participant.id, result.verifiedAt);
    return { verified: true, status: "verified", verifiedAt: result.verifiedAt };
  }
  if (result.status === "not_verified") {
    return {
      verified: false,
      status: "not_verified",
      registeredAt: result.registeredAt,
      linkActive: result.linkActive,
      ...(result.linkExpiresAt ? { linkExpiresAt: result.linkExpiresAt } : {}),
    };
  }
  return { verified: false, status: "not_registered" };
}

export async function resendVerification(input: {
  email: string;
  purpose: VerificationPurpose;
}): Promise<AegisSendResult> {
  const email = normalizeEmail(input.email);
  const participant = await getPrisma().participant.findUnique({
    where: { email },
    include: { attendance: true, workshopRegistration: true },
  });

  if (!participant) throw new ApplicationError("NOT_FOUND", 404, "Participant not found");
  if (input.purpose === "ATTENDANCE") {
    if (!participant.attendance) throw new ApplicationError("NOT_FOUND", 404, "Attendance not found");
    if (participant.attendance.status === "VERIFIED") {
      throw new ApplicationError("CONFLICT", 409, "Attendance already verified");
    }
  } else if (!participant.workshopRegistration) {
    throw new ApplicationError("NOT_FOUND", 404, "Workshop registration not found");
  }

  return sendVerification(participant);
}
