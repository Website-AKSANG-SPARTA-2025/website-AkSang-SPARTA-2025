import { describe, it, expect, beforeEach, vi } from "vitest";
import { uploadPdf, deleteObject, validatePdf } from "../lib/r2";
import { createFakeR2Client } from "../lib/r2/testing/fake-r2-client";
import { ApplicationError } from "../errors/application-error";

const VALID_PDF_BYTES = new Uint8Array([
  0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, // "%PDF-1.4\n" + padding
  ...new Array(20).fill(0x00),
]);

beforeEach(() => {
  process.env.R2_ACCOUNT_ID = "test-account";
  process.env.R2_ACCESS_KEY_ID = "test-key";
  process.env.R2_SECRET_ACCESS_KEY = "test-secret";
  process.env.R2_BUCKET_NAME = "test-bucket";
  process.env.R2_ENDPOINT = "https://example.r2.example.com";
  process.env.MAX_SUBMISSION_FILE_SIZE_BYTES = "5242880";
});

describe("uploadPdf", () => {
  it("uploads valid PDF bytes through mocked R2 and returns metadata", async () => {
    const client = createFakeR2Client();
    const result = await uploadPdf(
      {
        bytes: VALID_PDF_BYTES,
        originalFileName: "My Submission.pdf",
        contentType: "application/pdf",
      },
      client
    );

    expect(result.contentType).toBe("application/pdf");
    expect(result.size).toBe(VALID_PDF_BYTES.length);
    expect(result.fileName).toBe("My Submission.pdf");
    expect(client.objects.has(result.storageKey)).toBe(true);
  });

  it("rejects an empty file", async () => {
    const client = createFakeR2Client();
    await expect(
      uploadPdf(
        { bytes: new Uint8Array(), originalFileName: "a.pdf", contentType: "application/pdf" },
        client
      )
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejects a non-PDF MIME type", async () => {
    const client = createFakeR2Client();
    await expect(
      uploadPdf(
        { bytes: VALID_PDF_BYTES, originalFileName: "a.pdf", contentType: "image/png" },
        client
      )
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejects application/pdf with wrong magic bytes", async () => {
    const client = createFakeR2Client();
    const badBytes = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);
    await expect(
      uploadPdf(
        { bytes: badBytes, originalFileName: "a.pdf", contentType: "application/pdf" },
        client
      )
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejects a file above the configured max size", async () => {
    process.env.MAX_SUBMISSION_FILE_SIZE_BYTES = "10";
    const client = createFakeR2Client();
    await expect(
      uploadPdf(
        { bytes: VALID_PDF_BYTES, originalFileName: "a.pdf", contentType: "application/pdf" },
        client
      )
    ).rejects.toMatchObject({ status: 400 });
  });

  it("generates a key that does not directly use the raw filename", async () => {
    const client = createFakeR2Client();
    const result = await uploadPdf(
      {
        bytes: VALID_PDF_BYTES,
        originalFileName: "super secret name.pdf",
        contentType: "application/pdf",
      },
      client
    );
    expect(result.storageKey).not.toContain("super");
    expect(result.storageKey).toMatch(/^submissions\/[0-9a-f-]+\.pdf$/);
  });

  it("surfaces R2 provider failures as a safe 502 ApplicationError", async () => {
    const client = createFakeR2Client({ failPut: true });
    await expect(
      uploadPdf(
        { bytes: VALID_PDF_BYTES, originalFileName: "a.pdf", contentType: "application/pdf" },
        client
      )
    ).rejects.toMatchObject({ status: 502, code: "EXTERNAL_PROVIDER_ERROR" });
  });

  it("never leaks configured secrets in the thrown error", async () => {
    const client = createFakeR2Client({ failPut: true });
    try {
      await uploadPdf(
        { bytes: VALID_PDF_BYTES, originalFileName: "a.pdf", contentType: "application/pdf" },
        client
      );
      throw new Error("expected rejection");
    } catch (err) {
      const serialized = JSON.stringify(err instanceof Error ? err.message : err);
      expect(serialized).not.toContain("test-secret");
    }
  });
});

describe("deleteObject", () => {
  it("deletes the exact key", async () => {
    const client = createFakeR2Client();
    await uploadPdf(
      { bytes: VALID_PDF_BYTES, originalFileName: "a.pdf", contentType: "application/pdf" },
      client
    );
    const [key] = client.objects.keys();
    await deleteObject(key, client);
    expect(client.objects.has(key)).toBe(false);
  });

  it("logs delete failures as an operational error instead of swallowing them", async () => {
    const client = createFakeR2Client({ failDelete: true });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(deleteObject("submissions/does-not-matter.pdf", client)).rejects.toMatchObject({
      status: 502,
    });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("validatePdf", () => {
  it("accepts a valid PDF", () => {
    expect(() =>
      validatePdf({ bytes: VALID_PDF_BYTES, originalFileName: "a.pdf", contentType: "application/pdf" })
    ).not.toThrow();
  });

  it("throws ApplicationError instances, not raw errors", () => {
    try {
      validatePdf({ bytes: new Uint8Array(), originalFileName: "a.pdf", contentType: "application/pdf" });
    } catch (err) {
      expect(err).toBeInstanceOf(ApplicationError);
    }
  });
});