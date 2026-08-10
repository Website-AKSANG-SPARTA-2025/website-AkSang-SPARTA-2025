import { createHash, randomBytes } from "node:crypto";

import type { VerificationPurpose as PrismaVerificationPurpose } from "../generated/prisma/client";
import { ApplicationError } from "../errors/application-error";
import { positiveIntegerEnv, requiredEnv } from "../lib/env";
import { getPrisma } from "../lib/prisma";

import { normalizeEmail } from "./participant.service";

export type VerificationPurpose = PrismaVerificationPurpose;

export type VerificationDispatch = {
  participantId: string;
  purpose: VerificationPurpose;
  verificationUrl: string;
};

function invalidVerification(): ApplicationError {
  return new ApplicationError("INVALID_VERIFICATION", 400, "Invalid verification link");
}

function tokenHash(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

function nextVerification(participantId: string, purpose: VerificationPurpose) {
  const rawToken = randomBytes(32).toString("base64url");
  const verificationUrl = new URL(
    `/api/verifications/verify?token=${encodeURIComponent(rawToken)}`,
    requiredEnv("APP_BASE_URL"),
  ).toString();
  const ttlMinutes = positiveIntegerEnv("EMAIL_VERIFICATION_TTL_MINUTES", 15);

  return {
    dispatch: { participantId, purpose, verificationUrl },
    data: {
      participantId,
      purpose,
      tokenHash: tokenHash(rawToken),
      expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
    },
  };
}

export async function createVerification(
  participantId: string,
  purpose: VerificationPurpose,
): Promise<VerificationDispatch> {
  const verification = nextVerification(participantId, purpose);
  await getPrisma().emailVerification.create({ data: verification.data });
  return verification.dispatch;
}

export async function verifyToken(
  rawToken: string,
): Promise<{ participantId: string; purpose: VerificationPurpose }> {
  if (!rawToken.trim()) throw invalidVerification();

  const now = new Date();
  const hash = tokenHash(rawToken);

  return getPrisma().$transaction(async (transaction) => {
    const verification = await transaction.emailVerification.findUnique({ where: { tokenHash: hash } });
    if (!verification || verification.verifiedAt) throw invalidVerification();
    if (verification.expiresAt.getTime() <= now.getTime()) {
      throw new ApplicationError("VERIFICATION_EXPIRED", 410, "Verification link has expired");
    }

    const consumed = await transaction.emailVerification.updateMany({
      where: { id: verification.id, verifiedAt: null },
      data: { verifiedAt: now },
    });
    if (!consumed.count) throw invalidVerification();

    await transaction.participant.updateMany({
      where: { id: verification.participantId, emailVerifiedAt: null },
      data: { emailVerifiedAt: now },
    });

    if (verification.purpose === "ATTENDANCE") {
      await transaction.attendance.updateMany({
        where: { participantId: verification.participantId, status: "PENDING" },
        data: { status: "VERIFIED" },
      });
    } else {
      await transaction.workshopRegistration.updateMany({
        where: { participantId: verification.participantId, status: "PENDING" },
        data: { status: "ACTIVE" },
      });
    }

    return { participantId: verification.participantId, purpose: verification.purpose };
  });
}

export async function resendVerification(input: {
  email: string;
  purpose: VerificationPurpose;
}): Promise<VerificationDispatch & { participantName: string; email: string }> {
  const prisma = getPrisma();
  const email = normalizeEmail(input.email);
  const participant = await prisma.participant.findUnique({
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

  const now = new Date();
  const cooldownSeconds = positiveIntegerEnv("EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS", 60);
  const latest = await prisma.emailVerification.findFirst({
    where: { participantId: participant.id, purpose: input.purpose },
    orderBy: { createdAt: "desc" },
  });
  if (latest && latest.createdAt.getTime() + cooldownSeconds * 1_000 > now.getTime()) {
    throw new ApplicationError("RATE_LIMITED", 429, "Please wait before requesting another verification link");
  }

  const verification = nextVerification(participant.id, input.purpose);
  await prisma.$transaction(async (transaction) => {
    await transaction.emailVerification.deleteMany({
      where: { participantId: participant.id, purpose: input.purpose, verifiedAt: null },
    });
    await transaction.emailVerification.create({ data: verification.data });
  });

  return { ...verification.dispatch, participantName: participant.name, email: participant.email };
}
