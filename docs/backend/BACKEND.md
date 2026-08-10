# AGENTS.md — SPARTA Event Platform Backend

> **Purpose of this file**
> This is the canonical operating context for Codex/AI coding agents working on the **SPARTA Event Platform backend**. It consolidates the currently approved product purpose, backend architecture, user flow, data model, API contract, security rules, development sequence, ownership boundaries, testing expectations, and known open decisions.
>
> An agent should be able to start from this document without needing the original planning conversation.

---

# 1. Read This First — Non-Negotiable Agent Rules

1. **Do not silently change product scope, API contracts, database relationships, or cross-module interfaces.**
2. **Do not invent missing product requirements.** If a requirement is explicitly marked open/unfixed in this document, preserve it as configurable/optional or report the blocker.
3. **Identity is collected exactly once: at the participant's first registration channel.** Attendance and public workshop enrollment may create or reuse `Participant`; session-based workshop activation and submission must not ask for or persist name/email again.
4. **Email verification uses a verification/magic link, not OTP.** Do not introduce OTP UI, OTP tables, or OTP endpoints.
5. **Do not add password login, refresh-token auth, or an account system.** The approved authentication mechanism for this scope is a verified email link followed by a signed HttpOnly participant session.
6. **A workshop registration requires a phone number and may include an optional NIM.** Store the phone number only on `WorkshopRegistration`; never log it or use it as authorization identity. Do not add WhatsApp API/SMS delivery.
7. **The frontend may show an invitation card only after backend activation succeeds.** Its button reaches an authenticated backend redirect that selects the WhatsApp group from the participant's saved path. Workshop video access is limited to verified participants with an `ACTIVE` `WorkshopRegistration`.
8. **Submission identity comes only from the verified session.** Never trust client-supplied `email`, `participantId`, or `workshopRegistrationId` for authorization.
9. **PDF bytes belong in Cloudflare R2; submission metadata belongs in PostgreSQL.**
10. **Raw verification tokens, session values, credentials, phone numbers, and file bytes must never be logged.**
11. **Follow existing repository conventions when they do not conflict with this contract.** Inspect the actual repo before creating duplicate utilities, configuration modules, or dependencies.
12. **Do not claim a task is complete until relevant tests/checks have actually been run and passed.**

If implementation reality conflicts with this document, stop changing the contract and surface the conflict to the Backend Lead.

---

# 2. Source-of-Truth Precedence

When instructions conflict, use this precedence order:

1. **Explicit current instruction from Backend Lead / PM**
2. **The active approved work order for the task**
3. **This `AGENTS.md`**
4. **Approved backend architecture documentation**
5. **Existing implementation**, unless the implementation is clearly legacy and conflicts with the approved contract

Never reinterpret a lower-priority source to override a higher-priority contract.

---

# 3. Project Purpose

SPARTA Event Platform supports three independent-but-connected journeys:

1. **Attendance offline event + identity verification**
2. **Online workshop path selection + gated video access**
3. **Competition/assignment PDF submission**

The core product simplification is:

> A participant enters `name` and `email` once, through either Attendance or workshop enrollment. The verified `Participant` identity is then reused for Attendance, workshop activation, invitation eligibility, video access, and submission eligibility.

Attendance is the source of the offline booth list. A workshop-only participant must never receive an `Attendance` record merely for enrolling in the online workshop.

---

# 4. Product Scope

## In scope

- Attendance using `name + email` for the offline event.
- Online workshop enrollment for exactly one selected path: `CTF`, `BCC`, or `CP`.
- Required workshop phone number and optional NIM, stored only with the workshop registration.
- Participant identity persistence shared by both entry channels.
- Email verification using a purpose-bound verification/magic link.
- Verification link expiry, one-time use, resend, and cooldown.
- Signed stateless participant session stored in an HttpOnly cookie.
- Workshop activation using participant identity from session.
- Registered-workshop video-page access control.
- Optional NIM as workshop-specific data.
- Frontend invitation UI after backend activation, with an authenticated backend redirect to the selected path's WhatsApp group.
- PDF competition submission.
- Competition path validation: `CTF`, `BCC`, `CP`.
- PostgreSQL hosted by Supabase.
- Prisma ORM.
- Cloudflare R2 for PDF objects.
- Email provider abstraction for verification emails.
- Zod server-side validation.
- Service-layer business logic.
- Consistent HTTP response/error semantics.

## Explicitly out of scope

Do **not** add any of the following unless Backend Lead/PM changes the contract:

- OTP verification.
- Password login.
- Forgot/reset-password flows.
- JWT access/refresh-token account auth.
- Database-backed Session table.
- WhatsApp API / SMS API for invitation delivery.
- Duplicate `name` or `email` fields in workshop activation or submission.
- Direct client identity parameters such as `participantId` for protected actions.
- Direct browser-to-R2 upload.
- File formats other than PDF.
- Additional competition paths beyond `CTF`, `BCC`, `CP`.
- Submission overwrite/resubmit policy not already specified.
- Multiple workshop selections per participant.
- Repository layer unless project complexity genuinely requires it and Lead approves the architectural change.

---

# 5. Core Domain Language

Use these terms consistently.

## Participant

The canonical identity record for one person.

Owns:

- `name`
- normalized `email`
- `emailVerifiedAt`

`Participant` is the **single source of truth** for identity. It may exist with Attendance only, workshop registration only, or both.

## Attendance

The participant's **offline event** attendance state. A `Participant` may have no Attendance.

Allowed states:

- `PENDING`
- `VERIFIED`

A participant has at most one Attendance in the current scope.

Every Attendance records an `attendeeType` of `STUDENT` or `PUBLIC`. A student
must also provide a non-empty `institution`; the field is optional for the public.

## EmailVerification

A one-time, expiring verification-token record for either `ATTENDANCE` or `WORKSHOP`.

The database stores only a hash of the raw token.

Its `purpose` determines the post-verification redirect and whether a pending Attendance becomes `VERIFIED`.

## Verified Session

A stateless signed cookie created only after successful email verification.

The session identifies a participant; protected routes still check the participant exists and remains verified.

## WorkshopRegistration

The participant's one selected workshop path. It starts as `PENDING` for a
new workshop-only participant and becomes `ACTIVE` after email verification.
A verified Attendance participant can create it directly as `ACTIVE`.

It owns the selected `competitionPath` (`CTF`, `BCC`, or `CP`), required
`phoneNumber`, and optional `nim`. It gates the workshop video page,
invitation UI, and submission eligibility. It does not imply Attendance.

## Workshop Invitation

The configured WhatsApp group URL for the participant's saved path. The
frontend may render an invitation card after activation, but it never receives
the raw URL. Its button uses an authenticated/authorized `302` redirect that
looks up the path server-side. It is not sent via WhatsApp API.

## Submission

Database metadata for one uploaded PDF submission associated with a `WorkshopRegistration`.

The binary PDF is stored in Cloudflare R2.

---

# 6. End-to-End User Journey

