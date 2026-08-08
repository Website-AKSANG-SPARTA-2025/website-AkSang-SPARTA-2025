# S1-BE-10 — Workshop Submission PDF Flow

- **PIC:** Aditya Rasyid
- **Timeline:** Implementation after BE-06/BE-07/BE-09 merge, integration test, and merge on 10 August; bug-fix buffer on 11 August 2026
- **Deadline:** 10 August 2026 for frontend integration
- **Sprint:** 1
- **Merge order:** 10 / final feature merge before Backend Lead E2E pass
- **Depends on:** BE-01 DB, BE-02 validation/errors, BE-06 session, BE-07 registration lookup, BE-09 R2 storage
- **Contract:** `POST /api/submissions` (`multipart/form-data`)
- **Owned files:** `services/submission.service.ts`, `app/api/submissions/route.ts`, submission tests

> **Global rules:** API/DB contract is frozen by Backend Lead. Do not rename endpoints, request fields, response fields, model names, or cross-module interfaces without approval. Every secret stays server-side and must never be committed or logged.


## Goal (1 sentence)
Allow only a verified participant with an `ACTIVE` workshop registration to
submit a PDF request by validating metadata/file, uploading to R2, and
persisting database metadata without asking for email again.

## Context you need to know
Request identity comes from `participant_session` only.
A verified workshop-only participant with an `ACTIVE` WorkshopRegistration is
eligible; RSVP is not required for submission.
Request fields are exactly:
```text
competitionPath
file
```
Allowed competition paths: `CTF`, `BCC`, `CP`.
File storage implementation is owned by BE-09.

Current schema allows multiple Submission rows per WorkshopRegistration. Do **not** invent a one-submission-only or overwrite/resubmit policy in this work order. Each successful request creates a new Submission row unless Backend Lead/PM later freezes a different rule.

Do not require `competitionPath` in this request to match the saved workshop
path unless Backend Lead/PM explicitly adds that business rule.

## Endpoint contract
```http
POST /api/submissions
Cookie: participant_session=...
Content-Type: multipart/form-data
```
Form fields:
```text
competitionPath = CTF | BCC | CP
file = <PDF>
```
Success:
```http
201 Created
```
```json
{
  "success": true,
  "message": "Submission created successfully",
  "data": {
    "id": "submission123",
    "competitionPath": "CTF",
    "fileName": "solution.pdf"
  }
}
```

Not registered:
```http
403 Forbidden
```
```json
{ "success": false, "message": "Participant is not registered for the workshop" }
```

Invalid file:
```http
400 Bad Request
```
```json
{ "success": false, "message": "Only PDF files are allowed" }
```

## Processing order — do not reorder
```text
1. requireVerifiedParticipant(request)
2. find ACTIVE WorkshopRegistration by participantId
3. if absent -> 403 and STOP (do not upload)
4. parse/validate competitionPath
5. extract file
6. BE-09 validatePdf
7. BE-09 uploadPdf -> storage metadata
8. insert Submission DB metadata
9. return 201
```

## Consistency rule — mandatory orphan cleanup
If step 7 upload succeeds but step 8 DB insert fails:
```text
catch DB error
   ↓
await deleteObject(storageKey)
   ↓
rethrow safe DB/application error
```
If cleanup itself fails, log both the DB failure context and cleanup failure **without** secrets/file bytes; still return safe error to client.

## Submission record mapping
Persist exactly:
```ts
{
  workshopRegistrationId,
  competitionPath,
  fileName: stored.fileName,
  storageKey: stored.storageKey,
  contentType: stored.contentType,
  size: stored.size,
}
```
Never persist participant email/name in Submission.

## Suggested steps
1. Implement multipart parsing using the framework's existing Request/FormData APIs.
2. Resolve verified participant through BE-06.
3. Resolve ACTIVE WorkshopRegistration through BE-07 service method.
4. Validate metadata through BE-02 schema.
5. Validate/upload through BE-09 API.
6. Insert Prisma Submission.
7. Implement compensating delete on DB failure.
8. Add route/service tests with mocked session, DB, and R2.

## Boundary (what you must NOT touch)
- Do not accept `email`, `name`, `participantId`, or `workshopRegistrationId` from client.
- Do not upload before eligibility check.
- Do not implement direct browser-to-R2 upload in this sprint.
- Do not add file types other than PDF.
- Do not modify invitation flow.
- Do not invent submission overwrite/resubmit semantics.
- Do not alter Prisma schema or R2 client internals.

## Done = (acceptance criteria — become tests)
- [ ] Missing/invalid session → `401`, no R2 call.
- [ ] Verified but inactive/unregistered participant → `403`, no R2 call.
- [ ] Verified workshop-only participant with `ACTIVE` WorkshopRegistration is eligible.
- [ ] Invalid competition path → `400`, no R2 call.
- [ ] Invalid PDF → `400`, no DB insert.
- [ ] Valid request uploads one object then inserts one Submission row.
- [ ] DB row references WorkshopRegistration and stores no duplicated identity fields.
- [ ] R2 upload success + DB insert failure triggers `deleteObject(storageKey)` exactly once.
- [ ] Successful response matches documented shape.
- [ ] Tests cover happy path, 401, 403, invalid path, invalid PDF, DB-failure cleanup.
