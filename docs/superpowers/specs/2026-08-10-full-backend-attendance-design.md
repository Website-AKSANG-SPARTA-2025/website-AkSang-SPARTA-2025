# Full backend implementation with Attendance terminology

## Goal

Implement the complete Sprint 1 backend described by `docs/backend/tasks/`,
using Attendance rather than RSVP everywhere, while preserving the approved
workshop and submission scope.

## Governing terminology

The existing attendance design is authoritative over older work orders:

| Old term | Required term |
| --- | --- |
| `Rsvp` / `rsvp` / `RSVP` | `Attendance` / `attendance` / `ATTENDANCE` |
| `RsvpStatus` | `AttendanceStatus` |
| `Participant.rsvp` | `Participant.attendance` |
| `VerificationPurpose.RSVP` | `VerificationPurpose.ATTENDANCE` |
| `/api/rsvps` | `/api/attendances` |
| `/api/rsvps/confirm` | `/api/attendances/confirm` |

There are no compatibility exports, endpoints, aliases, or client fallbacks.

## Delivery slices

Implementation is sequenced by dependencies and reviewed after every task.

1. **Attendance foundation and verification (BE-01–04)**
   - Prisma migration, shared validation/error contract, participant and
     attendance persistence, public attendance/workshop enrollment, and
     purpose-bound verification/resend routes.
2. **Email and verified identity (BE-05–06)**
   - Server-only Resend adapter with fakes in tests, signed HttpOnly session,
     authenticated participant resolver, and Attendance confirmation.
3. **Workshop access (BE-07–08)**
   - Session-bound workshop activation and an authorized invitation redirect.
4. **R2 PDF submission (BE-09–10)**
   - Server-only PDF storage abstraction and authenticated submission with
     compensating object cleanup.

## Data model and migration

`Participant` remains the single identity source (`name`, normalized unique
`email`, `emailVerifiedAt`). It has at most one `Attendance` and one
`WorkshopRegistration`.

`Attendance` retains `PENDING | VERIFIED` lifecycle status and adds:

```prisma
enum AttendeeType {
  STUDENT
  PUBLIC
}

model Attendance {
  id            String           @id @default(cuid())
  participantId String           @unique
  status        AttendanceStatus @default(PENDING)
  attendeeType  AttendeeType
  institution   String?
}
```

Use a forward PostgreSQL migration only: rename the existing type/table and
verification enum value, add `AttendeeType`, add nullable `attendeeType` and
`institution`, backfill existing rows as `PUBLIC`, then make `attendeeType`
required. Do not add a database default and do not edit the initial migration.

`WorkshopRegistration` and `Submission` retain their approved shape: one
workshop path per participant, required phone number, optional NIM, and one or
more submission records per registration.

## Validation and HTTP contract

All JSON routes use the existing shared parsing, success envelope, and safe
error mapper. Validation is strict.

```ts
type AttendanceClassification = {
  attendeeType: "STUDENT" | "PUBLIC";
  institution?: string;
};
```

- A `STUDENT` requires a non-empty `institution` after trimming.
- A `PUBLIC` may omit `institution`; a supplied value must still be non-empty
  after trimming.
- `POST /api/attendances` accepts identity plus classification.
- `POST /api/attendances/confirm` accepts classification only; it rejects all
  identity fields and derives the participant from the verified session.
- Workshop activation accepts only `competitionPath`, required `phoneNumber`,
  and optional `nim`.
- Submission accepts multipart `competitionPath` and `file` only.

All success JSON uses `{ success: true, message?, data }`. Errors never expose
tokens, sessions, credentials, provider payloads, stack traces, or group URLs.

## Attendance, verification, and email flow

`services/participant.service.ts` owns normalized email lookup/create.
`services/attendance.service.ts` owns Attendance persistence and exposes
equivalent operations to create/reuse a pending Attendance and to confirm one
for a trusted verified participant.