```text
Offline Attendance path
    |
    v
Attendance form: name + email + attendeeType + institution for STUDENT
    |
    v
POST /api/attendances -> Participant create/reuse + Attendance PENDING + ATTENDANCE verification link
    |
    v
GET /api/verifications/verify?token=...
    |
    +--> consume ATTENDANCE-purpose token
    +--> Participant.emailVerifiedAt = now
    +--> Attendance.status = VERIFIED
    +--> create participant_session cookie
    +--> 302 -> /event?verified=true

Online workshop path
    |
    v
Workshop page: choose exactly one path (CTF | BCC | CP)
    |
    +--> verified Attendance/session
    |      -> submit selected path + required phoneNumber + optional nim
    |      -> ACTIVE WorkshopRegistration
    |
    +--> no verified session
           -> submit name + email + selected path + required phoneNumber + optional nim
           -> Participant + PENDING WorkshopRegistration + WORKSHOP verification link
           -> consume WORKSHOP-purpose token
           -> Participant.emailVerifiedAt = now
           -> WorkshopRegistration.status = ACTIVE
           -> create participant_session cookie
           -> 302 -> /workshop?verified=true
    |
    v
Frontend renders invitation card only for ACTIVE registration
    |
    v
GET /api/workshops/invitation -> authorized 302 to selected path group
    |
    v
Submission: verified session + ACTIVE WorkshopRegistration + competitionPath + PDF
    |
    v
R2 PDF + PostgreSQL metadata
```

---

# 7. High-Level Architecture

```text
Browser / Frontend
        |
        v
Next.js Route Handlers / Server Actions
        |
        v
Zod / Server-side Validation
        |
        v
Service Layer / Business Logic
        |
        +----------------------+--------------------+
        |                      |                    |
        v                      v                    v
   Prisma ORM             Email Provider       Cloudflare R2
        |                                           |
        v                                           v
Supabase PostgreSQL                              PDF files
```

Primary services:

```text
Participant Service
Attendance Service
Verification Link Service
Workshop Service
Submission Service
Notification Service
```

Infrastructure boundaries:

- Prisma/PostgreSQL handles structured state.
- Email provider only sends verification email.
- R2 stores PDF bytes.
- Workshop invitation does not require an external messaging provider.

---

# 8. Architectural Responsibility Rules

## Route Handler

Route handlers should:

- receive HTTP request;
- parse body/query/form data;
- resolve participant session where required;
- invoke Zod validation;
- call service-layer functions;
- translate domain/application errors to HTTP responses;
- set cookies/redirects when appropriate.

Route handlers should **not** contain complex business logic.

## Zod / Validation Layer

Validation layer owns request shape and basic format validation.

It does not decide eligibility or persistence business rules.

## Service Layer

Service layer owns business rules and orchestration.

Examples:

- participant create/reuse;
- Attendance duplicate behavior;
- verification-token lifecycle;
- workshop registration eligibility;
- submission workflow and compensating cleanup.

## Prisma

Prisma owns database access, relations, migration, constraints, and transactional updates.

## Notification Service

Notification Service is an abstraction around the configured email provider.

It must not leak provider details into Attendance/verification domain logic.

## R2 Storage Layer

R2 client/helper owns PDF validation/storage/deletion behavior, not participant eligibility or submission DB persistence.

---

# 9. Approved Data Model

Implement/maintain the following domain shape unless Lead explicitly changes it.

```prisma
enum AttendanceStatus {
  PENDING
  VERIFIED
}

enum AttendeeType {
  STUDENT
  PUBLIC
}

enum CompetitionPath {
  CTF
  BCC
  CP
}

enum VerificationPurpose {
  ATTENDANCE
  WORKSHOP
}

enum WorkshopRegistrationStatus {
  PENDING
  ACTIVE
}

model Participant {
  id              String    @id @default(cuid())
  name            String
  email           String    @unique
  emailVerifiedAt DateTime?

  attendance           Attendance?
  verifications        EmailVerification[]
  workshopRegistration WorkshopRegistration?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Attendance {
  id            String           @id @default(cuid())
  participantId String           @unique
  status        AttendanceStatus @default(PENDING)
  attendeeType  AttendeeType
  institution   String?

  participant Participant @relation(
    fields: [participantId],
    references: [id],
    onDelete: Cascade
  )

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model EmailVerification {
  id            String   @id @default(cuid())
  participantId String
  tokenHash     String   @unique
  expiresAt     DateTime
  verifiedAt    DateTime?
  purpose       VerificationPurpose
  createdAt     DateTime @default(now())

  participant Participant @relation(
    fields: [participantId],
    references: [id],
    onDelete: Cascade
  )

  @@index([participantId, purpose, createdAt])
  @@index([expiresAt])
}

model WorkshopRegistration {
  id              String                     @id @default(cuid())
  participantId   String                     @unique
  competitionPath CompetitionPath
  phoneNumber     String
  nim             String?
  status          WorkshopRegistrationStatus @default(PENDING)

  participant Participant @relation(
    fields: [participantId],
    references: [id],
    onDelete: Cascade
  )

  submissions Submission[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([competitionPath])
}

model Submission {
  id                     String          @id @default(cuid())
  workshopRegistrationId String
  competitionPath        CompetitionPath
  fileName                String
  storageKey              String
  contentType             String
  size                    Int

  workshopRegistration WorkshopRegistration @relation(
    fields: [workshopRegistrationId],
    references: [id],
    onDelete: Cascade
  )

  submittedAt DateTime @default(now())

  @@index([workshopRegistrationId])
}
```

## Important data-model consequences

- `Participant.email` is unique.
- Email must be normalized before participant lookup/persistence.
- `Attendance.participantId` is unique.
- `Attendance.attendeeType` is required; `institution` is required by the
  request contract for `STUDENT` and optional for `PUBLIC`.
- `WorkshopRegistration.participantId` is unique.
- A participant may exist with no `Attendance`, no `WorkshopRegistration`, or both.
- A participant chooses exactly one workshop path: `CTF`, `BCC`, or `CP`.
- `WorkshopRegistration.competitionPath` reuses the approved path enum so the
  group selection is server-validated rather than free text.
- `WorkshopRegistration.phoneNumber` is required and is workshop-only PII; it
  is not duplicated on `Participant` and must never be logged.
- `nim` is optional.
- A `PENDING` workshop registration grants no protected access. Only `ACTIVE`
  registration grants video, invitation, and submission eligibility.
- Raw verification token has no database column.
- There is no Session table.
- Submission does not duplicate participant name/email.
- Current schema permits multiple `Submission` rows per workshop registration.
- Do not invent a resubmission/overwrite rule.

---

# 10. Approved Validation Contracts

Use strict JSON-body validation where noted so prohibited fields are rejected rather than silently discarded.

