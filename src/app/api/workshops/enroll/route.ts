import {
  errorResponse,
  parseJsonBody,
  successResponse,
} from "../../../../lib/api";
import { createWorkshopEnrollmentSchema } from "../../../../schemas";
import { sendVerification } from "../../../../services/verification.service";
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
      return successResponse(
        data,
        "Workshop registration is awaiting verification",
      );
    }

    const verification = await sendVerification(result.participant);
    if (verification.status === "already_verified") {
      return successResponse(
        {
          status: "ACTIVE",
          competitionPath: result.registration.competitionPath,
          verifiedAt: verification.verifiedAt,
        },
        "Email is already verified",
      );
    }

    return successResponse(data, "Verification email has been sent", {
      status: 202,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
