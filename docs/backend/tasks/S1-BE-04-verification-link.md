# S1-BE-04 — Purpose-Bound Verification Link & Resend Flow

- **PIC:** Jeremy Gerald Sutanto (BE-04B) and Muhammad Marvel Sidharta (BE-04A)
- **Timeline:** Begin after BE-03 interface freeze on 9 August; integration and merge on 10 August; bug-fix buffer on 11 August 2026
- **Deadline:** 10 August 2026 before BE-05/BE-06 final integration
- **Sprint:** 1
- **Merge order:** 4
- **Depends on:** BE-01, BE-02, BE-03
- **Blocks:** BE-05 email delivery wiring; BE-06 verified session integration
- **Contract:** `GET /api/verifications/verify?token=...`, `POST /api/verifications/resend`
- **Owned files:** `services/verification.service.ts`, `app/api/verifications/verify/route.ts`, `app/api/verifications/resend/route.ts`, verification tests

> **Global rules:** API/DB contract is frozen by Backend Lead. Do not rename endpoints, request fields, response fields, model names, or cross-module interfaces without approval. Every secret stays server-side and must never be committed or logged.

## PIC workload split

BE-04 remains one contract, branch, PR, and acceptance gate. Service security
rules live in BE-04A; Route Handlers in BE-04B only translate HTTP and call the
service.

### BE-04A — Muhammad Marvel Sidharta

Owned workload:

- `services/verification.service.ts`;
- token lifecycle, purpose isolation, transaction, cooldown, and service tests;
- review token lifecycle and service-security acceptance criteria with BE-04B.

Required behavior:

- implement secure token generation, hashing, expiry, and one-time use;
- implement `createVerification`, `verifyToken`, and resend eligibility;
- keep RSVP and WORKSHOP purpose mutations isolated and transactional;
- return only typed server-internal results required by BE-05/BE-06;
- ensure raw token and verification URL never enter public JSON or logs.

### BE-04B — Jeremy Gerald Sutanto

Owned workload:

- `app/api/verifications/verify/route.ts`;
- `app/api/verifications/resend/route.ts`;
- verification Route Handler tests and BE-02 response mapping;
- final BE-04 PR integration and acceptance checklist.

Required behavior:

- parse query/body through BE-02 schemas and helpers;
- call BE-04A service functions without duplicating token/business rules;
- map invalid, expired, reused, cooldown, and success outcomes to the approved
  HTTP contract;
- preserve explicit integration seams for BE-05 email and BE-06 session.

Both PICs review purpose-isolation and raw-token leakage tests. They agree on
the final PR together; changes to the service result type or route/service
boundary require approval from both PICs and Backend Lead.


## Goal (1 sentence)
Create secure, expiring, one-time verification links for RSVP or workshop enrollment, with purpose-isolated resend behavior.

## Context you need to know
- Raw token must exist only transiently so it can be placed in the email URL; database stores only SHA-256 (or stronger fixed-output cryptographic hash) of the token.
- Verification success always marks token used and participant verified. It marks
  RSVP verified only when `purpose = RSVP`; `WORKSHOP` never mutates RSVP and
  activates an existing pending workshop registration.
- Session cookie creation is owned by BE-06 and is wired after this task via an explicit integration exception.
- Email delivery is owned by BE-05. This task returns an internal `verificationUrl`/raw token **only to server-side caller**, never in public API JSON.

## Work-order configuration decisions
Use server-side config, not magic numbers spread across code:
```env
APP_BASE_URL=<public application base URL>
EMAIL_VERIFICATION_TTL_MINUTES=15
EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS=60
```
If the repository has a centralized env/config module, use it. Values may be overridden by deployment; tests should set deterministic values.

## Token contract
1. Generate at least 32 random bytes using Node's cryptographically secure RNG.
2. Encode URL-safe (e.g. base64url/hex).
3. Hash raw token server-side before DB insert.
4. Persist `{ participantId, tokenHash, expiresAt, purpose }` only.
5. Verification URL format: `${APP_BASE_URL}/api/verifications/verify?token=<raw-token>` unless Backend Lead has frozen a different public host/path.
6. Never log raw token or verification URL containing raw token.

