import { apiFetch } from "./client";
import type { CompetitionPath } from "./workshops";

export type SubmissionData = {
  id: string;
  competitionPath: CompetitionPath;
  fileName: string;
};

/**
 * POST /api/submissions — multipart, not JSON.
 *
 * The handler rejects the request outright if the form carries any key other
 * than exactly one "competitionPath" and one "file", so nothing else may be
 * appended here. The file must be a PDF within
 * MAX_SUBMISSION_FILE_SIZE_BYTES.
 *
 * Requires a verified participant WITH an active workshop registration —
 * 401 without a session, 403 when registered but not active.
 */
export function createSubmission(input: {
  competitionPath: CompetitionPath;
  file: File;
}) {
  const form = new FormData();
  form.append("competitionPath", input.competitionPath);
  form.append("file", input.file);

  // No Content-Type header: the browser must set the multipart boundary.
  return apiFetch<SubmissionData>("/api/submissions", {
    method: "POST",
    body: form,
  });
}
