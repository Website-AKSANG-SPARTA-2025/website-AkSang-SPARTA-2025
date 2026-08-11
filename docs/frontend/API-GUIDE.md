# SPARTA Frontend API Guide

## Read this first

All API calls below are same-origin calls to this application. The browser must **not** call Aegis directly, expose `AEGIS_VERIFICATION_API_KEY`, invent a local token, or create `participant_session` itself.

The local database is the authorization source of truth. Only the backend may set `Participant.emailVerifiedAt`, after Aegis reports that the email is verified. A frontend must never send a `verified` value or assume that clicking an Aegis link alone changes local authorization.

`participant_session` is an HttpOnly, signed cookie that only the server can issue. Aegis verifies an email; it does **not** create an application session. The production application currently has no end-user sign-in/session-handoff route, so a fresh anonymous browser will receive `401` from session-dependent routes even after it clicks the Aegis link. Do not make protected product UI available merely because email verification completed.

`POST /api/dev/auth/session` is the narrow exception for the local API tester. It is available only when `NODE_ENV=development`, requires a locally verified participant and `DEV_AUTH_TEST_SECRET`, and returns `404` outside development. It is not a production endpoint or a normal frontend authentication contract; never place its secret in frontend code.

## Backend ownership and verification flow

| Component | Responsibility |
| --- | --- |
| Frontend | Calls only this application's `/api/*` routes, renders the response envelope, and lets the browser retain an HttpOnly cookie. |
| Backend | Creates/reads local records, calls Aegis privately, syncs `emailVerifiedAt` and pending records, and enforces the signed session for protected routes. |
| Aegis | Sends the verification email and owns the external `/verify?token=...` link. The frontend and this backend never create or validate that token. |
| PostgreSQL | Stores the local participant, verification timestamp, Attendance, WorkshopRegistration, and Submission state used for authorization. |

| Step | Frontend action | Backend result |
| --- | --- | --- |
| 1. Public entry | Submit Attendance or Workshop enrollment. | Create/reuse `Participant`, create a `PENDING` record, then ask Aegis to send an email. A successful new request returns `202`. |
| 2. External verification | User opens the Aegis email link. | Aegis validates its own one-time token. No browser session is created here. |
| 3. Local synchronization | For a public entry, call resend with the original email and purpose after the link; with an existing session, call status. | `already_verified` from resend, or `verified` from status, updates `emailVerifiedAt` and promotes pending Attendance/Workshop records in one local transaction. |
| 4. Protected actions | Use an existing server-issued session cookie. | The backend verifies the cookie, loads the participant from PostgreSQL, then checks local `emailVerifiedAt` and workshop state. |

There is no unauthenticated status-check route. A button labelled “Saya sudah verifikasi” may call resend, but it must handle both outcomes: `200` means Aegis was already verified and local state is synchronized; `202` means Aegis issued a replacement link instead. It is therefore a check/resend action, not a pure status request.

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

JSON success responses contain `success: true` and `data`; `message` is optional. The exception is `GET /api/workshops/invitation`, which returns a bare `302` redirect rather than JSON, so generic response wrappers must navigate to it instead of parsing the response as JSON.

```json
{
  "success": true,
  "message": "Verification email has been sent",
  "data": { "attendanceId": "...", "status": "PENDING" }
}
```

Application-route errors contain `success: false` and `message`. Validation errors may also contain an `errors` object. The development-only session route is intentionally an exception outside development: it returns an empty `404`.

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
| 500 | Show an unexpected-server error, preserve safe form input, and offer a later retry rather than claiming success. |

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
| `POST /api/dev/auth/session` | Development JSON: `email`, `secret` | `200`: `{ email }` plus an HttpOnly cookie | Development tester only; verified local participant and valid `DEV_AUTH_TEST_SECRET`; `404` outside development |

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
4. If Aegis is temporarily unavailable, the newly created row remains `PENDING`; show a retry/resend option rather than treating the participant as verified.
5. A verified participant session may call `/api/attendances/confirm`. It creates a verified row when none exists, or promotes a `PENDING` row only when the submitted classification matches. It never changes a stored classification.

Do not attempt confirmation from a newly verified anonymous browser in the production UI: Aegis does not establish `participant_session`. The development API tester can create a test session only after local verification has been synchronized.

### Workshop

1. Submit `POST /api/workshops/enroll`; this creates one `PENDING` registration and does not create Attendance.
2. A pending duplicate is returned unchanged. An `ACTIVE` duplicate is a `409` conflict.
3. When verification is synchronized server-side, `PENDING` registrations transition to `ACTIVE`.
4. `POST /api/workshops/register` is an alternative authenticated registration path: it creates an `ACTIVE` registration only for a verified participant who has no WorkshopRegistration yet. Do not call it after public `enroll`, because that participant already has a `PENDING` or `ACTIVE` row and will receive `409`.
5. Only an existing verified participant session can use `register`, `invitation`, and `submissions`. Do not present these as usable immediately after Aegis verification to a fresh production browser; normal login/session handoff is still a backend requirement.

### Verification status and resend

