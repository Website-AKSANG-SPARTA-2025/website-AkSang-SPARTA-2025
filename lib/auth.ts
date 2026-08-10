import type { Participant } from "../generated/prisma/client";
import { ApplicationError } from "../errors/application-error";
import { getPrisma } from "./prisma";
import { readParticipantSession } from "./session";

function unauthorized(): ApplicationError {
  return new ApplicationError("UNAUTHORIZED", 401, "Authentication required");
}

export async function requireParticipant(request: Request): Promise<Participant> {
  const session = await readParticipantSession(request);
  if (!session) throw unauthorized();

  const participant = await getPrisma().participant.findUnique({
    where: { id: session.participantId },
  });
  if (!participant) throw unauthorized();
  return participant;
}

export async function requireVerifiedParticipant(request: Request): Promise<Participant> {
  const participant = await requireParticipant(request);
  if (!participant.emailVerifiedAt) throw unauthorized();
  return participant;
}
