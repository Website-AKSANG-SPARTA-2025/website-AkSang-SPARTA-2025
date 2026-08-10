import type { Participant, WorkshopRegistration } from "../generated/prisma/client";
import { ApplicationError } from "../errors/application-error";
import { getPrisma } from "../lib/prisma";

import { findOrCreateParticipant } from "./participant.service";

function isUniqueConflict(error: unknown): error is { code: "P2002" } {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function enrollWorkshop(input: {
  name: string;
  email: string;
  competitionPath: "CTF" | "BCC" | "CP";
  phoneNumber: string;
  nim?: string;
}): Promise<{ participant: Participant; registration: WorkshopRegistration; created: boolean }> {
  const participant = await findOrCreateParticipant(input);
  const prisma = getPrisma();
  const registration = await prisma.workshopRegistration.findUnique({
    where: { participantId: participant.id },
  });

  if (registration) {
    if (registration.status === "ACTIVE") {
      throw new ApplicationError("CONFLICT", 409, "Workshop registration already active");
    }
    return { participant, registration, created: false };
  }

  const created = await prisma.workshopRegistration.create({
    data: {
      participantId: participant.id,
      competitionPath: input.competitionPath,
      phoneNumber: input.phoneNumber,
      nim: input.nim ?? null,
      status: "PENDING",
    },
  });
  return { participant, registration: created, created: true };
}

export async function registerParticipant(
  participantId: string,
  input: { competitionPath: "CTF" | "BCC" | "CP"; phoneNumber: string; nim?: string },
): Promise<WorkshopRegistration> {
  try {
    return await getPrisma().workshopRegistration.create({
      data: {
        participantId,
        competitionPath: input.competitionPath,
        phoneNumber: input.phoneNumber,
        nim: input.nim ?? null,
        status: "ACTIVE",
      },
    });
  } catch (error) {
    if (isUniqueConflict(error)) {
      throw new ApplicationError("CONFLICT", 409, "Workshop participant already registered");
    }
    throw error;
  }
}

export async function findActiveRegistrationByParticipantId(
  participantId: string,
): Promise<WorkshopRegistration | null> {
  return getPrisma().workshopRegistration.findFirst({
    where: { participantId, status: "ACTIVE" },
  });
}
