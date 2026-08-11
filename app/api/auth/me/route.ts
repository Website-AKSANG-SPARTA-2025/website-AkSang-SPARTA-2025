import { errorResponse, successResponse } from "../../../../lib/api";
import { requireParticipant } from "../../../../lib/auth";

export async function GET(request: Request): Promise<Response> {
  try {
    const participant = await requireParticipant(request);
    return successResponse({
      participant: {
        id: participant.id,
        name: participant.name,
        email: participant.email,
        verified: Boolean(participant.emailVerifiedAt),
        ...(participant.emailVerifiedAt ? { verifiedAt: participant.emailVerifiedAt.toISOString() } : {}),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
