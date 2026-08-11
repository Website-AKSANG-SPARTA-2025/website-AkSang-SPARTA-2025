import {
  errorResponse,
  parseJsonBody,
  successResponse,
} from "../../../../lib/api";
import { requireVerifiedParticipant } from "../../../../lib/auth";
import { confirmAttendanceSchema } from "../../../../schemas";
import { confirmAttendanceForVerifiedParticipant } from "../../../../services/attendance.service";

export async function POST(request: Request): Promise<Response> {
  try {
    const participant = await requireVerifiedParticipant(request);
    const input = await parseJsonBody(request, confirmAttendanceSchema);
    const result = await confirmAttendanceForVerifiedParticipant(
      participant.id,
      input,
    );
    return successResponse(
      { attendanceId: result.attendance.id, status: result.attendance.status },
      "Attendance confirmed",
      { status: result.created ? 201 : 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
