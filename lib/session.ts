export interface ParticipantSessionPayload {
  participantId: string;
}

export async function readParticipantSession(
  _request: Request,
): Promise<ParticipantSessionPayload | null> {
  return null;
}
