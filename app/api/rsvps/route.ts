import { errorResponse, parseJsonBody, successResponse } from "../../../lib/api";
import { createRsvpSchema } from "../../../schemas";
import { createRsvp } from "../../../services/rsvp.service";
import { dispatchVerificationLink } from "../../../services/verification-dispatch";

export async function POST(request: Request) {
  try {
    const payload = await parseJsonBody(request, createRsvpSchema);
    const result = await createRsvp(payload);
    await dispatchVerificationLink({
      participantId: result.participantId,
      purpose: "RSVP",
    });

    return successResponse(
      { rsvpId: result.rsvpId, status: result.status },
      result.isNew
        ? "Verification link has been sent to your email"
        : "RSVP is awaiting verification",
      { status: result.isNew ? 202 : 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
