export type UploadPdfInput = {
  bytes: Uint8Array | Buffer;
  originalFileName: string;
  contentType: string;
};

export type StoredObject = {
  storageKey: string;
  fileName: string; // sanitized original display name
  contentType: string; // application/pdf
  size: number;
};

/**
 * Minimal surface BE-09 needs from an R2/S3-compatible client.
 * Lets tests inject a fake implementation instead of hitting live R2.
 */
export interface R2ClientLike {
  putObject(params: {
    key: string;
    body: Uint8Array | Buffer;
    contentType: string;
  }): Promise<void>;
  deleteObject(params: { key: string }): Promise<void>;
}