import { randomUUID } from "node:crypto";

/**
 * Generates a server-controlled, unpredictable object key. Never derived
 * from the client-supplied filename.
 */
export function generateStorageKey(): string {
  return `submissions/${randomUUID()}.pdf`;
}