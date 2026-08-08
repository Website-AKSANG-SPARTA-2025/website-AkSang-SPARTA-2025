# S1-BE-03 — Participant, RSVP & Workshop Enrollment

- **PIC:** Muhammad Orkhan (BE-03B) and Ferdinand Valentino Darmawan (BE-03A)
- **Timeline:** Implementation and review on 9 August; integration support on 10 August; bug-fix buffer on 11 August 2026
- **Deadline:** 9 August 2026 for reviewed PR; merge before BE-04 integration
- **Sprint:** 1
- **Merge order:** 3
- **Depends on:** BE-01 database; BE-02 validation/error helpers
- **Blocks:** BE-04 verification workflow
- **Contract:** `POST /api/rsvps`, `POST /api/workshops/enroll`, and the
  reusable RSVP-confirmation service consumed by BE-06
- **Owned files:** `services/participant.service.ts`, `services/rsvp.service.ts`, `app/api/rsvps/route.ts`, `app/api/workshops/enroll/route.ts`, entry-flow tests

> **Global rules:** API/DB contract is frozen by Backend Lead. Do not rename endpoints, request fields, response fields, model names, or cross-module interfaces without approval. Every secret stays server-side and must never be committed or logged.

## PIC workload split

BE-03 remains one contract, branch, PR, and acceptance gate. The `A/B` suffix
only separates file ownership so both PICs do not implement the same rule twice.

### BE-03A — Ferdinand Valentino Darmawan

Owned workload:

- `services/participant.service.ts`;
- `app/api/workshops/enroll/route.ts`;
- participant reuse and workshop-enrollment tests;
- review participant/enrollment acceptance criteria with BE-03B.

Required behavior:

- implement and freeze `findOrCreateParticipant({ name, email })`;
- own trim/lowercase normalization and race-safe unique-email reuse;
- implement `enrollWorkshop(...)` without creating an RSVP;
- preserve an existing pending registration and return `409` for active;
- expose the participant service interface before BE-03B integrates RSVP.

### BE-03B — Muhammad Orkhan

Owned workload:

- `services/rsvp.service.ts`;
- `app/api/rsvps/route.ts`;
- RSVP new/pending/verified and confirmation-service tests;
- final BE-03 PR integration and acceptance checklist.

Required behavior:

- consume BE-03A's frozen `findOrCreateParticipant` interface; do not duplicate
  participant lookup/normalization;
- implement `createOrGetPendingRsvp`, `createRsvp`, and
  `confirmRsvpForVerifiedParticipant`;
- keep public RSVP creation `PENDING` and session-confirmed RSVP `VERIFIED`;
- return the documented existing-pending response and verified conflict.

Both PICs review cross-flow tests proving workshop-only enrollment creates no
RSVP and same-email RSVP/workshop entry reuses one Participant. They agree on
the final PR together; any contract or shared-file change requires approval from
both PICs and Backend Lead.


## Goal (1 sentence)
Create/reuse one Participant from either public entry flow, create RSVP only for an explicit offline RSVP, and never duplicate identity data.

## Context you need to know
- Participant identity fields are only `name` and `email` at the public entry stage.
- `Participant.email` is unique and is the lookup key for create/reuse behavior.
- One participant has at most one optional RSVP and one optional workshop registration.
- `POST /api/rsvps` owns explicit offline RSVP creation. Workshop enrollment
  must never create an RSVP.
- Public workshop enrollment creates one `PENDING` workshop registration with
  the selected `CTF`/`BCC`/`CP` path, required phone number, and optional NIM.
- `PENDING` registration grants no protected access. BE-04 activates it after
  successful `WORKSHOP` verification.
- Final entry flows send purpose-bound verification links, but token/email
  delivery is owned by BE-04/BE-05.
- To keep this work order independently mergeable, BE-03 owns participant/RSVP
  persistence, two public entry routes, and reusable session-derived RSVP
  confirmation logic. BE-04/BE-05 wire verification dispatch
  through the approved integration seam after this task is merged.

## Endpoint contracts
```http
POST /api/rsvps
Content-Type: application/json
```
Request:
```json
{
  "name": "John Doe",
  "email": "john@example.com"
}
```
Baseline success after persistence:
```http
202 Accepted
```
```json
{
  "success": true,
  "message": "Verification link has been sent to your email",
  "data": {
    "rsvpId": "<id>",
    "status": "PENDING"
  }
}
```
For an existing `PENDING` RSVP, return `200 OK` with the existing ID/status
and no new automatic email. For an existing `VERIFIED` RSVP, return `409`.
During this work order's isolated test, the verification-dispatch dependency may
be mocked. Do not send email directly from this module.

### RSVP confirmation service for BE-06 route integration
```http
confirmRsvpForVerifiedParticipant(participantId)
```
BE-06 owns the `POST /api/rsvps/confirm` Route Handler and passes the trusted
ID returned by `requireVerifiedParticipant`. Its request body is strictly `{}`.

- no RSVP -> create `VERIFIED` RSVP and return `201`;
- existing `PENDING` RSVP -> promote it to `VERIFIED` and return `200`;
- existing `VERIFIED` RSVP -> `409`;
- do not accept identity or participant identifiers.

