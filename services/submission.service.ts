import type { Submission } from "../generated/prisma/client";
import { deleteObject, uploadPdf } from "../lib/r2";
import { getPrisma } from "../lib/prisma";

export async function createSubmission(input: {
  workshopRegistrationId: string;
  competitionPath: "CTF" | "BCC" | "CP";
  file: File;
}): Promise<Submission> {
  const stored = await uploadPdf({
    bytes: new Uint8Array(await input.file.arrayBuffer()),
    originalFileName: input.file.name,
    contentType: input.file.type,
  });

  try {
    return await getPrisma().submission.create({
      data: {
        workshopRegistrationId: input.workshopRegistrationId,
        competitionPath: input.competitionPath,
        fileName: stored.fileName,
        storageKey: stored.storageKey,
        contentType: stored.contentType,
        size: stored.size,
      },
    });
  } catch (error) {
    try {
      await deleteObject(stored.storageKey);
    } catch (cleanupError) {
      console.error("Submission persistence cleanup failed", {
        persistenceError: error instanceof Error ? error.name : "unknown",
        cleanupError: cleanupError instanceof Error ? cleanupError.name : "unknown",
      });
    }
    throw error;
  }
}