```ts
createAttendanceSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  attendeeType: z.enum(["STUDENT", "PUBLIC"]),
  institution: z.string().trim().min(1).optional(),
}).strict()
  .refine(({ attendeeType, institution }) => attendeeType !== "STUDENT" || Boolean(institution), {
    message: "Institution is required for students",
  })

confirmAttendanceSchema = z.object({
  attendeeType: z.enum(["STUDENT", "PUBLIC"]),
  institution: z.string().trim().min(1).optional(),
}).strict()
  .refine(({ attendeeType, institution }) => attendeeType !== "STUDENT" || Boolean(institution), {
    message: "Institution is required for students",
  })

createWorkshopEnrollmentSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  competitionPath: z.enum(["CTF", "BCC", "CP"]),
  phoneNumber: z.string().trim().regex(/^\+?[0-9]{8,20}$/),
  nim: z.string().min(1).optional(),
}).strict()

verifyEmailSchema = z.object({
  token: z.string().min(1),
})

resendVerificationSchema = z.object({
  email: z.string().email(),
  purpose: z.enum(["ATTENDANCE", "WORKSHOP"]),
}).strict()

registerWorkshopSchema = z.object({
  competitionPath: z.enum(["CTF", "BCC", "CP"]),
  phoneNumber: z.string().trim().regex(/^\+?[0-9]{8,20}$/),
  nim: z.string().min(1).optional(),
}).strict()

submissionSchema = z.object({
  competitionPath: z.enum(["CTF", "BCC", "CP"]),
})
```

The session-based workshop registration request must reject identity fields such
as `name` and `email`. `phoneNumber` must contain 8–20 digits with an optional
leading `+`; clients should submit the canonical form they want stored.

File validation is separate from `submissionSchema`.

---

# 11. API Contract Overview

The approved API surface is:

```text
POST /api/attendances
POST /api/attendances/confirm
POST /api/workshops/enroll
GET  /api/verifications/verify?token=...
POST /api/verifications/resend
POST /api/workshops/register
GET  /api/workshops/invitation
POST /api/submissions
```

Do not rename these routes without approval.

---

# 12. API — Attendance and Workshop Enrollment

The two public entry endpoints collect identity only for their own journey.
They create or reuse the same `Participant`; neither endpoint implies the other
journey. A frontend with an active verified session should use the session-based
action instead of asking for identity again.

## Create Offline Attendance

```http
POST /api/attendances
Content-Type: application/json
```

Request:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "attendeeType": "STUDENT",
  "institution": "Institut Teknologi Bandung"
}
```

New Attendance success:

```http
202 Accepted
```

```json
{
  "success": true,
  "message": "Verification link has been sent to your email",
  "data": {
    "attendanceId": "<id>",
    "status": "PENDING"
  }
}
```

An already-pending Attendance returns `200 OK` with the same data and a message
that it is awaiting verification. It must not send another link automatically;
the frontend uses `POST /api/verifications/resend` when the participant asks
for a new link.

Attendance business rules:

1. Trim name and trim/lowercase email before lookup and persistence.
2. Create a new `Participant` only when the normalized email does not exist;
   otherwise reuse it.
3. Create one `Attendance(status = PENDING)` only when the participant has no Attendance.
4. Existing `PENDING` Attendance -> return it without creating another Attendance.
5. Existing `VERIFIED` Attendance -> `409 Conflict`.
6. A new Attendance creates an `ATTENDANCE`-purpose verification link.
7. This route never creates `WorkshopRegistration`.
8. Participant/Attendance/verification persistence is not rolled back merely because
   external email delivery fails; the participant can resend.

## Confirm Offline Attendance from a Verified Session

```http
POST /api/attendances/confirm
Cookie: participant_session=...
Content-Type: application/json
```

Request body contains only the attendance classification:

```json
{
  "attendeeType": "STUDENT",
  "institution": "Institut Teknologi Bandung"
}
```

Success:

```http
201 Created
```

```json
{
  "success": true,
  "message": "Attendance confirmed",
  "data": {
    "attendanceId": "<id>",
    "status": "VERIFIED"
  }
}
```

Rules:

1. Resolve the participant with `requireVerifiedParticipant`; missing,
   invalid, or unverified session -> `401`.
2. No Attendance -> create `Attendance(status = VERIFIED)` with the submitted classification.
3. Existing `PENDING` Attendance -> promote it to `VERIFIED` only when the saved
   `attendeeType` and `institution` exactly match the submitted classification.
4. Existing `VERIFIED` Attendance or a pending classification mismatch -> `409 Conflict`.
5. Do not accept `name`, `email`, `participantId`, or any fields beyond classification.
6. Do not create or consume a verification token: the session already proves
   the verified participant identity.

This endpoint is the preferred Attendance action for a participant who first
verified through the workshop journey.

## Enroll in the Online Workshop

The workshop page presents buttons for the three allowed paths: `CTF`, `BCC`,
and `CP`. A participant can choose exactly one. The clicked button supplies
`competitionPath`; the backend validates it and never accepts arbitrary path
or group URL values.

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

Success:

```http
202 Accepted
```

```json
{
  "success": true,
  "message": "Verification link has been sent to your email",
  "data": {
    "status": "PENDING",
    "competitionPath": "CTF"
  }
}
```

Rules:

1. Trim name and trim/lowercase email before lookup and persistence. Validate
   `competitionPath` as exactly `CTF`, `BCC`, or `CP`; validate and store the
   canonical `phoneNumber`; `nim` remains optional.
2. Create or reuse `Participant` exactly as the Attendance route does.
3. When the participant has no workshop registration, create exactly one
   `WorkshopRegistration(status = PENDING)` containing its path, phone number,
   and optional NIM.
4. Create a fresh `WORKSHOP`-purpose verification link and send it by email.
5. This route never creates an `Attendance`.
6. A participant with an active verified session uses
   `POST /api/workshops/register` instead; the frontend need only collect the
   selected path, phone number, and optional NIM, never name/email again.
7. An existing `PENDING` registration returns its existing pending state and
   does not overwrite the selected path or PII; use resend for another link.
   An existing `ACTIVE` registration returns `409 Conflict`.
8. Participant/registration/verification persistence is not rolled back merely
   because external email delivery fails.

---

# 13. API — Verify Email Link

```http
GET /api/verifications/verify?token=<raw-verification-token>
```

## Token lifecycle

- Generate at least **32 cryptographically secure random bytes**.
- Encode URL-safe (`base64url`, hex, or equivalent).
- Hash raw token before persistence.
- Use SHA-256 or stronger fixed-output cryptographic hash.
- Persist only:

```text
participantId
tokenHash
expiresAt
verifiedAt
purpose
createdAt
```

- Never log the raw token.
- Never expose the raw token in normal API JSON.

Default verification URL:

```text
${APP_BASE_URL}/api/verifications/verify?token=<raw-token>
```

unless Backend Lead has frozen a different deployment host/path.

## Verify behavior

- missing/empty/malformed token -> `400`;
- unknown token hash -> `400 Invalid verification link`;
- already consumed token -> `400 Invalid verification link`;
- expired token -> `410 Verification link has expired`;
- valid token -> one database transaction:
  1. set `EmailVerification.verifiedAt = now`;
  2. set `Participant.emailVerifiedAt = now` if null;
  3. when `purpose = ATTENDANCE`, set the related pending
     `Attendance.status = VERIFIED`;
  4. when `purpose = WORKSHOP`, set the participant's pending
     `WorkshopRegistration.status = ACTIVE` when one exists; never create,
     update, or infer an `Attendance`.

After the successful transaction:

- create a verified participant session;
- set the `participant_session` cookie;
- return a `302` redirect based on token purpose:

```text
ATTENDANCE -> /event?verified=true
WORKSHOP  -> /workshop?verified=true
```

Verification state transition must be atomic.

---

# 14. API — Resend Verification Link

```http
POST /api/verifications/resend
Content-Type: application/json
```

Request:

```json
{
  "email": "john@example.com",
  "purpose": "ATTENDANCE"
}
```

`purpose` is exactly one of `ATTENDANCE` or `WORKSHOP`.

Rules:

1. Trim/lowercase email before lookup.
2. For `ATTENDANCE`: participant and a `PENDING` Attendance must exist. Missing Attendance ->
   `404`; a `VERIFIED` Attendance -> `409`.
3. For `WORKSHOP`: participant and a `PENDING` or `ACTIVE`
   `WorkshopRegistration` must exist. A fresh link is allowed for `PENDING`
   registration and after activation so the participant can restore a session.
   Resend never changes the saved path, phone number, NIM, Attendance, or registration
   state.
4. The resend cooldown is calculated from the latest verification record for
   the same participant and purpose. A request inside the cooldown -> `429`.
5. Invalidate only still-unused verification records with the same participant
   and purpose before issuing one fresh token. Never invalidate the other
   journey's link.
6. Send the matching verification email.
7. Never expose the raw verification link in public JSON.

Success:

```http
202 Accepted
```

```json
{
  "success": true,
  "message": "A new verification link has been sent"
}
```

---

# 15. Verification Email Contract

Email is used only for verification in the current backend scope.

Required server-side service semantics:

```ts
type SendVerificationEmailInput = {
  to: string;
  participantName: string;
  verificationUrl: string;
  purpose: "ATTENDANCE" | "WORKSHOP";
};

