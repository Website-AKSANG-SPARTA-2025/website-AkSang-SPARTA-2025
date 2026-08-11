import { apiFetch, postJson } from "./client";

export type Me = {
  participant: {
    id: string;
    name: string;
    email: string;
    verified: boolean;
  };
};

/** GET /api/auth/me — 401 when there is no session. */
export function getMe() {
  return apiFetch<Me>("/api/auth/me");
}

/** POST /api/auth/logout — clears the participant session cookie. */
export function logout() {
  return postJson<unknown>("/api/auth/logout", {});
}

/**
 * POST /api/dev/auth/session
 *
 * The only code path that creates a participant session. It looks the
 * participant up by email in the database and refuses unless emailVerifiedAt
 * is set, so the account must already be verified.
 *
 * DEVELOPMENT ONLY — the route returns a bare 404 unless
 * NODE_ENV === "development", and requires DEV_AUTH_TEST_SECRET. There is no
 * production equivalent yet, so anything behind requireParticipant /
 * requireVerifiedParticipant is unreachable for real users.
 */
export function createDevSession(input: { email: string; secret: string }) {
  return postJson<{ email: string }>("/api/dev/auth/session", input);
}
