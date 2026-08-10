import { requireVerifiedParticipant } from "../../../../lib/auth";
import { errorResponse, parseJsonBody, successResponse } from "../../../../lib/api";
import { confirmRsvpSchema } from "../../../../schemas";
import { confirmRsvpForVerifiedParticipant } from "../../../../services/rsvp.service";

export async function POST(request: Request): Promise<Response> {
  try {
    await parseJsonBody(request, confirmRsvpSchema);
    const participant = await requireVerifiedParticipant(request);
    const rsvp = await confirmRsvpForVerifiedParticipant(participant.id);

    return successResponse(
      { rsvpId: rsvp.id, status: rsvp.status },
      "RSVP confirmed",
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
