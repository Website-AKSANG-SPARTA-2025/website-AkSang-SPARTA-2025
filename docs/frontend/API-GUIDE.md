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

## Endpoint details

### POST /api/attendances

- Session: none. Content type: `application/json`.
- Body: `name` (2–100 characters), `email`, `attendeeType` (`STUDENT` or `PUBLIC`), and optional trimmed `institution`; `institution` is required for `STUDENT`. Unknown fields are rejected.
- Success: `202` `{ "success": true, "data": { "attendanceId": "...", "status": "PENDING" } }` after a new verification email; `200` with the same pending data for an existing pending row; or `200` `{ "success": true, "data": { "attendanceId": "...", "status": "VERIFIED", "verifiedAt": "..." } }` when Aegis already reports verification.
- Errors: `400` invalid payload/provider email, `409` already verified, `429` resend limit, `502` verification service failure.
- UI: validate first, then show a pending-email screen for `PENDING`. Do not overwrite a pending row's classification; show the `409` conflict instead of submitting again.

```ts
await fetch("/api/attendances", {
  method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name, email, attendeeType, ...(institution ? { institution } : {}) }),
});
```

### POST /api/attendances/confirm

- Session: verified participant required. Content type: `application/json`.
- Body: `attendeeType` (`STUDENT` or `PUBLIC`) and optional trimmed `institution` (required for `STUDENT`).
- Success: `200` `{ "success": true, "data": { "attendanceId": "...", "status": "VERIFIED" } }` when a matching pending row is promoted, or `201` with the same shape when created.
- Errors: `400` invalid body, `401` no verified session, `409` already verified or classification differs from the pending row.
- UI: only expose this to an existing verified session. A fresh browser that clicked an Aegis link has no server-issued session handoff and must show the current session blocker.

### POST /api/verifications/resend

- Session: none. Content type: `application/json`.
- Body: `email` and `purpose` (`ATTENDANCE` or `WORKSHOP`); do not call Aegis from the browser.
- Success: `202` `{ "success": true, "data": { "status": "sent", "expiresAt": "..." } }`; `200` already verified `{ "success": true, "data": { "verified": true, "status": "verified", "verifiedAt": "..." } }`.
- Errors: `400` invalid email/body, `404` participant or purpose-specific record missing, `409` attendance already verified, `429` cooldown/limit, `502` upstream failure.
- UI: for `202`, confirm that a new email was sent. For `200` verified, stop offering resend. On `429`, disable the button and set the countdown from `response.errors.retryAfter` when supplied; if absent, show the rate-limit message without inventing a duration.

```ts
const response = await fetch("/api/verifications/resend", {
  method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, purpose: "ATTENDANCE" }),
});
const payload = await response.json();
if (response.status === 429 && typeof payload.errors?.retryAfter === "number") startCountdown(payload.errors.retryAfter);
```

### GET /api/verifications/status

- Session: participant session required (verification is not required). Content type: none; request has no body.
- Request: send no `email` query parameter or client-selected identity. The route only reads the participant in `participant_session`.
- Success: `200` verified `{ "success": true, "data": { "verified": true, "status": "verified", "verifiedAt": "..." } }`; not verified `{ "success": true, "data": { "verified": false, "status": "not_verified", "registeredAt": "...", "linkActive": true, "linkExpiresAt": "..." } }`; or `{ "success": true, "data": { "verified": false, "status": "not_registered" } }`.
- Errors: `401` no usable participant session, `502` verification service failure.
- UI: `linkActive: false` means the displayed verification link is inactive; offer resend rather than treating it as an active link. This call may synchronize local `PENDING` attendance/workshop state after Aegis reports verified.

### POST /api/workshops/enroll

- Session: none. Content type: `application/json`.
- Body: `name` (2–100 characters), `email`, `competitionPath` (`CTF`, `BCC`, or `CP`), `phoneNumber` (8–20 digits with optional leading `+`), optional nonempty `nim`. Unknown fields are rejected.
- Success: `202` `{ "success": true, "data": { "status": "PENDING", "competitionPath": "CTF" } }`; `200` with that data for an existing pending registration; or `200` `{ "success": true, "data": { "status": "ACTIVE", "competitionPath": "CTF", "verifiedAt": "..." } }` when Aegis already reports verified.
- Errors: `400` invalid body/provider email, `409` registration already active, `429` resend limit, `502` verification service failure.
- UI: show pending-email state on `PENDING`; a pending duplicate remains unchanged. Enrollment does not create Attendance.

