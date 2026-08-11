import {
  errorResponse,
  parseJsonBody,
  successResponse,
} from "../../../../lib/api";
import { resendVerificationSchema } from "../../../../schemas";
import { resendVerification } from "../../../../services/verification.service";

export async function POST(request: Request): Promise<Response> {
  try {
    const input = await parseJsonBody(request, resendVerificationSchema);
    const verification = await resendVerification(input);
    if (verification.status === "already_verified") {
      return successResponse(
        {
          verified: true,
          status: "verified",
          verifiedAt: verification.verifiedAt,
        },
        "Email is already verified",
      );
    }

    return successResponse(
      { status: "sent", expiresAt: verification.expiresAt },
      "A new verification email has been sent",
      { status: 202 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
