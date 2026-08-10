import { errorResponse, parseJsonBody, successResponse } from "../../../../lib/api";
import { resendVerificationSchema } from "../../../../schemas";
import { sendVerificationEmail } from "../../../../services/notification.service";
import { resendVerification } from "../../../../services/verification.service";

export async function POST(request: Request): Promise<Response> {
  try {
    const input = await parseJsonBody(request, resendVerificationSchema);
    const verification = await resendVerification(input);
    await sendVerificationEmail({
      to: verification.email,
      participantName: verification.participantName,
      verificationUrl: verification.verificationUrl,
      purpose: verification.purpose,
    });
    return successResponse({}, "A new verification link has been sent", { status: 202 });
  } catch (error) {
    return errorResponse(error);
  }
}
