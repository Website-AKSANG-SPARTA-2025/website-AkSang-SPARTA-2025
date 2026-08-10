import { WorkshopRegistrationStatus } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";

/**
 * Temporary BE-07 compatibility shim.  Keep this exported contract when the
 * workshop-registration implementation is merged so protected consumers do
 * not need to change.
 */
export async function findActiveRegistrationByParticipantId(participantId: string) {
  return prisma.workshopRegistration.findFirst({
    where: {
      participantId,
      status: WorkshopRegistrationStatus.ACTIVE,
    },
  });
}
