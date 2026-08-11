import {
  errorResponse,
  parseJsonBody,
  successResponse,
} from "../../../../lib/api";
import { requireVerifiedParticipant } from "../../../../lib/auth";
import { registerWorkshopSchema } from "../../../../schemas";
import { registerParticipant } from "../../../../services/workshop.service";

export async function POST(request: Request): Promise<Response> {
  try {
    const participant = await requireVerifiedParticipant(request);
    const input = await parseJsonBody(request, registerWorkshopSchema);
    const registration = await registerParticipant(participant.id, input);
    return successResponse(
      {
        id: registration.id,
        competitionPath: registration.competitionPath,
        invitationAvailable: true,
      },
      "Workshop registration successful",
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
