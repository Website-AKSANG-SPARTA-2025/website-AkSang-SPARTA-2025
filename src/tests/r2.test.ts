import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  send: vi.fn(),
  clientConfigs: [] as unknown[],
  putInputs: [] as unknown[],
  deleteInputs: [] as unknown[],
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class {
    constructor(config: unknown) {
      sdk.clientConfigs.push(config);
    }

    send = sdk.send;
  },
  PutObjectCommand: class {
    constructor(input: unknown) {
      sdk.putInputs.push(input);
    }
  },
  DeleteObjectCommand: class {
    constructor(input: unknown) {
      sdk.deleteInputs.push(input);
    }
  },
}));

import { deleteObject, uploadPdf, validatePdf } from "../lib/r2";

const originalEnv = {
  accountId: process.env.R2_ACCOUNT_ID,
  accessKey: process.env.R2_ACCESS_KEY_ID,
  secret: process.env.R2_SECRET_ACCESS_KEY,
  bucket: process.env.R2_BUCKET_NAME,
  endpoint: process.env.R2_ENDPOINT,
  maxSize: process.env.MAX_SUBMISSION_FILE_SIZE_BYTES,
};
const pdf = new TextEncoder().encode("%PDF-1.7\nbody");

function input(
  overrides: Partial<{
    bytes: Uint8Array;
    originalFileName: string;
    contentType: string;
  }> = {},
) {
  return {
    bytes: pdf,
    originalFileName: "solution.pdf",
    contentType: "application/pdf",
    ...overrides,
  };
}

function validationError(value: ReturnType<typeof input>): unknown {
  try {
    validatePdf(value);
  } catch (error) {
    return error;
  }

  throw new Error("Expected PDF validation to fail");
}

beforeEach(() => {
  process.env.R2_ACCOUNT_ID = "account-id";
  process.env.R2_ACCESS_KEY_ID = "access-key";
  process.env.R2_SECRET_ACCESS_KEY = "secret-key";
  process.env.R2_BUCKET_NAME = "submission-bucket";
  process.env.R2_ENDPOINT = "https://account-id.r2.cloudflarestorage.com";
  process.env.MAX_SUBMISSION_FILE_SIZE_BYTES = "20";
  sdk.send.mockReset();
  sdk.clientConfigs.length = 0;
  sdk.putInputs.length = 0;
  sdk.deleteInputs.length = 0;
});

afterEach(() => {
  if (originalEnv.accountId === undefined) delete process.env.R2_ACCOUNT_ID;
  else process.env.R2_ACCOUNT_ID = originalEnv.accountId;
  if (originalEnv.accessKey === undefined) delete process.env.R2_ACCESS_KEY_ID;
  else process.env.R2_ACCESS_KEY_ID = originalEnv.accessKey;
  if (originalEnv.secret === undefined) delete process.env.R2_SECRET_ACCESS_KEY;
  else process.env.R2_SECRET_ACCESS_KEY = originalEnv.secret;
  if (originalEnv.bucket === undefined) delete process.env.R2_BUCKET_NAME;
  else process.env.R2_BUCKET_NAME = originalEnv.bucket;
  if (originalEnv.endpoint === undefined) delete process.env.R2_ENDPOINT;
  else process.env.R2_ENDPOINT = originalEnv.endpoint;
  if (originalEnv.maxSize === undefined)
    delete process.env.MAX_SUBMISSION_FILE_SIZE_BYTES;
  else process.env.MAX_SUBMISSION_FILE_SIZE_BYTES = originalEnv.maxSize;
});

describe("private PDF storage", () => {
  it("accepts only nonempty PDF bytes within the configured size", () => {
    expect(() => validatePdf(input())).not.toThrow();
    expect(validationError(input({ bytes: new Uint8Array() }))).toMatchObject({
      status: 400,
    });
    expect(validationError(input({ contentType: "text/plain" }))).toMatchObject(
      { status: 400 },
    );
    expect(
      validationError(input({ bytes: new TextEncoder().encode("not a pdf") })),
    ).toMatchObject({
      status: 400,
    });
    expect(
      validationError(input({ bytes: new Uint8Array(21).fill(1) })),
    ).toMatchObject({ status: 400 });
  });

  it("uploads with a generated key and sanitized display filename", async () => {
    const stored = await uploadPdf(
      input({ originalFileName: "../unsafe\\solution\u0000.pdf" }),
    );

    expect(stored).toMatchObject({
      contentType: "application/pdf",
      size: pdf.byteLength,
    });
    expect(stored.storageKey).toMatch(/^submissions\/[0-9a-f-]+\.pdf$/);
    expect(stored.storageKey).not.toContain("solution");
    expect(stored.fileName).not.toMatch(/[\\/\u0000]/);
    expect(sdk.putInputs).toEqual([
      expect.objectContaining({
        Bucket: "submission-bucket",
        Key: stored.storageKey,
        Body: pdf,
        ContentType: "application/pdf",
      }),
    ]);
  });

  it("maps upload provider failures to a safe 502", async () => {
    sdk.send.mockRejectedValueOnce(new Error("R2 transport failure"));

    await expect(uploadPdf(input())).rejects.toMatchObject({
      status: 502,
      message: "Unable to store submission",
    });
  });

  it("deletes exactly the requested server-owned key", async () => {
    await deleteObject("submissions/exact-key.pdf");

    expect(sdk.deleteInputs).toEqual([
      { Bucket: "submission-bucket", Key: "submissions/exact-key.pdf" },
    ]);
  });
});
