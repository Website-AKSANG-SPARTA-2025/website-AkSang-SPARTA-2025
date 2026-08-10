import { ApplicationError } from "../../../../errors/application-error";
import { errorResponse } from "../../../../lib/api";
import { requireVerifiedParticipant } from "../../../../lib/auth";
import { invitationUrlForPath } from "../../../../lib/invitation";
import { findActiveRegistrationByParticipantId } from "../../../../services/workshop.service";

export async function GET(request: Request): Promise<Response> {
  try {
    const participant = await requireVerifiedParticipant(request);
    const registration = await findActiveRegistrationByParticipantId(participant.id);
    if (!registration) {
      throw new ApplicationError("FORBIDDEN", 403, "Participant is not registered for the workshop");
    }
    return Response.redirect(invitationUrlForPath(registration.competitionPath), 302);
  } catch (error) {
    return errorResponse(error);
  }
}