sendVerificationEmail(input): Promise<void>
```

Email content must include:

- participant name;
- a purpose-matching CTA/link: **Verify Attendance** or **Verify Workshop Access**;
- indication that link expires;
- no OTP;
- no workshop group invitation.

## Provider policy

**Resend is the approved verification-email provider for Sprint 1.**

- Install the official Node SDK: `npm install resend`.
- `RESEND_API_KEY` stores the Resend API key; `EMAIL_FROM` must be a verified sender on the configured Resend domain.
- Keep Resend behind `NotificationService`; Attendance and verification services must not import the `resend` package directly.
- Use a fake notification adapter in unit tests; tests must not send live email.
- The Resend Free plan was verified on 2026-08-07 as 3,000 emails/month, capped at 100 emails/day, with one custom domain. Upgrade before the event if expected verification traffic exceeds either limit.

If provider delivery fails:

- Participant/verification state remains persisted;
- a new Attendance remains pending if it was the Attendance journey;
- return/log a safe external-provider failure;
- resend remains available.

Never log `verificationUrl`, because it contains the raw token.

---

# 16. Verified Session Contract

There is **no Session database table** in this sprint.

Use a stateless cryptographically signed token stored in an HttpOnly cookie.

## Configuration

```env
SESSION_SECRET=<minimum 32 random bytes, server-only>
SESSION_TTL_DAYS=7
```

Cookie name:

```text
participant_session
```

Payload contains only:

```ts
{
  participantId: string;
  exp: number;
}
```

Do not store name, email, NIM, phone number, verification token, or secrets in
the session token.

Production cookie attributes:

```text
HttpOnly=true
Secure=true
SameSite=Lax
Path=/
Max-Age=<derived from SESSION_TTL_DAYS>
```

For local HTTP development, `Secure=false` may be permitted only through environment-aware configuration. Production must force `Secure=true`.

## Required helper semantics

Provide equivalents of:

```ts
createParticipantSession(participantId)
setParticipantSessionCookie(response, participantId)
readParticipantSession(request)
requireVerifiedParticipant(request)
clearParticipantSessionCookie(response)
```

`requireVerifiedParticipant(request)` must:

1. read and verify signature;
2. verify expiration;
3. return `401` for missing, malformed, tampered, or expired session;
4. query Participant by ID;
5. return `401` if Participant does not exist;
6. return `401` if `emailVerifiedAt` is null;
7. return trusted participant identity to caller.

Never authorize a protected route from a participant ID supplied by the client.

---

# 17. API — Workshop Activation

```http
POST /api/workshops/register
Cookie: participant_session=...
Content-Type: application/json
```

The workshop page supplies `competitionPath` from the workshop button the
participant clicked. The participant enters a required phone number and may
enter an optional NIM.

```json
{
  "competitionPath": "CTF",
  "phoneNumber": "+6281234567890",
  "nim": "13525001"
}
```

The following is invalid and must be rejected:

```json
{
  "name": "X",
  "email": "x@example.com"
}
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
{
  "success": false,
  "message": "Workshop participant already registered"
}
```

## Workshop rules

1. Resolve participant using `requireVerifiedParticipant` before business processing.
2. Missing/invalid/unverified session -> `401`.
3. This activates the online workshop after verification; it is not the public
   identity-entry endpoint.
4. Workshop request body is strict. It requires `competitionPath` (`CTF`,
   `BCC`, or `CP`) and `phoneNumber`; identity fields are forbidden.
5. `nim` is optional in the current contract. `phoneNumber` is required and
   stored only on the registration, never used as authorization identity.
6. Create one `ACTIVE` registration using the session-derived `participantId`.
7. Existing registration -> `409`; do not silently update its selected path,
   phone number, or NIM.
8. Registration response does not contain the group URL or a raw video URL.
9. It returns `invitationAvailable: true` after successful activation so the
   frontend can render its invitation card.
10. Expose a reusable service lookup equivalent to:

```ts
findActiveRegistrationByParticipantId(participantId: string)
```

for invitation, video access, and submission eligibility checks. It returns an
`ACTIVE` registration only, so a pending record can never grant protected access.

## Workshop video access

The workshop page/video handler must resolve the verified session and call
`findActiveRegistrationByParticipantId(participantId)` before rendering or
retrieving any protected video resource:

```text
missing/invalid/unverified session          -> 401 or sign-in redirect
verified participant without ACTIVE registration -> 403 or activation redirect
verified participant with ACTIVE registration    -> allow video page
```

There is no separate public video-access API in this contract. Do not expose a
raw provider/storage URL to unregistered visitors. The video-hosting provider
and its token/signed-URL mechanism are an open deployment decision; Cloudflare
R2 remains scoped to PDF submissions only.

---

# 18. API — Workshop Invitation

Frontend integration target is fixed:

```text
/api/workshops/invitation
```

After a successful activation response, the frontend may render an invitation
card and its **Join Community / Group** button should navigate to this backend
route. The frontend must not receive or embed a raw WhatsApp URL.

```http
GET /api/workshops/invitation
Cookie: participant_session=...
```

Behavior:

1. missing/invalid/unverified session -> `401`;
2. verified participant without an `ACTIVE` `WorkshopRegistration` -> `403`;
3. active participant -> resolve the saved `competitionPath` and return `302
   Found` with `Location` set to that path's server-only WhatsApp group URL;
4. missing/invalid server invitation config for the saved path -> safe `500` +
   operational log without PII or URL values.

## Invitation security

- Invitation URL is server-only configuration.
- Do not embed it in frontend/public environment configuration.
- Do not return it in error JSON.
- Do not accept participant email/ID/registration ID as identity input.
- The frontend may show only an invitation card/button after backend activation;
  it must navigate to this authorized redirect rather than receive a URL.
- Do not add WhatsApp/SMS/email delivery for the invitation.

---

# 19. R2 PDF Storage Contract

Required server-only configuration:

```env
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_ENDPOINT=
MAX_SUBMISSION_FILE_SIZE_BYTES=5242880
```

`5242880` = 5 MiB and is the current Sprint 1 implementation default. Deployment may override via server environment configuration.

Required equivalent storage API:

```ts
type UploadPdfInput = {
  bytes: Uint8Array | Buffer;
  originalFileName: string;
  contentType: string;
};

