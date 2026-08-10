# Frontend Backend API Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish one accurate frontend integration guide for every active SPARTA backend endpoint and its data model.

**Architecture:** Create `docs/frontend/API-GUIDE.md` as the single integration artifact. It will derive every contract from the active route handlers, Zod schemas, services, and Prisma schema; it will explicitly flag the missing safe session-issuance path instead of describing an insecure workaround.

**Tech Stack:** Markdown, Next.js Route Handlers, Zod, Prisma/PostgreSQL, Aegis verification, Cloudflare R2.

## Global Constraints

- Document only active routes in `app/api/**/route.ts` and fields accepted by `schemas/index.ts`.
- Do not document browser access to `AEGIS_VERIFICATION_API_KEY`, direct Aegis calls, local verification tokens, or client-created session cookies.
- Preserve the existing common envelope: `{ success: true, data }` and `{ success: false, message, errors? }`.
- Identify `GET /api/verifications/status`, `POST /api/attendances/confirm`, `POST /api/workshops/register`, `GET /api/workshops/invitation`, and `POST /api/submissions` as session-dependent.
- State that no current active route calls `setParticipantSessionCookie`; a fresh browser cannot safely use session-dependent routes after clicking an Aegis link until a backend login or signed callback is added.
- Do not touch pre-existing user changes in `docs/superpowers/specs/2026-08-10-attendance-design.md` or other files in `docs/superpowers/plans/`.

---

### Task 1: Create the shared contract and data reference

**Files:**
- Create: `docs/frontend/API-GUIDE.md`

**Interfaces:**
- Consumes: `lib/api.ts`, `lib/auth.ts`, `lib/session.ts`, `schemas/index.ts`, and `prisma/schema.prisma`.
- Produces: A frontend-readable contract for transport, error handling, session constraints, database models, enums, relationships, and status transitions.

- [ ] **Step 1: Inspect the authoritative shared contract**

Run:

```powershell
Get-Content -Raw lib\api.ts
Get-Content -Raw lib\auth.ts
Get-Content -Raw lib\session.ts
Get-Content -Raw schemas\index.ts
Get-Content -Raw prisma\schema.prisma
```

Expected: Confirm the success/error JSON envelope, `participant_session` as an HttpOnly same-origin cookie, accepted request fields, and the four Prisma models.

- [ ] **Step 2: Write the guide foundation**

Create `docs/frontend/API-GUIDE.md` with these exact top-level sections:

```markdown
# SPARTA Frontend API Guide

## Read this first
## Shared API contract
## Endpoint overview
## Feature flows
## Data model reference
## Frontend integration checklist
```

In `Read this first`, state the session blocker precisely: the browser cannot create `participant_session`, and no active backend route sets it after an Aegis verification link. In `Shared API contract`, show same-origin `fetch` with `credentials: "include"`, JSON headers where applicable, JSON success/error examples, and the 400/401/403/404/409/429/502 UI treatment. In `Data model reference`, include field tables for `Participant`, `Attendance`, `WorkshopRegistration`, and `Submission`, enum tables, relationship cardinalities, server-private-field markings, and status transitions.

- [ ] **Step 3: Verify the documented shared contract against source**

Run:

```powershell
rg -n "successResponse|errorResponse|participant_session|AttendanceStatus|WorkshopRegistrationStatus|CompetitionPath" lib schemas prisma docs\frontend\API-GUIDE.md
```

Expected: Every shared response, cookie, enum, and model assertion in the guide has a matching authoritative source reference.

- [ ] **Step 4: Commit the guide foundation**

```powershell
git add -- docs/frontend/API-GUIDE.md
git commit --only -m "docs: add frontend API contract guide" -- docs/frontend/API-GUIDE.md
```

Expected: The commit contains only `docs/frontend/API-GUIDE.md` and leaves user-owned working-tree changes intact.

### Task 2: Document endpoint behavior, flows, and frontend tests

**Files:**
- Modify: `docs/frontend/API-GUIDE.md`

**Interfaces:**
- Consumes: all eight active `app/api/**/route.ts` files, `services/verification.service.ts`, `services/attendance.service.ts`, `services/workshop.service.ts`, and `services/submission.service.ts`.
- Produces: Endpoint-specific frontend instructions for attendance, verification, workshop, invitation, and submission features.

- [ ] **Step 1: Inspect every active endpoint and service outcome**

Run:

```powershell
Get-ChildItem app\api -Recurse -Filter route.ts | Sort-Object FullName | ForEach-Object { "`n### $($_.FullName)"; Get-Content -Raw $_.FullName }
Get-Content -Raw services\verification.service.ts
Get-Content -Raw services\attendance.service.ts
Get-Content -Raw services\workshop.service.ts
Get-Content -Raw services\submission.service.ts
```

Expected: Confirm the eight route methods, public/session/verified-only boundaries, response status codes, resend `retryAfter`, 302 invitation redirect, and multipart submission contract.

- [ ] **Step 2: Add endpoint tables and examples**

Add one overview table and one detailed subsection for each route below:

```text
POST /api/attendances
POST /api/attendances/confirm
POST /api/verifications/resend
GET  /api/verifications/status
POST /api/workshops/enroll
POST /api/workshops/register
GET  /api/workshops/invitation
POST /api/submissions
```

For every subsection, include method, session requirement, content type, request body/form fields, success response examples, meaningful error statuses, and the exact UI behavior. Include copyable `fetch` examples for JSON and `FormData`; show navigation to the invitation endpoint instead of reading its redirect response; show `retryAfter` from `errors.retryAfter` for 429 resend response; and state that no client email is accepted by status.

- [ ] **Step 3: Add feature-state and test tables**

Add tables describing these paths:

```text
new Attendance -> PENDING -> Aegis email -> verified local state
new workshop enrollment -> PENDING -> Aegis email -> ACTIVE local state
resend sent/already_verified/cooldown/upstream failure
verified-session attendance confirmation, workshop registration, invitation, and PDF submission
```

Add a frontend integration checklist covering client validation, 202 pending UI, duplicate 409 UI, 429 countdown, `linkActive: false`, no arbitrary email on status, 401/403 protected behavior, 302 redirect, valid and invalid PDF upload, and the current session blocker.

- [ ] **Step 4: Validate documentation completeness and formatting**

Run:

```powershell
rg -n "POST /api/attendances|POST /api/attendances/confirm|POST /api/verifications/resend|GET /api/verifications/status|POST /api/workshops/enroll|POST /api/workshops/register|GET /api/workshops/invitation|POST /api/submissions" docs\frontend\API-GUIDE.md
git diff --check -- docs/frontend/API-GUIDE.md
```

Expected: All eight routes occur in the guide and `git diff --check` has no output.

- [ ] **Step 5: Commit the completed guide**

```powershell
git add -- docs/frontend/API-GUIDE.md
git commit --only -m "docs: complete frontend integration guide" -- docs/frontend/API-GUIDE.md
```

Expected: The commit contains only the completed frontend guide.
