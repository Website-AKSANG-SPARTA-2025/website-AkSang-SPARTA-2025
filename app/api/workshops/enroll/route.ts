import { errorResponse, parseJsonBody, successResponse } from "../../../../lib/api";
import { createWorkshopEnrollmentSchema } from "../../../../schemas";
import { sendVerificationEmail } from "../../../../services/notification.service";
import { createVerification } from "../../../../services/verification.service";
import { enrollWorkshop } from "../../../../services/workshop.service";

export async function POST(request: Request): Promise<Response> {
  try {
    const input = await parseJsonBody(request, createWorkshopEnrollmentSchema);
    const result = await enrollWorkshop(input);
    const data = {
      status: result.registration.status,
      competitionPath: result.registration.competitionPath,
    };

    if (!result.created) {
      return successResponse(data, "Workshop registration is awaiting verification");
    }

    const verification = await createVerification(result.participant.id, "WORKSHOP");
    await sendVerificationEmail({
      to: result.participant.email,
      participantName: result.participant.name,
      verificationUrl: verification.verificationUrl,
      purpose: verification.purpose,
    });
    return successResponse(data, "Verification link has been sent to your email", { status: 202 });
  } catch (error) {
    return errorResponse(error);
  }
}