type StoredObject = {
  storageKey: string;
  fileName: string;
  contentType: string;
  size: number;
};

validatePdf(input): void
uploadPdf(input): Promise<StoredObject>
deleteObject(storageKey: string): Promise<void>
```

## PDF validation rules

1. File must exist.
2. File size must be greater than zero.
3. File size must be <= configured maximum.
4. MIME must equal `application/pdf`.
5. First bytes must match PDF magic `%PDF-`.
6. Filename must be sanitized for metadata/display.
7. Raw client filename must not become the R2 object key.
8. Object key is generated server-side, e.g. `submissions/<uuid>.pdf`.
9. R2 credentials remain server-only.
10. Do not expose signed/public R2 URLs unless contract changes.

Storage provider errors must become safe application errors.

Unit tests must use a fake/mock R2 adapter rather than live network calls.

---

# 20. API — Submission

```http
POST /api/submissions
Cookie: participant_session=...
Content-Type: multipart/form-data
```

Client form fields are exactly:

```text
competitionPath = CTF | BCC | CP
file = <PDF>
```

Do not accept:

- `email`
- `name`
- `participantId`
- `workshopRegistrationId`

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
{
  "success": false,
  "message": "Participant is not registered for the workshop"
}
```

Invalid PDF:

```http
400 Bad Request
```

```json
{
  "success": false,
  "message": "Only PDF files are allowed"
}
```

## Mandatory processing order

Do not reorder this workflow:

```text
1. requireVerifiedParticipant(request)
2. find ACTIVE WorkshopRegistration by participantId
3. if missing -> 403 and STOP; do not upload
4. parse/validate competitionPath
5. extract file
6. validatePdf
7. uploadPdf -> StoredObject
8. insert Submission metadata
9. return 201
```

## Mandatory orphan cleanup

If R2 upload succeeds but database insert fails:

```text
catch DB error
    |
    v
await deleteObject(storageKey)
    |
    v
rethrow safe application/database error
```

If cleanup itself fails, log operational context for both failures without logging secrets or file bytes.

Persist exactly the approved metadata shape:

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

Current data model allows multiple successful Submission rows per registration. Do not invent one-submission-only, update, overwrite, or resubmit behavior.

---

# 21. Standard HTTP Status Semantics

| Status | Meaning in this backend |
|---|---|
| `200 OK` | Generic successful request |
| `201 Created` | Resource created |
| `202 Accepted` | Attendance or workshop enrollment accepted, awaiting verification |
| `302 Found` | Successful verification redirect or group invitation redirect |
| `400 Bad Request` | Invalid payload, token, competition path, or file |
| `401 Unauthorized` | Missing/invalid/unverified participant session |
| `403 Forbidden` | Verified participant is not eligible for workshop video, invitation, or submission |
| `404 Not Found` | Requested Attendance, participant, or resource not found |
| `409 Conflict` | Duplicate/already-completed state |
| `410 Gone` | Expired verification link |
| `429 Too Many Requests` | Verification resend/rate-limit condition |
| `500 Internal Server Error` | Unexpected/internal configuration error |
| `502 Bad Gateway` | External provider failure surfaced to client |

Do not invent route-specific semantics that contradict this table.

---

# 22. Standard API Response Contract

Success:

```json
{
  "success": true,
  "data": {}
}
```

Success with message:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Error description"
}
```

Validation error:

```json
{
  "success": false,
  "message": "Invalid request payload",
  "errors": {}
}
```

Use a stable domain/application error abstraction containing equivalent fields:

```ts
{
  code: string;
  status: number;
  message: string;
  details?: unknown;
}
```

Typical codes include:

```text
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
CONFLICT
EXPIRED
EXTERNAL_PROVIDER_ERROR
```

Never return stack traces, raw provider errors, tokens, cookies, or credentials.

---

# 23. Transaction and Consistency Rules

## Verification transaction

The following must succeed atomically:

```text
consume EmailVerification
+ verify Participant email
+ if purpose = ATTENDANCE, mark the pending Attendance VERIFIED
+ if purpose = WORKSHOP, activate the pending WorkshopRegistration and leave Attendance unchanged
```

Use a database transaction.

## Email provider is not transactional with PostgreSQL

If email delivery fails after persistence:

- do not delete the Participant;
- do not delete the related Attendance when one exists;
- do not fake verification success;
- keep the user eligible to resend.

## R2 is not transactional with PostgreSQL

If R2 upload succeeds and DB insert fails, perform compensating deletion of the R2 object.

---

# 24. Security Requirements

## General

Treat every client value as untrusted.

Perform server-side validation for:

- Attendance and workshop-enrollment fields;
- Attendance confirmation and workshop-activation payloads;
- required workshop phone number and selected `CTF`/`BCC`/`CP` path;
- verification token;
- verification purpose for resend;
- session;
- workshop eligibility;
- competition path;
- PDF MIME/size/signature.

## Verification link

- cryptographically secure random token;
- at least 32 random bytes;
- hashed before persistence;
- expiring;
- one-time use;
- purpose-bound (`ATTENDANCE` or `WORKSHOP`);
- resend cooldown;
- resend invalidates only tokens of the same purpose;
- raw token absent from logs;
- raw token absent from normal API JSON.

## Session

- signed cryptographically;
- HttpOnly cookie;
- `Secure=true` in production;
- `SameSite=Lax`;
- session payload only `participantId + exp`;
- protected routes re-query participant verification state.

## Database

- Prisma runs server-side only;
- database credentials never enter browser bundle;
- `DATABASE_URL` is server-only and production connections must use TLS;
- deployment uses a dedicated least-privilege database role, never an owner or
  superuser credential for normal application traffic;
- the production database and backups must use provider-managed encryption at
  rest, restricted administrative access, and tested restore procedures;
- browser clients never connect directly to PostgreSQL and never receive a
  Supabase database/service credential;
- phone number is PII: store it only on `WorkshopRegistration`, return it only
  when an approved UI requires it, and never include it in logs or error data;
- define and enforce a retention/deletion policy for participant PII before
  production launch;
- use unique constraints for uniqueness; do not rely only on `SELECT` then `INSERT`;
- handle unique-conflict races intentionally.

## Files

- PDF only;
- validate MIME and `%PDF-` signature;
- maximum size enforced server-side;
- sanitize filename;
- server-generated storage key;
- R2 credentials server-only.

## Invitation

- server-side `WORKSHOP_CTF_COMMUNITY_LINK`,
  `WORKSHOP_BCC_COMMUNITY_LINK`, and `WORKSHOP_CP_COMMUNITY_LINK`;
- authorization and `ACTIVE` registration lookup on every invitation request;
- resolve the correct group from the saved `competitionPath` only;
- frontend may display an invitation card after activation but never embeds or
  receives a secret invitation link.

## Workshop video

- require a verified participant session and `ACTIVE` WorkshopRegistration on every
  protected video-page/resource request;
- do not authorize by a client-supplied participant or registration ID;
- do not expose raw video-provider/storage URLs to unregistered visitors;
- R2 is not the workshop-video storage contract.

---

# 25. Logging Policy

Log operationally useful events such as:

- unexpected application error;
- provider delivery failure;
- failed database operation;
- failed R2 upload;
- failed orphan cleanup;
- missing server configuration.

Never log:

- raw email verification token;
- full verification URL containing raw token;
- session cookie/token value;
- `SESSION_SECRET`;
- email/R2 API credentials;
- database password;
- participant phone number;
- uploaded file bytes.

Use safe identifiers/correlation IDs if the repository already provides them.

---

# 26. Rate-Limit Targets

Rate limiting is recommended for:

```text
POST /api/attendances
POST /api/attendances/confirm
POST /api/workshops/enroll
POST /api/verifications/resend
POST /api/workshops/register
GET  /api/workshops/invitation
POST /api/submissions
```

Highest priority is creation/resend of verification links to reduce email spam.

The exact global middleware/rate-limit implementation is **not assigned/frozen in the current work orders**. Do not introduce a new infrastructure dependency solely for rate limiting unless requested by the Backend Lead.

---

# 27. Environment Contract

All secrets are server-only.

```env
# Database
DATABASE_URL=

