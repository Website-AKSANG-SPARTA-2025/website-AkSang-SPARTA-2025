import {
  errorResponse,
  parseJsonBody,
  successResponse,
} from "../../../lib/api";
import { createAttendanceSchema } from "../../../schemas";
import { createAttendance } from "../../../services/attendance.service";
import { sendVerification } from "../../../services/verification.service";

export async function POST(request: Request): Promise<Response> {
  try {
    const input = await parseJsonBody(request, createAttendanceSchema);
    const result = await createAttendance(input);
    const data = {
      attendanceId: result.attendance.id,
      status: result.attendance.status,
    };

    if (!result.created) {
      return successResponse(data, "Attendance is awaiting verification");
    }

    const verification = await sendVerification(result.participant);
    if (verification.status === "already_verified") {
      return successResponse(
        {
          attendanceId: result.attendance.id,
          status: "VERIFIED",
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
