import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

import { ApplicationError } from "../errors/application-error";
import { positiveIntegerEnv, requiredEnv } from "./env";

const pdfMagic = new TextEncoder().encode("%PDF-");

export type UploadPdfInput = {
  bytes: Uint8Array;
  originalFileName: string;
  contentType: string;
};

export type StoredObject = {
  storageKey: string;
  fileName: string;
  contentType: "application/pdf";
  size: number;
};

function r2Client(): S3Client {
  const accountId = requiredEnv("R2_ACCOUNT_ID");
  return new S3Client({
    region: "auto",
    endpoint:
      process.env.R2_ENDPOINT ||
      `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
}

function bucketName(): string {
  return requiredEnv("R2_BUCKET_NAME");
}

function invalidPdf(): ApplicationError {
  return new ApplicationError(
    "VALIDATION_ERROR",
    400,
    "Only PDF files are allowed",
  );
}

function displayFileName(value: string): string {
  return (
    value.replace(/[\\/\u0000-\u001F\u007F]/g, "_").trim() || "submission.pdf"
  );
}

export function validatePdf(input: UploadPdfInput): void {
  const maxSize = positiveIntegerEnv(
    "MAX_SUBMISSION_FILE_SIZE_BYTES",
    5 * 1024 * 1024,
  );
  if (
    !input.bytes.byteLength ||
    input.bytes.byteLength > maxSize ||
    input.contentType !== "application/pdf" ||
    pdfMagic.some((byte, index) => input.bytes[index] !== byte)
  ) {
    throw invalidPdf();
  }
}

export async function uploadPdf(input: UploadPdfInput): Promise<StoredObject> {
  validatePdf(input);
  const stored: StoredObject = {
    storageKey: `submissions/${randomUUID()}.pdf`,
    fileName: displayFileName(input.originalFileName),
    contentType: "application/pdf",
    size: input.bytes.byteLength,
  };
  const client = r2Client();
  const bucket = bucketName();

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: stored.storageKey,
        Body: input.bytes,
        ContentType: stored.contentType,
      }),
    );
    return stored;
  } catch {
    throw new ApplicationError(
      "EXTERNAL_PROVIDER_ERROR",
      502,
      "Unable to store submission",
    );
  }
}

export async function deleteObject(storageKey: string): Promise<void> {
  await r2Client().send(
    new DeleteObjectCommand({ Bucket: bucketName(), Key: storageKey }),
  );
}