# Public application base used to build verification links
APP_BASE_URL=

# Verification defaults
EMAIL_VERIFICATION_TTL_MINUTES=15
EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS=60

# Signed participant session
SESSION_SECRET=
SESSION_TTL_DAYS=7

# Verification email provider (Resend)
RESEND_API_KEY=
EMAIL_FROM=

# Workshop invitation: one server-only URL per allowed path
WORKSHOP_CTF_COMMUNITY_LINK=
WORKSHOP_BCC_COMMUNITY_LINK=
WORKSHOP_CP_COMMUNITY_LINK=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_ENDPOINT=

# Submission file limit
MAX_SUBMISSION_FILE_SIZE_BYTES=5242880
```

Implementation should use an existing centralized env/config module if present.

Do not spread magic numbers or repeated `process.env` parsing across unrelated modules when the repository already has a config convention.

---

# 28. Suggested Project Structure

This repository uses root-level `app/`, `services/`, `schemas/`, and `lib/` directories; do not introduce a `src/` wrapper. Adapt only when an existing repository convention requires it.

```text
Repository root
├── app/
│   ├── api/
│   │   ├── attendances/
│   │   │   ├── route.ts
│   │   │   └── confirm/
│   │   │       └── route.ts
│   │   │
│   │   ├── verifications/
│   │   │   ├── verify/
│   │   │   │   └── route.ts
│   │   │   └── resend/
│   │   │       └── route.ts
│   │   │
│   │   ├── workshops/
│   │   │   ├── enroll/
│   │   │   │   └── route.ts
│   │   │   ├── register/
│   │   │   │   └── route.ts
│   │   │   └── invitation/
│   │   │       └── route.ts
│   │   │
│   │   └── submissions/
│   │       └── route.ts
│   │
│   └── ...
│
├── services/
│   ├── participant.service.ts
│   ├── attendance.service.ts
│   ├── verification.service.ts
│   ├── workshop.service.ts
│   ├── submission.service.ts
│   └── notification.service.ts
│
├── schemas/
│   └── index.ts
│
├── lib/
│   ├── prisma.ts
│   ├── r2.ts
│   ├── email.ts
│   └── session.ts
│
├── errors/
│   └── application-error.ts
│
prisma/
├── schema.prisma
└── migrations/
```

A separate repository layer is not required for this scope if services + Prisma remain simple.

---

# 29. Team Development Model

The backend team consists of:

- **1 Backend Lead / final reviewer**
- **10 backend members**

There is **no buddy-review system**.

All development belongs to **one sprint** because project duration is short.

Each member has one core domain ownership.

The Backend Lead owns:

- architecture freeze;
- API contract freeze;
- database/cross-module contract decisions;
- integration sequencing;
- frontend/PM coordination;
- review and final approval;
- blocker resolution;
- end-to-end release review.

---

# 30. Linear Development / Merge Order

Integration merges follow this dependency order:

```text
0. Backend Lead
   Architecture + API Contract Freeze
        |
        v
1. BE-01
   Database & Prisma
        |
        v
2. BE-02
   API Core + Validation + Error Contract
        |
        v
3. BE-03
   Participant + Attendance + Workshop Enrollment
        |
        v
4. BE-04
   Purpose-Bound Verification Link
        |
        v
5. BE-05
   Email Notification
        |
        v
6. BE-06
   Session + Identity Resolver
        |
        v
7. BE-07
   Workshop Activation + Video Eligibility
        |
        v
8. BE-08
   Workshop Invitation
        |
        v
9. BE-09
   Cloudflare R2 Storage
        |
        v
10. BE-10
    Submission
        |
        v
11. Backend Lead
    End-to-End Integration + Release Review
