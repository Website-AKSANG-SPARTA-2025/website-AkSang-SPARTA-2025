# SPARTA Frontend API Guide

## Read this first

All API calls below are same-origin calls to this application. The browser must **not** call Aegis directly, expose `AEGIS_VERIFICATION_API_KEY`, invent a local token, or create `participant_session` itself.

`participant_session` is an HttpOnly cookie that only the server can issue. No active backend route calls `setParticipantSessionCookie` after an Aegis verification link, so a fresh anonymous browser cannot safely use session-dependent routes. In particular, do not build a frontend flow that assumes verification alone signs the browser in. Session-dependent calls will return `401` until the backend provides a server-side session handoff.

## Shared API contract

Use JSON requests unless an endpoint explicitly requires `multipart/form-data`. Include credentials on every same-origin request so an existing server-issued cookie can be sent.

```ts
await fetch("/api/attendances", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Ada Lovelace",
    email: "ada@example.com",
    attendeeType: "STUDENT",
    institution: "Bina Nusantara",
  }),
});
```

Success responses always contain `success: true` and `data`; `message` is optional.

```json
{
  "success": true,
  "message": "Verification email has been sent",
  "data": { "attendanceId": "...", "status": "PENDING" }
}
```

Errors always contain `success: false` and `message`. Validation errors may also contain an `errors` object.

```json
{
  "success": false,
  "message": "Invalid request payload",
  "errors": {}
}
```

| Status | Frontend treatment |
| --- | --- |
| 400 | Show field/form validation feedback; do not retry unchanged data. |
| 401 | Treat as no usable participant session; do not fabricate a cookie or token. |
| 403 | Explain that the signed-in participant lacks the required workshop access. |
| 404 | Show that the participant or requested registration was not found. |
| 409 | Show the existing/finished-state conflict and avoid resubmitting. |
| 429 | Disable resend temporarily; if `errors.retryAfter` is present, use it for the countdown. |
| 502 | Show a verification/storage service outage and offer a later retry. |

## Endpoint overview

| Method and path | JSON/form input | Success result | Session requirement |
| --- | --- | --- | --- |
| `POST /api/attendances` | JSON: `name` (2–100 chars), `email`, `attendeeType` (`STUDENT` or `PUBLIC`), optional trimmed `institution` (required for `STUDENT`) | `202` pending email: `{ attendanceId, status: "PENDING" }`; if a new row is created for an Aegis-verified participant, `{ attendanceId, status: "VERIFIED", verifiedAt }` | None |
| `POST /api/attendances/confirm` | JSON: `attendeeType`, optional trimmed `institution` (required for `STUDENT`) | `200` promoted or `201` created: `{ attendanceId, status: "VERIFIED" }` | Verified participant session |
| `POST /api/workshops/enroll` | JSON: `name` (2–100 chars), `email`, `competitionPath` (`CTF`, `BCC`, `CP`), `phoneNumber` (8–20 digits, optional leading `+`), optional `nim` | `202` pending email: `{ status: "PENDING", competitionPath }`; if a new row is created for an Aegis-verified participant, `{ status: "ACTIVE", competitionPath, verifiedAt }` | None |
| `POST /api/workshops/register` | JSON: `competitionPath`, `phoneNumber`, optional `nim` | `201`: `{ id, competitionPath, invitationAvailable: true }` | Verified participant session |
| `GET /api/workshops/invitation` | None | `302` redirect to the configured community link | Verified participant session with an `ACTIVE` registration |
| `GET /api/verifications/status` | None | `{ verified, status, ... }`; status is `verified`, `not_verified`, or `not_registered` | Participant session |
| `POST /api/verifications/resend` | JSON: `email`, `purpose` (`ATTENDANCE` or `WORKSHOP`) | `202`: `{ status: "sent", expiresAt }`; already verified: `{ verified: true, status: "verified", verifiedAt }` | None |
| `POST /api/submissions` | `multipart/form-data` with exactly one `competitionPath` and one PDF `file` | `201`: `{ id, competitionPath, fileName }` | Verified participant session with an `ACTIVE` registration |

For `POST /api/submissions`, do not set a JSON content type; let the browser set the multipart boundary:

```ts
const form = new FormData();
form.set("competitionPath", "CTF");
form.set("file", pdfFile);
await fetch("/api/submissions", { method: "POST", credentials: "include", body: form });
```

## Feature flows

