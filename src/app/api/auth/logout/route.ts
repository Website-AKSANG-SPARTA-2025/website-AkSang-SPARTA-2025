import { errorResponse, successResponse } from "../../../../lib/api";
import { clearParticipantSessionCookie } from "../../../../lib/session";

export function POST(): Response {
  try {
    return clearParticipantSessionCookie(successResponse({}, "Logged out"));
  } catch (error) {
    return errorResponse(error);
  }
}