`POST /api/verifications/resend` uses the submitted email and purpose, but the browser still must not contact Aegis or handle provider credentials. It is the public flow that can synchronize a freshly clicked Aegis link: if Aegis replies `already_verified`, the backend writes local verification state before returning `200`.

`GET /api/verifications/status` is deliberately session-bound and reads only the participant identified by `participant_session`; it does not accept an arbitrary email. When that local participant is already verified, it returns the local timestamp without calling Aegis. Otherwise it checks Aegis and synchronizes a `verified` result.

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
- UI: expose this only after a real production sign-in/session handoff exists. For local testing, the API tester may create its development-only session after local verification is synchronized; that helper must not be copied into product UI.

### POST /api/verifications/resend

- Session: none. Content type: `application/json`.
- Body: `email` and `purpose` (`ATTENDANCE` or `WORKSHOP`); do not call Aegis from the browser.
- Success: `202` `{ "success": true, "data": { "status": "sent", "expiresAt": "..." } }`; `200` already verified `{ "success": true, "data": { "verified": true, "status": "verified", "verifiedAt": "..." } }`.
- Errors: `400` invalid email/body, `404` participant or purpose-specific record missing, `409` attendance already verified, `429` cooldown/limit, `502` upstream failure.
- UI: this can be labelled "Check / resend verification", because it may either confirm an already verified email or send a replacement link. For `202`, confirm that a new email was sent and keep the record pending. For `200` verified, stop offering resend and refresh local UI state. On `429`, disable the button and set the countdown from `payload.errors?.retryAfter` when supplied; if absent, show the rate-limit message without inventing a duration.

```ts
const response = await fetch("/api/verifications/resend", {
  method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, purpose: "ATTENDANCE" }),
});
const payload = await response.json();
if (response.status === 429 && typeof payload.errors?.retryAfter === "number") startCountdown(payload.errors?.retryAfter);
```

### GET /api/verifications/status

- Session: participant session required (verification is not required). Content type: none; request has no body.
- Request: send no `email` query parameter or client-selected identity. The route only reads the participant in `participant_session`.
- Success: `200` verified `{ "success": true, "data": { "verified": true, "status": "verified", "verifiedAt": "..." } }`; not verified `{ "success": true, "data": { "verified": false, "status": "not_verified", "registeredAt": "...", "linkActive": true, "linkExpiresAt": "..." } }` where `linkExpiresAt` is optional; or `{ "success": true, "data": { "verified": false, "status": "not_registered" } }`.
- Errors: `401` no usable participant session, `502` verification service failure.
- UI: `linkActive: false` means the displayed verification link is inactive; offer resend rather than treating it as an active link. This call may synchronize local `PENDING` attendance/workshop state after Aegis reports verified. If the local participant is already verified, it returns local data without a needless Aegis request. A fresh anonymous browser cannot use this route until a production session flow exists.

### POST /api/dev/auth/session (development tester only)

- Availability: only when `NODE_ENV=development`. This is intentionally absent from the production API and normal frontend application.
- Body: `{ "email": "verified@example.com", "secret": "..." }`. `secret` must exactly match the server-only `DEV_AUTH_TEST_SECRET`; never put it in a source file, `NEXT_PUBLIC_*` variable, or production environment.
- Preconditions: the participant must already exist locally and have `emailVerifiedAt` set. This route does not call Aegis or trust frontend verification state.
- Success: `200` `{ "success": true, "message": "Development session created", "data": { "email": "..." } }` plus a `Set-Cookie` header. The browser stores the HttpOnly cookie automatically; JavaScript cannot read it.
- Errors: `400` invalid JSON/body, `401` incorrect development secret, `403` local email not yet verified, `404` unknown participant. Outside development it returns an empty `404`; missing server configuration returns `500`.
- UI: use only the existing `/dev/api-tester` form on a trusted local machine/network. Enter the secret manually for a test; do not persist it. Use the same hostname for session creation and subsequent protected calls because the cookie is host-specific.

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
- UI: this is only for a verified participant without a prior public enrollment. Enable invitation navigation after `201`; otherwise preserve entered values and show the relevant error. An Aegis-verified browser is still blocked from this route until a production session handoff exists.

### GET /api/workshops/invitation

- Session: verified participant with an `ACTIVE` workshop registration required. Content type: none; request has no body.
- Success: `302` to the configured community invitation for the participant's stored path. It has no JSON success envelope.
- Errors: `401` no verified session, `403` no active registration.
- UI: navigate with a plain link such as `<a href="/api/workshops/invitation">Open invitation</a>` instead of fetching and parsing a redirect response.

### POST /api/submissions

- Session: verified participant with an `ACTIVE` workshop registration required. Content type: browser-generated `multipart/form-data`.
- Form: exactly one `competitionPath` (`CTF`, `BCC`, or `CP`) and exactly one `file`; no other keys. The file must be nonempty `application/pdf`, begin with `%PDF-`, and be at most `MAX_SUBMISSION_FILE_SIZE_BYTES` (5 MiB by default).
- Success: `201` `{ "success": true, "data": { "id": "...", "competitionPath": "CTF", "fileName": "proposal.pdf" } }`.
- Errors: `400` invalid form or invalid PDF, `401` no verified session, `403` no active registration, `502` storage failure.
- UI: validate file type/size before upload, but rely on the server check; display the returned sanitized `fileName`. Do not set `Content-Type` manually. Treat `502` as server-side object-storage failure, keep the selected file available, and offer a deliberate retry.

