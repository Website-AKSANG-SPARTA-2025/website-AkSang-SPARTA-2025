import type { Participant, WorkshopRegistration } from "../generated/prisma/client";
import { ApplicationError } from "../errors/application-error";
import { getPrisma } from "../lib/prisma";

import { findOrCreateParticipant } from "./participant.service";

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
