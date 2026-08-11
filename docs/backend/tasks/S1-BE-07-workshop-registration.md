# S1-BE-07 — Workshop Activation & Video Eligibility

- **PIC:** Kairenzo Vemil
- **Timeline:** Implementation, review, and merge on 10 August; bug-fix buffer on 11 August 2026
- **Deadline:** 10 August 2026 before BE-08/BE-10 merge
- **Sprint:** 1
- **Merge order:** 7
- **Depends on:** BE-01, BE-02, BE-06 session resolver
- **Blocks:** workshop video access, BE-08 invitation, BE-10 submission eligibility
- **Contract:** `POST /api/workshops/register`; reusable registration lookup for protected video access
- **Owned files:** `services/workshop.service.ts` registration/eligibility methods, `app/api/workshops/register/route.ts`, workshop activation tests

> **Global rules:** API/DB contract is frozen by Backend Lead. Do not rename endpoints, request fields, response fields, model names, or cross-module interfaces without approval. Every secret stays server-side and must never be committed or logged.


## Goal (1 sentence)
Activate one workshop path for the already-verified participant without asking
for name/email again, then provide the eligibility check that gates its video
page.

## Context you need to know
- Identity comes exclusively from `requireVerifiedParticipant(request)`.
- Request must not contain name or email. It contains the clicked path, a
  required phone number, and optional NIM.
- The path is exactly one of `CTF`, `BCC`, or `CP`.
- Phone number belongs only to `WorkshopRegistration`; NIM stays optional.
- One participant has one WorkshopRegistration in current scope.
- This session-based route creates an `ACTIVE` registration. Only `ACTIVE`
  registration unlocks video, invitation, and submission eligibility.
- Attendance is not a workshop prerequisite. Any verified participant with no
  registration may activate workshop access through this route.

## Endpoint contract
```http
POST /api/workshops/register
Cookie: participant_session=...
Content-Type: application/json
```
Allowed body:
```json
{
  "competitionPath": "CTF",
  "phoneNumber": "+6281234567890",
  "nim": "13525001"
}
```
`nim` may be omitted. Do not accept identity fields. Because BE-02 schema is
strict, this must fail:
```json
{ "name": "X", "email": "x@example.com" }
```

Success:
```http
201 Created
```
```json
{
  "success": true,
  "message": "Workshop registration successful",
  "data": {
    "id": "registration123",
    "competitionPath": "CTF",
    "invitationAvailable": true
  }
}
```

Duplicate:
```http
409 Conflict
```
```json
{ "success": false, "message": "Workshop participant already registered" }
```

## Business rules — implement exactly
1. Resolve participant from verified session before processing body.
2. Missing/invalid/unverified session → `401`.
3. Validate body with strict workshop schema.
4. Create an `ACTIVE` `WorkshopRegistration` using the session-derived
   `participantId`, validated path, required phone number, and optional NIM.
5. If NIM is absent, persist `null`/undefined according to Prisma behavior; do
   not reject. Phone number is required and must be persisted only on the
   registration.
6. If participant already has a `PENDING` or `ACTIVE` registration, return
   `409`; do not update the existing row implicitly.
7. Do not generate or return group URL or raw video URL here. Return only
   `invitationAvailable: true` after successful persistence.
8. Video-page/resource handlers must authorize with verified session plus an
   `ACTIVE` registration lookup; never with client-supplied IDs.

## Suggested steps
1. Implement `registerParticipant(participantId, { competitionPath, phoneNumber, nim? })` in Workshop Service.
2. Handle DB unique constraint as `409` rather than generic `500`.
3. Implement route: require session → validate body → service → consistent response.
4. Add unit/integration tests.
5. Expose a reusable `findActiveRegistrationByParticipantId` service method for
   protected video, BE-08, and BE-10; do not make them duplicate Prisma query
   logic.

## Shared service contract for downstream owners
Provide equivalent method:
```ts
findActiveRegistrationByParticipantId(participantId: string): Promise<WorkshopRegistration | null>
```
Protected video handler, BE-08, and BE-10 should use this method rather than
reaching into registration route logic. It returns only an `ACTIVE` registration;
`PENDING` never grants access.

## Boundary (what you must NOT touch)
- Do not accept name/email in workshop body.
- Do not accept an arbitrary path or optional phone number; use the shared path
  enum and required phone-number schema.
- Do not require Attendance for workshop activation.
- Do not send invitation through WhatsApp/email.
- Do not expose any `WORKSHOP_*_COMMUNITY_LINK` here.
- Do not expose raw video-provider/storage URLs here.
- Do not modify session/token implementation.
- Do not implement submission/R2.
- Do not make NIM mandatory without Lead/PM contract change.

## Done = (acceptance criteria — become tests)
- [ ] Verified session + valid path and phone number creates one `ACTIVE`
  registration with `nim = null`/unset when NIM is omitted.
- [ ] Verified session + valid NIM stores it with the selected path and phone
  number.
- [ ] No session → `401`.
- [ ] Unverified/invalid session → `401`.
- [ ] Body containing `name` or `email` → `400`.
- [ ] Missing/invalid path or phone number → `400`.
- [ ] Duplicate pending/active participant registration → `409` and no second row.
- [ ] Success returns registration ID + selected path + `invitationAvailable: true`.
- [ ] Reusable active-registration lookup is available to protected video,
  BE-08, and BE-10.
- [ ] Verified participant without registration fails video eligibility; verified
  participant with `ACTIVE` registration passes it; `PENDING` registration fails.
