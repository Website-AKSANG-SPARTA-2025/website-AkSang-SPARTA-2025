import { errorResponse, successResponse } from "../../../../lib/api";
import { requireParticipant } from "../../../../lib/auth";
import { getVerificationStatus } from "../../../../services/verification.service";

export async function GET(request: Request): Promise<Response> {
  try {
    const participant = await requireParticipant(request);
    return successResponse(await getVerificationStatus(participant));
  } catch (error) {
    return errorResponse(error);
  }
}