## Verify endpoint
```http
GET /api/verifications/verify?token=<verification-token>
```
Behavior:
- missing/empty token → `400`.
- hash not found → `400 Invalid verification link`.
- `verifiedAt != null` → `400 Invalid verification link` (used link must not be reusable).
- `expiresAt <= now` → `410 Verification link has expired`.
- valid → transaction:
  1. set `EmailVerification.verifiedAt = now`;
  2. set `Participant.emailVerifiedAt = now` if null;
  3. if `purpose = RSVP`, set the related pending `Rsvp.status = VERIFIED`;
  4. if `purpose = WORKSHOP`, change an existing pending
     `WorkshopRegistration` to `ACTIVE` and leave RSVP unchanged.
- after transaction, return a typed internal result containing `participantId` and
  `purpose` for BE-06 session integration.
- final HTTP success after BE-06 integration: session cookie plus `302` to
  `/event?verified=true` for RSVP or `/workshop?verified=true` for WORKSHOP.

## Resend endpoint
```http
POST /api/verifications/resend
Content-Type: application/json
```
Request:
```json
{ "email": "john@example.com", "purpose": "RSVP" }
```
Rules:
- Normalize email before lookup.
- `purpose = RSVP`: Participant and `PENDING` RSVP must exist; missing RSVP ->
  `404`, verified RSVP -> `409`.
- `purpose = WORKSHOP`: Participant and a `PENDING` or `ACTIVE`
  WorkshopRegistration must exist. Allow a fresh link while pending and after
  activation to restore a session. Do not change saved path, phone number, NIM,
  RSVP, or registration status during resend.
- Enforce cooldown using the most recent EmailVerification for the same
  participant and purpose; request inside it -> `429`.
- Invalidate only still-unused verification records for the same participant
  and purpose before creating a fresh token.
- Create and return server-internal verification URL plus purpose for BE-05
  delivery.
- Public success response after BE-05 wiring:
```http
202 Accepted
```
```json
{ "success": true, "message": "A new verification link has been sent" }
```

## Suggested steps
1. Implement secure token generator + hash helper locally to verification module.
2. Implement `createVerification(participantId, purpose)` returning server-only
   raw URL + persisted record metadata.
3. Implement `verifyToken(rawToken)` with transaction.
4. Implement purpose-specific resend eligibility + cooldown + same-purpose
   old-token invalidation.
5. Implement verify and resend routes using BE-02 helpers.
6. Add a clean server-only seam for BE-05 to call email delivery and BE-06 to
   set session/redirect from the returned purpose.
7. Write clock-controlled tests (inject/mock `now` where practical).

## Integration exceptions for later owners
- BE-05 may edit the generic resend route and the two public-entry call sites
  (`/api/rsvps`, `/api/workshops/enroll`) only to call
  `sendVerificationEmail(...)` with the URL/purpose produced here.
- BE-06 may edit only the successful generic verify-route branch to set the
  verified session cookie and redirect from the returned purpose.
- No later owner may change token lifecycle rules without BE-04 + Backend Lead approval.

## Boundary (what you must NOT touch)
- Do not send email directly to provider.
- Do not implement WhatsApp.
- Do not create RSVP or a new WorkshopRegistration. The only workshop mutation
  allowed here is atomically promoting an existing `PENDING` registration to
  `ACTIVE` after a valid WORKSHOP-purpose token.
- Do not implement submission logic.
- Do not store raw token.
- Do not expose raw token/verification URL in JSON response.
- Do not create a DB Session table.

## Done = (acceptance criteria — become tests)
- [ ] DB contains token hash, never raw token.
- [ ] RSVP-purpose token marks token, Participant, and pending RSVP in one
  transaction.
- [ ] WORKSHOP-purpose token marks token and Participant, promotes the pending
  WorkshopRegistration to `ACTIVE`, and never mutates RSVP.
- [ ] Used token cannot be used twice.
- [ ] Expired token returns `410`.
- [ ] Random/unknown token returns `400`.
- [ ] Resend on VERIFIED RSVP returns `409`.
- [ ] WORKSHOP resend requires an existing pending/active registration and
  creates no RSVP or additional WorkshopRegistration.
- [ ] Resend within cooldown returns `429`.
- [ ] Successful resend invalidates only previous unused token(s) with the same
  purpose and creates exactly one new usable token.
- [ ] Raw token is absent from application logs in tests/mocks.
- [ ] Tests cover both purposes, valid/invalid/expired/reused token, resend
  success, cooldown, and purpose isolation.