### Enroll in online workshop
```http
POST /api/workshops/enroll
Content-Type: application/json
```
Request:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "competitionPath": "CTF",
  "phoneNumber": "+6281234567890",
  "nim": "13525001"
}
```
Return `202 Accepted` with `{ success: true, message, data: { status:
"PENDING", competitionPath: "CTF" } }`. Create/reuse Participant and one
`PENDING` `WorkshopRegistration`, then call the BE-04/BE-05 verification-dispatch
seam with `purpose = WORKSHOP`. Do not create `Rsvp`.

For an existing `PENDING` registration, return `200 OK` with its saved status
and path; do not overwrite the path, phone number, or NIM. The frontend must
use resend for another link. An existing `ACTIVE` registration returns `409`.

## Business rules — implement exactly
1. Normalize email at service boundary using trim + lowercase before lookup/persist.
2. Trim `name`; validation length remains BE-02 schema responsibility.
3. If no Participant exists for normalized email: create Participant with `emailVerifiedAt = null`.
4. If Participant exists: reuse the same participant ID; do not create a duplicate identity row.
5. For `POST /api/rsvps`, if the participant already has an RSVP:
   - if `VERIFIED`: return conflict (`409`) rather than create another RSVP;
   - if `PENDING`: return the existing RSVP ID as pending so resend flow can be used; do not create another RSVP row.
6. A new RSVP status is always `PENDING`; this route never creates
   `WorkshopRegistration`.
7. Do not write verification-token fields in this module.
8. `POST /api/rsvps/confirm` requires the trusted verified session: create a
   `VERIFIED` RSVP if absent or promote a `PENDING` RSVP; never accept identity.
9. `POST /api/workshops/enroll` uses the same create/reuse Participant logic,
   creates no RSVP, and creates one `PENDING` WorkshopRegistration with the
   validated path, phone number, and optional NIM.
10. A repeated pending enrollment never overwrites its saved path or PII;
    active enrollment is a `409` conflict.
11. New workshop enrollment passes `participantId` and `purpose = WORKSHOP`
    only through the approved verification-dispatch seam.

## Required internal service behavior
Suggested signatures (names may adapt to repo style, semantics may not):
```ts
findOrCreateParticipant(input: { name: string; email: string })
createOrGetPendingRsvp(participantId: string)
createRsvp(input: { name: string; email: string })
confirmRsvpForVerifiedParticipant(participantId: string)
enrollWorkshop(input: {
  name: string;
  email: string;
  competitionPath: "CTF" | "BCC" | "CP";
  phoneNumber: string;
  nim?: string;
})
```
Return enough information for BE-04/BE-05 integration to request a verification
link using `participantId` + `purpose` without a second email lookup. RSVP
entry returns its `rsvpId`; workshop enrollment returns its registration status
and selected path, never raw token or invitation URL.

## Suggested steps
1. Add participant lookup/create logic using Prisma.
2. Make create/reuse race-safe by relying on DB unique constraint and handling unique-conflict retry/read.
3. Add RSVP create/get plus session-based RSVP confirmation logic.
4. Implement RSVP and workshop-enrollment routes with BE-02 schemas/error
   helpers, plus reusable RSVP-confirmation service behavior.
5. Inject/mock purpose-bound verification dispatch at the two public-entry
   route seams; do not implement token/email internals.
6. Write tests before/alongside implementation.

## Integration exception for later owners
- BE-06 owns the `POST /api/rsvps/confirm` Route Handler and calls
  `confirmRsvpForVerifiedParticipant` with its trusted participant ID.
- BE-04/BE-05 may edit only the verification-dispatch call sites in
  `app/api/rsvps/route.ts` and `app/api/workshops/enroll/route.ts` after this
  work order is approved.
- They may not rewrite participant/RSVP persistence rules, overwrite a pending
  workshop registration, or cause workshop enrollment to create an RSVP without
  BE-03 + Backend Lead approval.

## Boundary (what you must NOT touch)
- Do not implement verification token generation/hash/expiry.
- Do not call an email provider directly.
- Do not create session cookies.
- Do not add workshop/submission fields to Participant or RSVP.
- Do not accept arbitrary workshop path values; only `CTF`, `BCC`, and `CP`
  from the shared schema are valid.
- Do not move phone number or NIM onto Participant, RSVP, or a new identity
  table.
- Do not change Prisma schema or shared Zod/error contract.

## Done = (acceptance criteria — become tests)
- [ ] New email creates exactly one Participant + one `PENDING` RSVP.
- [ ] Workshop-only enrollment creates/reuses Participant, no RSVP, and exactly
  one `PENDING` WorkshopRegistration with selected path, phone number, and
  optional NIM.
- [ ] Repeated pending workshop enrollment does not overwrite its saved path,
  phone number, or NIM; active registration returns `409`.
- [ ] RSVP-confirmation service creates/promotes one `VERIFIED` RSVP from a
  trusted participant ID and accepts no identity fields.
- [ ] Same email with different casing reuses the same Participant.
- [ ] Repeated request for an existing `PENDING` RSVP does not create a second RSVP.
- [ ] Existing `VERIFIED` RSVP returns `409 Conflict`.
- [ ] Invalid request is rejected through shared validation (`400`).
- [ ] Route never writes/sends raw verification tokens.
- [ ] Tests include: RSVP new/pending/verified, workshop-only enrollment,
  repeat pending workshop enrollment, session-based RSVP confirmation, and
  invalid payload.
- [ ] Backend Lead approves before BE-04 integration.
