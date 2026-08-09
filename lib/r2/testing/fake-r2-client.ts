import type { R2ClientLike } from "../types";

/**
 * In-memory fake used by BE-09 (and BE-10) unit tests so no test ever
 * touches live R2.
 */
export function createFakeR2Client(opts?: {
  failPut?: boolean;
  failDelete?: boolean;
}): R2ClientLike & { objects: Map<string, { body: Uint8Array | Buffer; contentType: string }> } {
  const objects = new Map<string, { body: Uint8Array | Buffer; contentType: string }>();

  return {
    objects,
    async putObject({ key, body, contentType }) {
      if (opts?.failPut) throw new Error("simulated R2 put failure");
      objects.set(key, { body, contentType });
    },
    async deleteObject({ key }) {
      if (opts?.failDelete) throw new Error("simulated R2 delete failure");
      objects.delete(key);
    },
  };
}