import { ApplicationError } from "../errors/application-error";
import type { Rsvp } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { findOrCreateParticipant } from "./participant.service";

export type CreateRsvpResult = {
  participantId: string;
  rsvpId: string;
  status: "PENDING";
  isNew: boolean;
};

export type ConfirmRsvpResult = {
  rsvpId: string;
  status: "VERIFIED";
  created: boolean;
};

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

function assertRsvpNotVerified(rsvp: Rsvp | null): void {
  if (rsvp?.status === "VERIFIED") {
    throw new ApplicationError("CONFLICT", 409, "RSVP already verified");
  }
}

/**
 * Returns the participant's PENDING RSVP, creating one when absent.
 * An existing VERIFIED RSVP is a conflict: one participant may RSVP once.
 */
export async function createOrGetPendingRsvp(
  participantId: string,
): Promise<{ rsvp: Rsvp; isNew: boolean }> {
  const existing = await prisma.rsvp.findUnique({ where: { participantId } });
  assertRsvpNotVerified(existing);
  if (existing) {
    return { rsvp: existing, isNew: false };
  }

  try {
    const rsvp = await prisma.rsvp.create({
      data: { participantId, status: "PENDING" },
    });
    return { rsvp, isNew: true };
  } catch (error) {
    // Concurrent requests may race on the unique participantId; rely on the
    // database constraint and fall back to reading the winning row.
    if (isUniqueConstraintViolation(error)) {
      const rsvp = await prisma.rsvp.findUnique({ where: { participantId } });
      assertRsvpNotVerified(rsvp);
      if (rsvp) {
        return { rsvp, isNew: false };
      }
    }
    throw error;
  }
}

/**
 * Public RSVP entry: reuses the shared Participant identity (BE-03A) and
 * creates or returns the single PENDING RSVP for the participant.
 * Name/email normalization is owned by findOrCreateParticipant.
 */
export async function createRsvp(input: {
  name: string;
  email: string;
}): Promise<CreateRsvpResult> {
  const participant = await findOrCreateParticipant(input);
  const { rsvp, isNew } = await createOrGetPendingRsvp(participant.id);
  return {
    participantId: participant.id,
    rsvpId: rsvp.id,
    status: "PENDING",
    isNew,
  };
}

/**
 * Session-based confirmation, consumed by BE-06 through POST /api/rsvps/confirm.
 * Creates a VERIFIED RSVP when absent, promotes an existing PENDING one, and
 * rejects an already VERIFIED RSVP with a conflict. Never accepts identity.
 */
export async function confirmRsvpForVerifiedParticipant(
  participantId: string,
): Promise<ConfirmRsvpResult> {
  const existing = await prisma.rsvp.findUnique({ where: { participantId } });
  assertRsvpNotVerified(existing);

  if (existing) {
    const promoted = await prisma.rsvp.update({
      where: { id: existing.id },
      data: { status: "VERIFIED" },
    });
    return { rsvpId: promoted.id, status: "VERIFIED", created: false };
  }

  const created = await prisma.rsvp.create({
    data: { participantId, status: "VERIFIED" },
  });
  return { rsvpId: created.id, status: "VERIFIED", created: true };
}
