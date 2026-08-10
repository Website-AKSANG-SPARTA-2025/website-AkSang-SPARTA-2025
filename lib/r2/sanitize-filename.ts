const MAX_DISPLAY_NAME_LENGTH = 150;
const FALLBACK_NAME = "submission.pdf";

/**
 * Produces a safe display name for metadata only. This value must never
 * be used to construct the R2 object key (see generateStorageKey).
 */
export function sanitizeFileName(rawName: string): string {
  if (!rawName || typeof rawName !== "string") {
    return FALLBACK_NAME;
  }

  // Strip any directory component (handles both / and \ separators).
  const baseName = rawName.split(/[/\\]/).pop() ?? rawName;

  // Allow letters, numbers, spaces, dot, dash, underscore only.
  const cleaned = baseName
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9 ._-]/g, "_")
    .replace(/\s+/g, " ")
    .trim();

  const safe = cleaned.length > 0 ? cleaned : FALLBACK_NAME;

  const truncated =
    safe.length > MAX_DISPLAY_NAME_LENGTH
      ? safe.slice(0, MAX_DISPLAY_NAME_LENGTH)
      : safe;

  return truncated.toLowerCase().endsWith(".pdf")
    ? truncated
    : `${truncated}.pdf`;
}