```ts
const form = new FormData();
form.set("competitionPath", "CTF");
form.set("file", pdfFile);
await fetch("/api/submissions", { method: "POST", credentials: "include", body: form });
```

## Feature-state paths

| Start | State transition | Frontend state |
| --- | --- | --- |
| New Attendance | `PENDING` → Aegis email → local sync → `VERIFIED` | Show email pending after `202`. After the external link, public UI uses resend; an existing session may use status. Either verified response synchronizes Attendance. |
| New workshop enrollment | `PENDING` → Aegis email → local sync → `ACTIVE` | Show email pending after `202`. Do not call authenticated `register` for this same participant; local sync promotes the existing registration. |
| Resend / check | sent / already verified / cooldown / upstream failure | `202` sent with expiry; `200` verified ends resend and syncs local state; `429` disables using `errors.retryAfter`; `502` offers a later retry. |
| Development test session | locally verified participant + tester secret → HttpOnly session cookie | Development tester only. It enables protected-route testing but is `404` in production and is not a product authentication flow. |
| Verified-session actions | attendance confirmation, registration, invitation, PDF submission | Use only an existing verified session. Confirmation can promote/create Attendance; `register` creates an `ACTIVE` row only when none exists; invitation navigates by `302`; submission returns `201`. |

Production session boundary: Aegis verification alone does not issue `participant_session`. A real end-user sign-in/session-handoff route is still required before a fresh production browser can enter protected flows. The development test helper is not a substitute.

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

## Development API tester

Run `npm run dev` and open `/dev/api-tester`. The page is available only when
`NODE_ENV=development`, sends live same-origin requests, and never calls Aegis
directly. The backend developer must set `SESSION_SECRET` and a nonempty
`DEV_AUTH_TEST_SECRET` in local `.env`; neither value belongs in frontend code.

Use this exact local test sequence:

1. Create Attendance or Workshop enrollment with a test inbox.
2. Open the Aegis email link and complete its external verification.
3. Call `POST /api/verifications/resend` with the same email and purpose. A `200` verified response means the backend synchronized the local participant and pending records; a `202` means use the new link instead.
4. In the tester's development-session form, enter that verified email and the manually supplied development secret. The `200` response sets the HttpOnly cookie.
5. Test `confirm`, `status`, `register` when applicable, invitation, and submission from the same hostname.

The tester does not bypass verification. `POST /api/dev/auth/session` returns
`404` in production and must never be called by a deployed user-facing frontend.

## Frontend integration checklist

- Use same-origin requests with `credentials: "include"`.
- Send only the documented request fields; schemas reject unknown JSON fields.
- Use JSON headers only for JSON requests; use `FormData` for submissions.
- Render the shared success/error envelope and status-specific UI treatment.
- Never create, read, or synthesize `participant_session` in browser JavaScript.
- Never call Aegis from the browser or expose its API key.
- Use resend as the public check/resend action after the Aegis link; do not invent an unauthenticated status API.
- Keep protected product routes disabled for a fresh browser after email verification until the backend adds a real production sign-in/session handoff.
- Do not integrate `POST /api/dev/auth/session` into product code. It is only a manual local-tester helper and depends on a server-only secret.

### Frontend integration tests

| Check | Expected result |
| --- | --- |
| Client validation | Reject missing student institution, malformed email/phone, invalid enum, and unknown request fields before sending. |
| Pending response | A `202` attendance or enrollment response renders a verification-pending UI. |
| Duplicate conflict | A `409` verified attendance or active workshop registration renders a conflict UI and does not resubmit. |
| Verified resend sync | A `200` resend response with `data.verified: true` stops resend and refreshes the local verified state; a `202` keeps the pending screen. |
| Resend cooldown | A `429` resend response disables resend and counts down from `errors.retryAfter` when present. |
| Inactive link | Status `not_verified` with `linkActive: false` shows an inactive-link state and resend option. |
| Session-bound status | Status sends no arbitrary email query and uses only the server session. |
| Protected routes | `401` shows the session blocker; `403` explains missing active workshop registration. |
| Development tester | A locally verified test participant plus the correct manually entered secret sets a cookie only in development; the route is never used by product UI. |
| Invitation | Browser navigation to `/api/workshops/invitation` follows its `302`; no client parses a redirect response. |
| Valid PDF | One `competitionPath` plus one nonempty `application/pdf` beginning `%PDF-` uploads and handles `201`. |
| Invalid PDF | Wrong type/signature, empty/oversized file, extra form keys, or duplicate fields shows the `400` validation error. |
| Production session boundary | A newly verified anonymous browser cannot use confirm, register, invitation, or submission until a real backend login/session handoff exists. |
