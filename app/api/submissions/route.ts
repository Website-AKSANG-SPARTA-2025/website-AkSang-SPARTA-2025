import { requireVerifiedParticipant } from "../../../lib/auth";
import { errorResponse, successResponse } from "../../../lib/api";
import { ApplicationError } from "../../../errors/application-error";
import {
  createSubmission,
  requireActiveWorkshopRegistration,
} from "../../../services/submission.service";

export async function POST(request: Request): Promise<Response> {
  try {
    const participant = await requireVerifiedParticipant(request);
    const registration = await requireActiveWorkshopRegistration(participant.id);

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      throw new ApplicationError("VALIDATION_ERROR", 400, "Invalid request payload");
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new ApplicationError("INVALID_PDF", 400, "Only PDF files are allowed");
    }

    const submission = await createSubmission({
      workshopRegistrationId: registration.id,
      competitionPath: formData.get("competitionPath"),
      file: {
        bytes: new Uint8Array(await file.arrayBuffer()),
        originalFileName: file.name,
        contentType: file.type,
      },
    });

    return successResponse(
      {
        id: submission.id,
        competitionPath: submission.competitionPath,
        fileName: submission.fileName,
      },
      "Submission created successfully",
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
