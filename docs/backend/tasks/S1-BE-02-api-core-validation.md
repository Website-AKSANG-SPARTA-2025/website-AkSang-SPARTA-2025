# S1-BE-02 — API Core, Validation & Error Contract

- **PIC:** Backend Lead — baseline implementation, export-path freeze, and approval
- **Timeline:** Baseline implementation before staff sprint; smoke test and export-path freeze on 9 August 2026
- **Deadline:** 9 August 2026 before feature-route PRs merge
- **Sprint:** 1
- **Merge order:** 2
- **Depends on:** BE-01 schema names frozen
- **Blocks:** all feature route implementations
- **Contract:** shared request validation + response/error conventions for all `/api/*` routes
- **Owned files:** `schemas/**`, `errors/application-error.ts`, shared response/validation helpers (create under `lib/` if not already present)

> **Global rules:** API/DB contract is frozen by Backend Lead. Do not rename endpoints, request fields, response fields, model names, or cross-module interfaces without approval. Every secret stays server-side and must never be committed or logged.


## Goal (1 sentence)
Give every backend route one consistent way to validate input and return predictable HTTP success/error responses.

## Context you need to know
Approved request schemas are:
- RSVP: `{ name, email }`.
- RSVP confirmation from a verified session: `{}`.
- Workshop enrollment: `{ name, email, competitionPath, phoneNumber, nim? }`.
- Verify link query: `{ token }`.
- Resend verification: `{ email, purpose: "RSVP" | "WORKSHOP" }`.
- Workshop activation: `{ competitionPath, phoneNumber, nim? }`; name/email are forbidden as business inputs.
- Submission metadata: `{ competitionPath }`; file validation is separate.

Approved error semantics:
- `400` invalid payload/token/file.
- `401` missing/invalid verified session.
- `403` authenticated participant is not eligible for workshop video, invitation, or submission.
- `404` resource not found.
- `409` duplicate/conflict.
- `410` expired verification link.
- `429` rate limit (middleware may be added later; only define compatible error handling here).
- `500` unexpected server error.
- `502` external provider failure when surfaced to client.

## Required Zod schemas
```ts
createRsvpSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
}).strict()

confirmRsvpSchema = z.object({}).strict()

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
  purpose: z.enum(["RSVP", "WORKSHOP"]),
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
Use `.strict()` on every JSON-body schema above. Public RSVP/workshop
enrollment accept identity; RSVP confirmation and workshop activation reject it.
Both workshop schemas require one approved path and a phone number; NIM stays
optional.

## Response contract
Success:
```json
{ "success": true, "data": {} }
```
or
```json
{ "success": true, "message": "...", "data": {} }
```

Error:
```json
{ "success": false, "message": "..." }
```

Validation error:
```json
{ "success": false, "message": "Invalid request payload", "errors": {} }
```

## ApplicationError contract
Create one application/domain error type with at least:
- `code` — stable internal string, e.g. `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `EXPIRED`, `EXTERNAL_PROVIDER_ERROR`.
- `status` — HTTP status.
- `message` — safe client message.
- optional `details` — validation details safe for client.

Do not leak stack traces, raw provider errors, secrets, cookies, or tokens to API responses.

## Suggested steps
1. Implement all seven Zod schemas above.
2. Implement `ApplicationError` and a mapper/helper from known errors to consistent JSON responses.
3. Implement a small request-validation helper if the repo benefits from it; keep it framework-compatible with Next.js Route Handlers.
4. Add unit tests for valid/invalid cases for each schema.
5. Add unit tests for HTTP mapping of at least 400, 401, 403, 409, 410, 500.
6. Export helpers from stable paths so feature owners do not duplicate parsing/error code.

## Boundary (what you must NOT touch)
- Do not implement participant/RSVP business logic.
- Do not implement token generation, session, email provider, workshop persistence, invitation, R2, or submission.
- Do not change Prisma models/migration.
- Do not add/remove request fields beyond approved contract.
- Do not choose a new error response format per route.

## Done = (acceptance criteria — become tests)
- [ ] All approved schemas exist and are importable.
- [ ] RSVP confirmation rejects every non-empty JSON body.
- [ ] Workshop enrollment accepts valid `name`, `email`, path, and phone number
  but does not reuse the workshop-activation schema.
- [ ] Workshop activation requires path + phone number and rejects `name` and
  `email` if supplied.
- [ ] Workshop schemas reject paths outside `CTF/BCC/CP` and invalid/missing
  phone numbers.
- [ ] Resend schema accepts only a valid email plus `RSVP` or `WORKSHOP`.
- [ ] Submission schema rejects any competition path outside `CTF/BCC/CP`.
- [ ] Invalid email is rejected.
- [ ] Empty verification token is rejected.
- [ ] Error helper maps known application errors to the documented status codes.
- [ ] Unknown errors become safe `500` responses without leaking internals.
- [ ] Validation tests cover happy path + at least one invalid case per schema.
- [ ] Backend Lead approves exports/import paths before feature owners depend on them.