### Attendance

1. Submit `POST /api/attendances` with the selected classification.
2. A new row starts `PENDING`; the API asks the server to send an Aegis verification email and normally returns `202`.
3. A pending duplicate is returned without overwriting its classification. A verified duplicate is a `409` conflict.
4. A verified participant session may call `/api/attendances/confirm`. It creates a verified row when none exists, or promotes a `PENDING` row only when the submitted classification matches. It never changes a stored classification.

Do not attempt the confirmation call from a newly verified anonymous browser: the current server does not establish `participant_session` after the Aegis link.

### Workshop

1. Submit `POST /api/workshops/enroll`; this creates one `PENDING` registration and does not create Attendance.
2. A pending duplicate is returned unchanged. An `ACTIVE` duplicate is a `409` conflict.
3. When verification is synchronized server-side, `PENDING` registrations transition to `ACTIVE`.
4. Only an existing verified participant session can use `register`, `invitation`, and `submissions`. Because the session handoff is currently absent, do not present these as usable immediately after Aegis verification to a fresh browser.

### Verification status and resend

`GET /api/verifications/status` checks the current session's participant and can synchronize a verified Aegis result. `POST /api/verifications/resend` uses the submitted email and purpose, but the browser still must not contact Aegis or handle provider credentials.

## Data model reference

### Models

| Model | Field | Type / notes | Frontend visibility |
| --- | --- | --- | --- |
| Participant | `id` | CUID primary key | Server-private |
|  | `name` | String | Submitted for public entry; not returned by current routes |
|  | `email` | Unique string | Submitted for public entry; server-owned identity thereafter |
|  | `emailVerifiedAt` | Nullable timestamp | Server-private verification state |
|  | `createdAt`, `updatedAt` | Timestamps | Server-private |
| Attendance | `id` | CUID primary key | Returned only as `attendanceId` |
|  | `participantId` | Unique Participant foreign key | Server-private |
|  | `status` | `PENDING` or `VERIFIED` | Returned by attendance routes |
|  | `attendeeType` | `STUDENT` or `PUBLIC` | Submitted; not returned by current routes |
|  | `institution` | Nullable string | Submitted; not returned by current routes |
|  | `createdAt`, `updatedAt` | Timestamps | Server-private |
| WorkshopRegistration | `id` | CUID primary key | Returned by trusted registration route |
|  | `participantId` | Unique Participant foreign key | Server-private |
|  | `competitionPath` | `CTF`, `BCC`, or `CP` | Submitted and returned |
|  | `phoneNumber` | String | Submitted; not returned by current routes |
|  | `nim` | Nullable string | Submitted; not returned by current routes |
|  | `status` | `PENDING` or `ACTIVE` | Returned by enrollment route |
|  | `createdAt`, `updatedAt` | Timestamps | Server-private |
| Submission | `id` | CUID primary key | Returned on creation |
|  | `workshopRegistrationId` | WorkshopRegistration foreign key | Server-private |
|  | `competitionPath` | `CTF`, `BCC`, or `CP` | Submitted and returned |
|  | `fileName` | Sanitized display filename | Returned on creation |
|  | `storageKey` | Private object-store key | Server-private; never expose |
|  | `contentType`, `size`, `submittedAt` | Metadata and timestamp | Server-private |

### Enums and transitions

| Enum | Values |
| --- | --- |
| `AttendanceStatus` | `PENDING` → `VERIFIED` |
| `AttendeeType` | `STUDENT`, `PUBLIC` |
| `WorkshopRegistrationStatus` | `PENDING` → `ACTIVE` |
| `CompetitionPath` | `CTF`, `BCC`, `CP` |

Each Participant has zero or one Attendance and zero or one WorkshopRegistration. Each WorkshopRegistration has zero or many Submissions. Attendance and WorkshopRegistration are deleted if their Participant is deleted; Submissions belong to their WorkshopRegistration.

## Frontend integration checklist

- Use same-origin requests with `credentials: "include"`.
- Send only the documented request fields; schemas reject unknown JSON fields.
- Use JSON headers only for JSON requests; use `FormData` for submissions.
- Render the shared success/error envelope and status-specific UI treatment.
- Never create, read, or synthesize `participant_session` in browser JavaScript.
- Never call Aegis from the browser or expose its API key.
- Treat session-dependent routes as blocked for a fresh browser after email verification until the backend adds a server-side session handoff.
