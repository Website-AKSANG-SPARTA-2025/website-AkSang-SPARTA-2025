import { ApplicationError } from "../errors/application-error";
import type { Participant, Rsvp } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { findOrCreateParticipant } from "./participant.service";

export interface CreateRsvpResult {
  rsvp: Rsvp;
  participant: Participant;
  isExisting: boolean;
}

/**
 * Primitive function to create or get an RSVP for a participant.
 * Normalizes input, creates/reuses Participant, and manages RSVP creation.
 */
export async function createRsvp(data: {
  name: string;
  email: string;
}): Promise<CreateRsvpResult> {
  const participant = await findOrCreateParticipant(data);

  const existingRsvp = await prisma.rsvp.findUnique({
    where: { participantId: participant.id },
  });

  if (existingRsvp) {
    if (existingRsvp.status === "VERIFIED") {
      throw new ApplicationError("CONFLICT", 409, "RSVP has already been verified");
    }
    return {
      rsvp: existingRsvp,
      participant,
      isExisting: true,
    };
  }

  const rsvp = await prisma.rsvp.create({
    data: {
      participantId: participant.id,
      status: "PENDING",
    },
  });

  return {
    rsvp,
    participant,
    isExisting: false,
  };
}

export const createOrGetPendingRsvp = createRsvp;

/**
 * Confirms RSVP status to VERIFIED for an authenticated, verified participant.
 */
export async function confirmRsvpForVerifiedParticipant(
  participantId: string,
): Promise<Rsvp> {
  const existingRsvp = await prisma.rsvp.findUnique({
    where: { participantId },
  });

  if (!existingRsvp) {
    return prisma.rsvp.create({
      data: {
        participantId,
        status: "VERIFIED",
      },
    });
  }

  if (existingRsvp.status === "VERIFIED") {
    throw new ApplicationError("CONFLICT", 409, "RSVP has already been confirmed");
  }

  return prisma.rsvp.update({
    where: { id: existingRsvp.id },
    data: { status: "VERIFIED" },
  });
}

/**
 * Query helper to find RSVP by participantId
 */
export async function findRsvpByParticipantId(participantId: string) {
  return prisma.rsvp.findUnique({
    where: { participantId },
    include: { participant: true },
  });
}

/**
 * Query helper to find RSVP by rsvp ID
 */
export async function findRsvpById(id: string) {
  return prisma.rsvp.findUnique({
    where: { id },
    include: { participant: true },
  });
}

/**
 * Query helper to find RSVP by participant email
 */
export async function findRsvpByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  return prisma.rsvp.findFirst({
    where: {
      participant: {
        email: normalizedEmail,
      },
    },
    include: { participant: true },
  });
}

/**
 * Query helper to list all RSVPs with participant details
 */
export async function getAllRsvps() {
  return prisma.rsvp.findMany({
    include: { participant: true },
    orderBy: { createdAt: "desc" },
  });
}

export const listRsvps = getAllRsvps;
