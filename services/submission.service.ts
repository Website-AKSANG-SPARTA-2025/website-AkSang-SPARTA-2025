import type { CompetitionPath } from "../generated/prisma/client";
import { ApplicationError } from "../errors/application-error";
import { prisma } from "../lib/prisma";
import { deleteObject, uploadPdf, validatePdf } from "../lib/r2";
import { submissionSchema } from "../schemas";
import { findActiveRegistrationByParticipantId } from "./workshop.service";

type CreateSubmissionInput = {
  workshopRegistrationId: string;
  competitionPath: unknown;
  file: {
    bytes: Uint8Array;
    originalFileName: string;
    contentType: string;
  };
};

export async function requireActiveWorkshopRegistration(participantId: string) {
  const registration = await findActiveRegistrationByParticipantId(participantId);

  if (!registration) {
    throw new ApplicationError(
      "WORKSHOP_REGISTRATION_REQUIRED",
      403,
      "Participant is not registered for the workshop",
    );
  }

  return registration;
}

export async function createSubmission(input: CreateSubmissionInput) {
  const { competitionPath } = submissionSchema.parse({
    competitionPath: input.competitionPath,
  });

  try {
    validatePdf({
      bytes: input.file.bytes,
      originalFileName: input.file.originalFileName,
      contentType: input.file.contentType,
    });
  } catch (error) {
    if (error instanceof ApplicationError && error.status === 400) {
      throw new ApplicationError("INVALID_PDF", 400, "Only PDF files are allowed");
    }
    throw error;
  }

  const stored = await uploadPdf({
    bytes: input.file.bytes,
    originalFileName: input.file.originalFileName,
    contentType: input.file.contentType,
  });

  try {
    return await prisma.submission.create({
      data: {
        workshopRegistrationId: input.workshopRegistrationId,
        competitionPath: competitionPath as CompetitionPath,
        fileName: stored.fileName,
        storageKey: stored.storageKey,
        contentType: stored.contentType,
        size: stored.size,
      },
    });
  } catch (dbError) {
    try {
      await deleteObject(stored.storageKey);
    } catch (cleanupError) {
      console.error("[submission] orphan cleanup failed", {
        storageKey: stored.storageKey,
        databaseError: dbError instanceof Error ? dbError.name : "unknown",
        cleanupError: cleanupError instanceof Error ? cleanupError.name : "unknown",
      });
    }
    throw dbError;
  }
}