Public `POST /api/attendances` creates or reuses a participant, creates or
reuses a pending Attendance, creates an `ATTENDANCE` verification, and sends
the server-only verification URL. A verified Attendance is a `409`; a repeated
pending request does not create a second row or overwrite its stored
classification.

Public `POST /api/workshops/enroll` may create/reuse a participant and a
pending workshop registration, but never creates Attendance. It creates a
`WORKSHOP` verification and sends its URL.

`services/verification.service.ts` generates at least 32 cryptographically
secure random bytes, persists only a fixed-output hash, applies configured TTL
and same-purpose resend cooldown, invalidates unused same-purpose tokens on
resend, and verifies tokens transactionally. Verification always marks the
participant email verified; `ATTENDANCE` promotes a pending Attendance, while
`WORKSHOP` promotes only a pending workshop registration to `ACTIVE`.

`POST /api/verifications/resend` accepts normalized email and
`ATTENDANCE | WORKSHOP`; it returns safe status codes without leaking whether
unrelated records exist. `ATTENDANCE` requires a pending Attendance; `WORKSHOP`
requires a pending or active workshop registration.

`NotificationService.sendVerificationEmail` is provider-neutral and calls the
official Resend SDK only through `lib/email.ts`. Failures preserve pending
database state, return a safe mapped provider error, and never log raw URLs or
tokens. Tests use fakes, never live email.

## Session and protected operations

After successful token verification, the verify route sets a stateless signed
`participant_session` cookie. Its payload contains only `participantId` and
expiry; it is HttpOnly, SameSite=Lax, path-scoped to `/`, and Secure in
production. `requireVerifiedParticipant(request)` verifies signature and
expiry, then reads `Participant` to require `emailVerifiedAt`.

Verification redirects are fixed:

- `ATTENDANCE` → `/event?verified=true`
- `WORKSHOP` → `/workshop?verified=true`

Session-bound Attendance confirmation creates a verified Attendance when none
exists. If a pending row exists, submitted classification must exactly match
the stored normalized values before promotion; a verified row returns `409`.
The server never invents a `PUBLIC` classification.

`POST /api/workshops/register` requires a verified session and creates an
`ACTIVE` workshop registration only when none exists. The reusable workshop
lookup returns only active registrations, so pending rows grant no invitation,
video, or submission access.

`GET /api/workshops/invitation` requires the session plus active registration,
then performs a `302` to the server-only community URL mapped from the saved
path. It accepts no identity values and never returns the URL as JSON.

## PDF storage and submission

`lib/r2.ts` is server-only and exposes validation, upload, and deletion of PDF
objects. It accepts only a nonempty `application/pdf` with `%PDF-` magic bytes,
enforces configured maximum size, sanitizes display filename, and generates an
unpredictable `submissions/<uuid>.pdf` key. No browser-to-R2 path or public URL
is introduced.

`POST /api/submissions` first resolves the verified participant and active
registration, then validates path and PDF, uploads to R2, and persists only
approved Submission metadata. If database insertion fails after upload, it
deletes the uploaded object once before returning a safe error. Cleanup errors
are operationally logged without bytes, secrets, or identity data.

## Security and test strategy

- All identity and authorization decisions come from the verified session or
  database; client-supplied participant, registration, or email IDs are never
  trusted for protected routes.
- Raw verification tokens, session values, credentials, R2 bytes, phone
  numbers, and NIM are not logged or exposed in responses.
- Tests are written first for new behavior, use real local logic with fakes for
  external providers, and cover all documented happy paths and rejection paths.
- Prisma validation, client generation, full unit tests, lint, and build are
  required before handoff; migration application is verified against a
  disposable local PostgreSQL database when `DATABASE_URL` is configured.

## Out of scope

No frontend redesign, compatibility API, password/OTP/account system, Session
database table, WhatsApp API, direct browser-to-R2 upload, extra attendee
types, extra workshop paths, video storage implementation, or submission
overwrite policy is added.
