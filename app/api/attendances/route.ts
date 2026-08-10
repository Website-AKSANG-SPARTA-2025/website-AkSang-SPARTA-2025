import { errorResponse, parseJsonBody, successResponse } from "../../../lib/api";
import { createAttendanceSchema } from "../../../schemas";
import { createAttendance } from "../../../services/attendance.service";
import { sendVerificationEmail } from "../../../services/notification.service";
import { createVerification } from "../../../services/verification.service";

export async function POST(request: Request): Promise<Response> {
  try {
    const input = await parseJsonBody(request, createAttendanceSchema);
    const result = await createAttendance(input);
    const data = { attendanceId: result.attendance.id, status: result.attendance.status };

    if (!result.created) {
      return successResponse(data, "Attendance is awaiting verification");
    }

    const verification = await createVerification(result.participant.id, "ATTENDANCE");
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
