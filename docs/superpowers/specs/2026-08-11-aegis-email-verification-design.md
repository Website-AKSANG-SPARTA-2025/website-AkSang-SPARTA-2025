# Aegis Email Verification Design

## Goal

Replace the local magic-link and Resend-based email-verification flow with the
server-side Aegis verification API, while retaining `Participant.emailVerifiedAt`
as the local authorization source.

## Existing constraints

- `EmailVerification` and `VerificationPurpose` are used only by the legacy
  email-verification flow.
- The existing signed `participant_session` carries only `participantId` and
  expiry. Protected routes already require both that session and a non-null
  `emailVerifiedAt`; a public registration email alone cannot safely mint it.
- There is no active verification UI, middleware, login flow, password-reset
  flow, or other Resend caller in this repository.

## Approved design

1. Add one server-only Aegis adapter using native `fetch`. It reads
   `AEGIS_VERIFICATION_BASE_URL` and an optional
   `AEGIS_VERIFICATION_API_KEY`; the API key is sent only as `x-api-key` from
   server code.
2. Registration keeps creating the local participant and pending Attendance or
   WorkshopRegistration first, then asks Aegis to send verification. A send
   failure leaves that local pending state intact for a later resend.
3. Registration/enrollment does not issue a session from an unauthenticated
   email input. A pre-verification cookie would let someone who registered a
   victim's email claim the local account after the victim verifies externally.
4. A session-bound status endpoint reads the participant email from the local
   database. It returns local verified state without an upstream call, or asks
   Aegis once when local state is pending. Client-supplied email is never used.
   A post-verification browser session needs a future Aegis signed callback or
   a separate login mechanism; neither is included in the supplied API.
5. When Aegis reports `verified` or `already_verified`, one local transaction
   records Aegis's `verifiedAt` timestamp and promotes every matching pending
   local record for that participant (`Attendance` to `VERIFIED`,
   `WorkshopRegistration` to `ACTIVE`). This makes email verification global,
   matching Aegis's email-scoped model and preserving existing access rules.
6. The existing resend route remains for compatibility and sends through Aegis.
   It preserves useful rate-limit details, including `retryAfter`, and syncs an
   `already_verified` response.
7. Delete the legacy local verify route, token service state, Prisma model,
   enum, Resend adapter/notification service, Resend dependency, and only their
   configuration/tests. No password-reset, OTP, JWT, CSRF, or unrelated token is
   touched.

## Error contract

Known Aegis outcomes retain useful HTTP behavior: invalid email is `400`, both
rate-limit outcomes are `429` (with `retryAfter` when supplied), and delivery
or unreachable-upstream failures are safe `502` responses. Raw upstream errors,
API keys, and verification tokens are never returned or logged.

## Verification

Tests mock `fetch` and cover registration, send, resend variants, status/sync,
local short-circuiting, session-bound identity, and upstream failure. The final
gate runs Prisma validation/generation, lint, typecheck, the full test suite,
and production build.
