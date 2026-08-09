import { ApplicationError } from "../errors/application-error";
import { getR2Client } from "./r2/client";
import { sanitizeFileName } from "./r2/sanitize-filename";
import { generateStorageKey } from "./r2/storage-key";
import { validatePdf } from "./r2/validate-pdf";
import type { R2ClientLike, StoredObject, UploadPdfInput } from "./r2/types";

export type { UploadPdfInput, StoredObject } from "./r2/types";
export { validatePdf} from "./r2/validate-pdf";

/**
 * Validates and uploads a PDF, returning only the approved metadata shape
 * (matches BE-01's Submission fields: fileName, storageKey, contentType,
 * size). Does not create any DB record and does not return a signed/public
 * URL, per the BE-09 contract.
 */
export async function uploadPdf(
  input: UploadPdfInput,
  client: R2ClientLike = getR2Client()
): Promise<StoredObject> {
  validatePdf(input);

  const storageKey = generateStorageKey();
  const fileName = sanitizeFileName(input.originalFileName);

  try {
    await client.putObject({
      key: storageKey,
      body: input.bytes,
      contentType: input.contentType,
    });
  } catch (err) {
    // Any client implementation (real R2 client or an injected one) may
    // throw a raw provider error. Never let that reach the caller/client.
    if (err instanceof ApplicationError) throw err;
    throw new ApplicationError(
      "EXTERNAL_PROVIDER_ERROR",
      502,
      "Failed to store file. Please try again."
    );
  }

  return {
    storageKey,
    fileName,
    contentType: input.contentType,
    size: input.bytes.length,
  };
}

/**
 * Deletes an object by its exact storage key (orphan cleanup). Failures
 * are logged as operational errors, not silently swallowed, and are
 * re-thrown as ApplicationError so callers can decide how to surface them.
 */
export async function deleteObject(
  storageKey: string,
  client: R2ClientLike = getR2Client()
): Promise<void> {
  try {
    await client.deleteObject({ key: storageKey });
  } catch (err) {
    // Operational log — never include credentials; storageKey alone is safe.
    console.error("[r2] deleteObject failed", { storageKey });
    if (err instanceof ApplicationError) throw err;
    throw new ApplicationError(
      "EXTERNAL_PROVIDER_ERROR",
      502,
      "Failed to delete stored file."
    );
  }
}