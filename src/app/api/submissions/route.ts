import { ApplicationError } from "../../../errors/application-error";
import { errorResponse, successResponse } from "../../../lib/api";
import { requireVerifiedParticipant } from "../../../lib/auth";
import { validatePdf } from "../../../lib/r2";
import { submissionSchema } from "../../../schemas";
import { createSubmission } from "../../../services/submission.service";
import { findActiveRegistrationByParticipantId } from "../../../services/workshop.service";

function invalidPayload(): ApplicationError {
  return new ApplicationError(
    "VALIDATION_ERROR",
    400,
    "Invalid request payload",
  );
}

async function parseSubmissionForm(request: Request): Promise<{
  competitionPath: "CTF" | "BCC" | "CP";
  file: File;
}> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw invalidPayload();
  }

  if (
    [...form.keys()].some(
      (key) => key !== "competitionPath" && key !== "file",
    ) ||
    form.getAll("competitionPath").length !== 1 ||
    form.getAll("file").length !== 1
  ) {
    throw invalidPayload();
  }

  const input = submissionSchema.parse({
    competitionPath: form.get("competitionPath"),
  });
  const file = form.get("file");
  if (!(file instanceof File)) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      400,
      "Only PDF files are allowed",
    );
  }

  return { competitionPath: input.competitionPath, file };
}

export async function POST(request: Request): Promise<Response> {
  try {
    const participant = await requireVerifiedParticipant(request);
    const registration = await findActiveRegistrationByParticipantId(
      participant.id,
    );
    if (!registration) {
      throw new ApplicationError(
        "FORBIDDEN",
        403,
        "Participant is not registered for the workshop",
      );
    }

    const { competitionPath, file } = await parseSubmissionForm(request);
    validatePdf({
      bytes: new Uint8Array(await file.arrayBuffer()),
      originalFileName: file.name,
      contentType: file.type,
    });
    const submission = await createSubmission({
      workshopRegistrationId: registration.id,
      competitionPath,
      file,
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
