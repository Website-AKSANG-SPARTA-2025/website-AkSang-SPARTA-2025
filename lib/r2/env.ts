import { ApplicationError } from "../../errors/application-error";

export type R2Env = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  endpoint: string;
  maxSubmissionFileSizeBytes: number;
};

const DEFAULT_MAX_SUBMISSION_FILE_SIZE_BYTES = 5_242_880; // 5 MiB, work-order default

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    // Do not log which value was empty beyond its name; never log the value itself.
    throw new ApplicationError("INTERNAL_ERROR", 500, "Storage is not configured.");
  }
  return value;
}

/**
 * Reads R2 config from server-only env vars. Never returns/logs secrets
 * beyond what's needed to construct the client in-process.
 */
export function getR2Env(): R2Env {
  const maxSizeRaw = process.env.MAX_SUBMISSION_FILE_SIZE_BYTES;
  const maxSubmissionFileSizeBytes = maxSizeRaw
    ? Number.parseInt(maxSizeRaw, 10)
    : DEFAULT_MAX_SUBMISSION_FILE_SIZE_BYTES;

  if (!Number.isFinite(maxSubmissionFileSizeBytes) || maxSubmissionFileSizeBytes <= 0) {
    throw new ApplicationError("INTERNAL_ERROR", 500, "Storage is not configured.");
  }

  return {
    accountId: requireEnv("R2_ACCOUNT_ID"),
    accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    bucketName: requireEnv("R2_BUCKET_NAME"),
    endpoint: requireEnv("R2_ENDPOINT"),
    maxSubmissionFileSizeBytes,
  };
}