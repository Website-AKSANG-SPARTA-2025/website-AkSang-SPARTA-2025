import { ApplicationError } from "../errors/application-error";
import type { Participant } from "../generated/prisma/client";
import { prisma } from "./prisma";
import { readParticipantSession } from "./session";

function unauthorized(): ApplicationError {
  return new ApplicationError("UNAUTHORIZED", 401, "Authentication required");
}

export async function requireVerifiedParticipant(request: Request): Promise<Participant> {
  const session = await readParticipantSession(request);

  if (!session) {
    throw unauthorized();
  }

  const participant = await prisma.participant.findUnique({
    where: { id: session.participantId },
  });

  if (!participant || participant.emailVerifiedAt === null) {
    throw unauthorized();
  }

  return participant;
}