```

Members may prepare skeletons/tests early, but contract-affecting integration merges follow this sequence.

Do not use this sequence as permission to rewrite a previous owner's domain. Cross-owner changes require the documented integration exception or Backend Lead approval.

---

# 31. Work Ownership Map

| Work Order | Owner | Core ownership |
|---|---|---|
| `S1-BE-01` | BE-01 | Prisma schema, migration, DB constraints/indexes |
| `S1-BE-02` | BE-02 | Zod schemas, ApplicationError, shared response/validation helpers |
| `S1-BE-03` | BE-03 | Participant/Attendance services, Attendance create + confirmation service, workshop enrollment route |
| `S1-BE-04` | BE-04 | Purpose-bound verification token lifecycle, generic verify/resend routes |
| `S1-BE-05` | BE-05 | Email adapter, Notification Service, verification-email wiring |
| `S1-BE-06` | BE-06 | Signed session/cookie, verified participant resolver, generic verification success + Attendance-confirmation route |
| `S1-BE-07` | BE-07 | Workshop activation service/route, reusable video-access eligibility |
| `S1-BE-08` | BE-08 | Authenticated invitation redirect |
| `S1-BE-09` | BE-09 | PDF validation + R2 upload/delete abstraction |
| `S1-BE-10` | BE-10 | Submission orchestration/route + orphan cleanup |

---

# 32. Integration Exceptions

These are approved cross-owner touch points.

## BE-04 / BE-05 into identity-entry routes

BE-04/BE-05 may wire verification creation/email dispatch into the approved
dispatch call sites of `POST /api/attendances` and `POST /api/workshops/enroll`.

They may not rewrite participant creation, Attendance duplicate rules, or the rule
that workshop enrollment creates no Attendance and exactly one pending workshop
registration for a new workshop-only participant.

## BE-05 into generic resend verification

BE-05 may wire email delivery after BE-04 has passed purpose-specific resend
eligibility and generated the fresh verification URL.

BE-05 may not alter token lifecycle, purpose isolation, or cooldown rules.

## BE-06 into generic verification success

BE-06 may modify only the successful generic verification branch to set the
participant session cookie and redirect based on the verified token purpose.

BE-06 may not alter verification-token validation, purpose branching, or
transaction semantics.

## BE-06 into Attendance confirmation

BE-06 owns `POST /api/attendances/confirm`: it validates classification-only input,
resolves the verified session, and calls BE-03's reusable Attendance-confirmation
service with the trusted participant ID. It may not change the pending
classification-match or verified-conflict rules.

## BE-08 / BE-10 consuming Workshop Service

BE-08 and BE-10 should consume BE-07's reusable registration lookup rather
than duplicating workshop-registration logic. The protected workshop page/video
handler follows the same lookup.

## BE-10 consuming R2 abstraction

BE-10 calls BE-09 storage helpers. It must not rewrite R2 internals.

---

# 33. Required Integration Gates

## Gate A — Foundation

Before business flow integration:

- Prisma schema validates;
- migration applies from clean database;
- shared validation/error helpers are stable.

## Gate B — Identity Entry

Must work:

```text
POST /api/attendances
-> Participant
-> Attendance PENDING

POST /api/workshops/enroll
-> Participant
-> no Attendance
-> PENDING WorkshopRegistration with CTF/BCC/CP path, phone number, optional NIM
```

## Gate C — Verification

Must work:

```text
ATTENDANCE
-> verification link
-> verification email
-> verify URL
-> Participant verified
-> Attendance VERIFIED
-> participant_session cookie

Workshop enrollment
-> WORKSHOP verification link
-> verification email
-> verify URL
-> Participant verified
-> PENDING WorkshopRegistration becomes ACTIVE
-> no Attendance mutation
-> participant_session cookie
```

## Gate D — Workshop

Must work:

```text
verified session
-> ACTIVE workshop registration with one selected path and required phone number
-> video access authorization
-> frontend invitation card
-> invitation redirect
```

## Gate E — Submission

Must work:

```text
verified session
-> workshop eligibility
-> PDF validation
-> R2 upload
-> DB metadata
-> orphan cleanup on DB failure
```

---

# 34. Definition of Done — Every Backend Change

A task/change is not done until all relevant items pass:

- [ ] Matches frozen architecture/API contract.
- [ ] Uses server-side input validation.
- [ ] Preserves identity single-source-of-truth rule.
- [ ] Has happy-path test.
- [ ] Has at least one relevant negative/error-path test.
- [ ] Does not modify another owner's module without explicit integration reason.
- [ ] Database migrations are safe/replayable if touched.
- [ ] No secrets/raw tokens/session values/phone numbers/file bytes are committed or logged.
- [ ] Relevant project tests pass.
- [ ] Relevant lint/typecheck/build checks pass if repository provides them.
- [ ] Backend Lead approves integration.
- [ ] Behavior can be demonstrated in local/staging integration environment.

---

# 35. Mandatory End-to-End Test Matrix

Before release, verify at least:

## Attendance

- valid Attendance creates Participant + PENDING Attendance with an attendee
  classification and an institution for `STUDENT`;
- valid `POST /api/attendances/confirm` from a workshop-verified session creates or
  promotes one Attendance to VERIFIED from classification-only input, requiring
  an exact match for a pending row and rejecting a verified row;
- same email casing variant does not create duplicate Participant;
- repeated PENDING Attendance does not create second Attendance;
- existing VERIFIED Attendance returns `409`;
- invalid body returns `400`.

## Verification

- valid ATTENDANCE-purpose token verifies token + Participant + Attendance;
- valid WORKSHOP-purpose token verifies token + Participant but does not
  create/update Attendance and activates the related pending workshop registration;
- valid verification creates signed session;
- ATTENDANCE and WORKSHOP verification redirect to their respective frontend paths;
- random token rejected;
- expired token returns `410`;
- used token cannot be reused;
- resend on VERIFIED Attendance returns `409`;
- workshop-purpose resend is allowed for an existing participant to restore a
  session and does not create Attendance or change the saved workshop registration;
- resend inside cooldown returns `429`;
- resend invalidates only an old unused token with the same purpose and creates
  one new usable token.

## Session

- missing cookie -> `401`;
- tampered token -> `401`;
- expired token -> `401`;
- unverified participant -> `401`;
- verified participant resolves successfully.

## Workshop enrollment

- workshop enrollment creates/reuses Participant and sends a WORKSHOP link;
- workshop-only enrollment creates no Attendance and one PENDING workshop registration;
- workshop path accepts only `CTF`, `BCC`, or `CP`;
- workshop phone number is required, validated, stored only on registration,
  and absent from logs/errors;
- a WORKSHOP link can be used by an existing Attendance participant without mutating
  the Attendance.

## Workshop activation and video

- workshop registration without session -> `401`;
- missing `competitionPath` or `phoneNumber` -> `400`;
- `CTF`, `BCC`, and `CP` accepted as the one selected workshop path;
- optional NIM accepted;
- `name`/`email` in workshop body -> `400`;
- duplicate registration -> `409`;
- verified participant without ACTIVE registration cannot access the protected video;
- verified participant with ACTIVE registration can access the protected video;
- frontend shows invitation card only after backend returns `invitationAvailable`;
- invitation without ACTIVE registration -> `403`;
- active registered participant invitation redirects to the group mapped from
  their saved `competitionPath`.

## Submission

- missing/invalid session -> `401`, no R2 call;
- unregistered verified participant -> `403`, no R2 call;
- invalid competition path -> `400`, no R2 call;
- empty/non-PDF/wrong magic bytes -> `400`;
- oversized PDF -> `400`;
- valid PDF -> one R2 upload + one Submission row;
- R2 upload succeeds + DB insert fails -> `deleteObject(storageKey)` exactly once.

---

# 36. Codex Workflow Before Editing Code

For every task:

1. Read this `AGENTS.md` fully.
2. Identify the active work order/domain.
3. Inspect repository structure and existing conventions.
4. Inspect `package.json`, lockfile, scripts, Prisma config, test framework, and existing env/config utilities.
5. Inspect only the dependent modules/interfaces needed for the task.
6. State/record any conflict between repo implementation and frozen contract before broad changes.
7. Implement the smallest change satisfying the work order.
8. Reuse existing helpers instead of introducing parallel abstractions.
9. Add/update tests matching acceptance criteria.
10. Run relevant checks using scripts actually defined by the repository.
11. Review diff for accidental cross-domain edits, secrets, contract changes, and dead code.
12. Report:
    - files changed;
    - behavior implemented;
    - tests/checks run and their result;
    - remaining blocker or known limitation.

Do not invent package-manager commands. Infer the package manager from the repository lockfile/scripts.

---

# 37. Codex Change Discipline

## Before adding a dependency

Check whether the repository already provides the capability.

Do not add a large dependency for a tiny helper without justification.

## Before changing Prisma schema

Only BE-01 / Backend Lead owns schema changes under the current plan.

If another task appears to require schema change, treat it as a contract issue rather than silently editing Prisma.

## Before changing an API request/response

Stop and surface the mismatch. Request/response contracts are frozen.

## Before exposing data to frontend

Ask whether it is actually required by the approved frontend contract. Never expose secrets/invitation URLs/storage credentials just for convenience.

## Before “improving” architecture

Do not refactor into controllers/repositories/event buses/queues/etc. unless the current task requires it. Simplicity is intentional because project duration is short.

---

# 38. Known Open Decisions — Do Not Guess

These items are not fully fixed by current approved requirements:

## Workshop path and contact data

The only allowed workshop paths are `CTF`, `BCC`, and `CP`. A participant may
select exactly one; the server stores it as `WorkshopRegistration.competitionPath`.
`nim` remains optional, while `phoneNumber` is required and is stored only on
the workshop registration.

## Rate-limit implementation/provider

Rate limiting is recommended, especially on Attendance/resend, but exact middleware/provider is not frozen in current work orders.

Do not introduce infrastructure without approval.

## Multiple workshop support

Current schema has one `WorkshopRegistration` per participant. Do not allow
selection of more than one path or introduce a multi-workshop model without a
new contract redesign.

## Submission-path matching

The current schema permits a submission with any valid `competitionPath`. It
does not yet require it to equal the participant's selected workshop path.
Do not add that restriction unless PM/Lead explicitly decides it.

## Submission overwrite/resubmit policy

Not defined. Current schema permits multiple Submission rows.

Do not invent overwrite/update/delete semantics.

## Email-provider staging credentials and production values

These are deployment inputs, not values Codex should fabricate.

## Workshop video provider and delivery mechanism

The backend contract protects entry to the workshop page with a verified
session plus WorkshopRegistration. The selected video host and any provider
token/signed-URL mechanism are not fixed. Do not put workshop video in the R2
PDF-submission bucket or expose a raw video URL until that decision is made.

---

# 39. Things That May Look Reasonable but Are Wrong for This Project

Do **not** make these “helpful” changes:

```text
"Workshop activation needs email, I'll add it to the body"
    -> WRONG: identity comes from the verified session; only public workshop
       enrollment collects name and email.

