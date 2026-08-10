import { ApplicationError } from "../../errors/application-error";
import { getR2Env } from "./env";
import type { UploadPdfInput } from "./types";

const PDF_MAGIC_BYTES = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"
const PDF_MIME_TYPE = "application/pdf";

function hasPdfMagicBytes(bytes: Uint8Array | Buffer): boolean {
  if (bytes.length < PDF_MAGIC_BYTES.length) return false;
  return PDF_MAGIC_BYTES.every((byte, index) => bytes[index] === byte);
}

/**
 * Implements validation rules 1-4 from S1-BE-09 exactly. Throws
 * ApplicationError (400) on any failure; never trusts MIME or filename
 * extension alone.
 */
export function validatePdf(input: UploadPdfInput): void {
  const { bytes, contentType } = input;

  // Rule 1: file exists and size > 0.
  if (!bytes || bytes.length === 0) {
    throw new ApplicationError("VALIDATION_ERROR", 400, "A non-empty PDF file is required.");
  }

  // Rule 2: size <= configured max.
  const { maxSubmissionFileSizeBytes } = getR2Env();
  if (bytes.length > maxSubmissionFileSizeBytes) {
    throw new ApplicationError("VALIDATION_ERROR", 400, "File exceeds the maximum allowed size.");
  }

  // Rule 3: MIME must be application/pdf.
  if (contentType !== PDF_MIME_TYPE) {
    throw new ApplicationError("VALIDATION_ERROR", 400, "Only PDF files are accepted.");
  }

  // Rule 4: magic-byte check; MIME alone is insufficient.
  if (!hasPdfMagicBytes(bytes)) {
    throw new ApplicationError("VALIDATION_ERROR", 400, "File does not appear to be a valid PDF.");
  }
}