### POST /api/workshops/register

- Session: verified participant required. Content type: `application/json`.
- Body: `competitionPath` (`CTF`, `BCC`, or `CP`), `phoneNumber` (8–20 digits with optional leading `+`), optional nonempty `nim`.
- Success: `201` `{ "success": true, "data": { "id": "...", "competitionPath": "CTF", "invitationAvailable": true } }`.
- Errors: `400` invalid body, `401` no verified session, `409` participant already registered.
- UI: enable invitation navigation only after `201`; otherwise preserve entered values and show the relevant error. A new Aegis-verified browser is still blocked until session handoff exists.

### GET /api/workshops/invitation

- Session: verified participant with an `ACTIVE` workshop registration required. Content type: none; request has no body.
- Success: `302` to the configured community invitation for the participant's stored path. It has no JSON success envelope.
- Errors: `401` no verified session, `403` no active registration.
- UI: navigate instead of reading a fetch redirect response, for example: `window.location.assign("/api/workshops/invitation")`.

### POST /api/submissions

- Session: verified participant with an `ACTIVE` workshop registration required. Content type: browser-generated `multipart/form-data`.
- Form: exactly one `competitionPath` (`CTF`, `BCC`, or `CP`) and exactly one `file`; no other keys. The file must be nonempty `application/pdf`, begin with `%PDF-`, and be at most `MAX_SUBMISSION_FILE_SIZE_BYTES` (5 MiB by default).
- Success: `201` `{ "success": true, "data": { "id": "...", "competitionPath": "CTF", "fileName": "proposal.pdf" } }`.
- Errors: `400` invalid form or invalid PDF, `401` no verified session, `403` no active registration, `502` storage failure.
- UI: validate file type/size before upload, but rely on the server check; display the returned sanitized `fileName`. Do not set `Content-Type` manually.

```ts
const form = new FormData();
form.set("competitionPath", "CTF");
form.set("file", pdfFile);
await fetch("/api/submissions", { method: "POST", credentials: "include", body: form });
```

## Feature-state paths

| Start | State transition | Frontend state |
| --- | --- | --- |
| New Attendance | `PENDING` → Aegis email → verified local state | Show email pending after `202`; an existing participant session can call status, which synchronizes pending Attendance to `VERIFIED`. |
| New workshop enrollment | `PENDING` → Aegis email → `ACTIVE` local state | Show email pending after `202`; status synchronization promotes the registration to `ACTIVE`. |
| Resend | sent / already verified / cooldown / upstream failure | `202` sent with expiry; `200` verified ends resend; `429` disables using `errors.retryAfter`; `502` offers a later retry. |
| Verified-session actions | attendance confirmation, registration, invitation, PDF submission | Use only an existing verified session. Confirmation can promote/create Attendance; registration creates `ACTIVE`; invitation navigates by `302`; submission returns `201`. |

The current session blocker applies to every verified-session action: Aegis verification alone does not issue `participant_session`, so a fresh anonymous browser cannot enter these flows yet.

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

### Frontend integration tests

| Check | Expected result |
| --- | --- |
| Client validation | Reject missing student institution, malformed email/phone, invalid enum, and unknown request fields before sending. |
| Pending response | A `202` attendance or enrollment response renders a verification-pending UI. |
| Duplicate conflict | A `409` verified attendance or active workshop registration renders a conflict UI and does not resubmit. |
| Resend cooldown | A `429` resend response disables resend and counts down from `errors.retryAfter` when present. |
| Inactive link | Status `not_verified` with `linkActive: false` shows an inactive-link state and resend option. |
| Session-bound status | Status sends no arbitrary email query and uses only the server session. |
| Protected routes | `401` shows the session blocker; `403` explains missing active workshop registration. |
| Invitation | Browser navigation to `/api/workshops/invitation` follows its `302`; no client parses a redirect response. |
| Valid PDF | One `competitionPath` plus one nonempty `application/pdf` beginning `%PDF-` uploads and handles `201`. |
| Invalid PDF | Wrong type/signature, empty/oversized file, extra form keys, or duplicate fields shows the `400` validation error. |
| Current session blocker | A newly verified anonymous browser cannot use confirm, register, invitation, or submission until backend session handoff exists. |