"Workshop enrollment should create an Attendance too"
    -> WRONG: workshop-only participants must not appear in the offline booth
       Attendance list.

"Submission should accept participantId"
    -> WRONG: authorization identity comes from session.

"Let's add a User table and keep Participant too"
    -> WRONG: duplicate identity model.

"Magic link is auth, so let's add access/refresh JWTs"
    -> WRONG: scope is stateless participant session only.

"Let's store verification token to debug it"
    -> WRONG: raw token must never be persisted/logged.

"Let's return the WhatsApp/group URL in registration JSON"
    -> WRONG: use authenticated invitation redirect.

"Let's store phoneNumber on Participant or use it to authorize a request"
    -> WRONG: phoneNumber belongs only on WorkshopRegistration and authorization
       comes from the verified session.

"The frontend has invitationAvailable, so return the WhatsApp URL in JSON"
    -> WRONG: render a frontend invitation card/button, then use the protected
       backend redirect to resolve the path-specific group URL.

"MIME says application/pdf, so file is valid"
    -> WRONG: also verify %PDF- magic bytes.

"Upload first, check workshop registration afterward"
    -> WRONG: eligibility check must precede upload.

"DB insert failed after upload; return 500"
    -> INCOMPLETE: delete orphan R2 object first.

"Only one submission makes sense"
    -> NOT SPECIFIED: do not invent policy.
```

---

# 40. Backend Lead Review Checklist

For every merge, review at minimum:

- contract unchanged;
- domain ownership respected;
- no duplicated identity data;
- authorization derived from verified session;
- errors use shared format/status semantics;
- secrets/tokens not logged;
- external provider failure handled safely;
- DB uniqueness enforced by constraints;
- verification update transactional;
- R2 orphan cleanup present where required;
- tests match acceptance criteria;
- no out-of-scope infrastructure/refactor added.

---

# 41. Release-Critical Flow

The release is successful only when this complete path works:

```text
Offline Attendance with attendee classification
  -> ATTENDANCE-purpose Email Verification Link
  -> Verified Participant Session
  -> Offline Attendance confirmed

Online workshop
  -> Select one path (CTF | BCC | CP) + required phoneNumber + optional NIM
  -> PENDING WorkshopRegistration
  -> WORKSHOP-purpose Email Verification Link
  -> Verified Participant Session
  -> ACTIVE WorkshopRegistration
  -> Gated Video Page / Frontend Invitation Card / Authenticated Group Redirect
  -> PDF Submission
  -> Cloudflare R2 Object
  -> PostgreSQL Submission Metadata
```

Any implementation that individually passes unit tests but breaks this path is not release-ready.

---

# 42. Short Mental Model for Codex

If you remember only one model, use this:

```text
IDENTITY
Participant(name, email, verified)
        |
        +--> Attendance (optional: PENDING -> VERIFIED; student requires institution)
        |
        +--> Workshop enrollment (never creates Attendance)
        |
        v
MAGIC LINK
EmailVerification(hash, purpose, expiry, one-time)
        |
        v
SESSION
participant_session -> participantId
        |
        v
WORKSHOP ACTIVATION
WorkshopRegistration(one CTF|BCC|CP path, required phoneNumber, optional NIM, PENDING -> ACTIVE)
        |
        +--> gated video page
        +--> frontend invitation card -> invitation 302 redirect
        +--> submission (path + PDF -> R2 + DB metadata)
```

The key invariant is:

> **Identity is entered once, verified once, and reused through trusted server-side session resolution.**

---

# 43. Final Agent Instruction

When implementing a requested backend task:

- preserve this product flow;
- preserve this architecture unless explicitly instructed otherwise;
- preserve API/data contracts;
- make the smallest testable change;
- do not guess open product decisions;
- do not broaden scope;
- verify before claiming completion.

If a request cannot be implemented without violating one of these frozen decisions, explicitly report the conflict to the Backend Lead instead of silently changing the system.
