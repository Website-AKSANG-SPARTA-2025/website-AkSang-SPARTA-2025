# S1-BE-06 — Verified Session & Participant Identity Resolver

- **PIC:** Bima Aditama Wibowo Putro (BE-06A) and Rafi Pradipta Andira Sulistyo (BE-06B)
- **Timeline:** Independent session/auth helpers on 9 August; BE-03/BE-04 route integration and merge on 10 August; bug-fix buffer on 11 August 2026
- **Deadline:** 10 August 2026 before BE-07/BE-08/BE-10 merge
- **Sprint:** 1
- **Merge order:** 6
- **Depends on:** BE-03 RSVP-confirmation service; BE-04 successful verify result (`participantId`, `purpose`)
- **Blocks:** BE-07 workshop registration, BE-08 invitation, BE-10 submission
- **Contract:** verification success creates `participant_session`; protected routes resolve participant from it
- **Owned files:** `lib/session.ts`, `lib/auth.ts`, `app/api/verifications/verify/route.ts`, `app/api/rsvps/confirm/route.ts`, session/auth helper tests

> **Global rules:** API/DB contract is frozen by Backend Lead. Do not rename endpoints, request fields, response fields, model names, or cross-module interfaces without approval. Every secret stays server-side and must never be committed or logged.

## PIC workload split

BE-06 remains one contract, branch, PR, and acceptance gate. Cryptographic
session primitives and participant authorization use separate files so both
PICs have non-overlapping implementation ownership.

### BE-06A — Bima Aditama Wibowo Putro

Owned workload:

- `lib/session.ts`;
- signed-token and cookie-helper tests;
- final BE-06 PR integration and acceptance checklist.

Required behavior:

- implement HMAC signing, verification, and expiry with native Web Crypto;
- implement create/read/set/clear helpers for `participant_session`;
- enforce the approved cookie attributes for local and production environments;
- keep the payload limited to `participantId` and `exp`.

### BE-06B — Rafi Pradipta Andira Sulistyo

Owned workload:

- `lib/auth.ts` containing `requireVerifiedParticipant`;
- BE-04 verify-route success-branch integration;
- `app/api/rsvps/confirm/route.ts`;
- identity resolver, protected-route boundary, and route integration tests.

Required behavior:

- consume BE-06A session verification rather than reimplementing signatures;
- load Participant by trusted session ID and require `emailVerifiedAt`;
- set the cookie and redirect only after BE-04 reports successful verification;
- validate `{}` and call BE-03 confirmation service with trusted participant ID;
- export one stable resolver for BE-07, BE-08, and BE-10.

Both PICs review tampered/expired/unverified-session tests. They agree on the
final PR together; changes to token payload, cookie contract, or resolver return
type require approval from both PICs and Backend Lead.


## Goal (1 sentence)
Turn a successful email verification into a secure HttpOnly session and give protected routes one trusted helper to resolve the verified participant.

## Context you need to know
- Current approved Prisma schema has no Session table; use a **stateless signed session token** in an HttpOnly cookie.
- Session must identify `participantId`; routes must still query Participant to confirm it exists and `emailVerifiedAt != null`.
- Do not trust participant ID from request body/query.
- Workshop activation and submission must never require name/email again. The
  workshop route may collect only its approved path, required phone number, and
  optional NIM after session resolution.
- RSVP confirmation is the only session-based RSVP action; it calls BE-03's
  service with a trusted participant ID and accepts a strictly empty body.

## Work-order configuration decisions
```env
SESSION_SECRET=<minimum 32 random bytes, server-only>
SESSION_TTL_DAYS=7
```
Cookie name is fixed for this sprint:
```text
participant_session
```

## Session token contract
Use a cryptographically signed HMAC token with native Web Crypto. Payload must contain only:
```ts
{
  participantId: string;
  exp: number;
}
```
Do not put name, email, NIM, phone number, verification token, or secrets into
the token.

Cookie attributes in production:
```text
HttpOnly=true
Secure=true
SameSite=Lax
Path=/
Max-Age=<derived from SESSION_TTL_DAYS>
```
For local HTTP development, `Secure` may be disabled only through environment-aware config; production must force `Secure=true`.

## Required helper semantics
Provide equivalent functions:
```ts
createParticipantSession(participantId): token
setParticipantSessionCookie(response, participantId): response
readParticipantSession(request): { participantId } | null
requireVerifiedParticipant(request): Participant
clearParticipantSessionCookie(response): response
```
`requireVerifiedParticipant` must:
1. read/verify signature + expiry;
2. return `401` if missing, malformed, tampered, or expired;
3. query Participant by ID;
4. return `401` if participant missing or `emailVerifiedAt` is null;
5. return participant object/ID to caller.

## Verification-route integration
BE-06 is explicitly allowed to edit only the success branch of:
`app/api/verifications/verify/route.ts`

Final success behavior:
```http
HTTP/1.1 302 Found
Location: <redirect selected by verification purpose>
Set-Cookie: participant_session=...; HttpOnly; Secure; SameSite=Lax; Path=/
```

`RSVP` redirects to `/event?verified=true`; `WORKSHOP` redirects to
`/workshop?verified=true` without changing RSVP.
Do not change BE-04 token validation/transaction rules.

## RSVP-confirmation route integration
Implement the session boundary for:
```http
POST /api/rsvps/confirm
Cookie: participant_session=...
Content-Type: application/json
```
Validate a strictly empty `{}` body, call `requireVerifiedParticipant`, then call
BE-03 `confirmRsvpForVerifiedParticipant(participant.id)`. Do not accept
name/email/participant ID and do not alter BE-03 RSVP state rules.

## Suggested steps
1. Implement signed-token encode/decode with expiry validation.
2. Implement cookie helpers using Next.js server APIs used by the repo.
3. Implement `requireVerifiedParticipant` DB check.
4. Wire session creation after BE-04 returns successful verified `participantId`
   and redirect from its purpose.
5. Implement the strict session-boundary route for RSVP confirmation using
   BE-03 service.
6. Add tests for missing, tampered, expired, unverified participant, verified participant.
7. Export stable helper path for BE-07/BE-08/BE-10.

## Boundary (what you must NOT touch)
- Do not add login/password/JWT refresh flow.
- Do not add a Session DB model.
- Do not modify verification token lifecycle.
- Do not implement workshop/invitation/submission business logic.
- Do not expose session token to client JavaScript.
- Do not accept participant ID from request body as authentication.

## Done = (acceptance criteria — become tests)
- [ ] Verification success sets `participant_session` and redirects to `/event?verified=true`.
- [ ] WORKSHOP-purpose verification success sets `participant_session` and
  redirects to `/workshop?verified=true` without changing RSVP.
- [ ] `POST /api/rsvps/confirm` requires a verified session and rejects identity
  fields before calling BE-03 service.
- [ ] Cookie is HttpOnly, SameSite=Lax, Path=/, and Secure in production.
- [ ] Valid session resolves the exact verified Participant.
- [ ] Missing cookie → `401`.
- [ ] Tampered token → `401`.
- [ ] Expired token → `401`.
- [ ] Existing but unverified participant → `401`.
- [ ] Session payload contains no email/name/NIM/phone number/secret/raw
  verification token.
- [ ] BE-07/BE-08/BE-10 can import one stable `requireVerifiedParticipant` helper.
