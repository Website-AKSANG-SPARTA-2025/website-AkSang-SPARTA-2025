import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { ApplicationError } from "../../errors/application-error";
import { getR2Env } from "./env";
import type { R2ClientLike } from "./types";

let cachedClient: R2ClientLike | null = null;

/**
 * Centralized R2 client creation from env. Credentials never leave this
 * module and are never included in thrown errors or logs.
 */
export function createR2Client(): R2ClientLike {
  const env = getR2Env();

  const s3 = new S3Client({
    region: "auto",
    endpoint: env.endpoint,
    credentials: {
      accessKeyId: env.accessKeyId,
      secretAccessKey: env.secretAccessKey,
    },
  });

  return {
    async putObject({ key, body, contentType }) {
      try {
        await s3.send(
          new PutObjectCommand({
            Bucket: env.bucketName,
            Key: key,
            Body: body,
            ContentType: contentType,
          })
        );
      } catch {
        // Never surface the raw provider error (may contain request
        // metadata) to callers/clients.
        throw new ApplicationError(
          "EXTERNAL_PROVIDER_ERROR",
          502,
          "Failed to store file. Please try again."
        );
      }
    },
    async deleteObject({ key }) {
      try {
        await s3.send(
          new DeleteObjectCommand({ Bucket: env.bucketName, Key: key })
        );
      } catch {
        throw new ApplicationError(
          "EXTERNAL_PROVIDER_ERROR",
          502,
          "Failed to delete stored file."
        );
      }
    },
  };
}

/** Server-only singleton; call getR2Client() from uploadPdf/deleteObject. */
export function getR2Client(): R2ClientLike {
  if (!cachedClient) {
    cachedClient = createR2Client();
  }
  return cachedClient;
}

/** Test-only hook to reset the singleton between test files. */
export function __resetR2ClientForTests(): void {
  cachedClient = null;
}