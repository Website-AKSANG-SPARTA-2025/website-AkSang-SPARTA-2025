# Development API Tester Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a development-only live frontend playground at `/dev/api-tester` for testing every current backend route without exposing secrets or bypassing authentication.

**Architecture:** Put three pure shared helpers in `lib/dev-api-tester.ts`: one gates the development page, one parses an HTTP response for the result panel, and one extracts a numeric resend cooldown. The server page permits the route only in `NODE_ENV=development`; a single client component renders controlled test forms and uses those helpers for all manual calls.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, native Fetch/FormData/Response, Vitest 4.

## Global Constraints

- Read `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md` completely before writing Next page code.
- `/dev/api-tester` must call `notFound()` unless `NODE_ENV === "development"`.
- Never expose `AEGIS_VERIFICATION_API_KEY`, any server environment value, token, participant ID, invitation URL, or local session-cookie construction to client code.
- Use existing same-origin routes only, `credentials: "include"`, JSON for JSON routes, `FormData` for submission, and `window.location.assign("/api/workshops/invitation")` for invitation.
- Do not add a session test endpoint, mock mode, dependency, database/schema change, or backend behavior change.
- Public actions can be live; session-required actions must visibly explain the existing session-handoff limitation and may return `401` for a fresh browser.
- Preserve unrelated user changes in `docs/superpowers/specs/2026-08-10-attendance-design.md` and other user-owned plan files.

---

### Task 1: Add testable API-result and environment helpers

**Files:**
- Create: `lib/dev-api-tester.ts`
- Create: `tests/dev-api-tester.test.ts`

**Interfaces:**
- Produces: `isDevelopmentApiTester(environment: string | undefined): boolean`.
- Produces: `readApiResult(response: Response): Promise<{ status: number; ok: boolean; body: unknown }>`.
- Produces: `retryAfterFrom(body: unknown): number | null`.
- Consumed by: `app/dev/api-tester/page.tsx` and `app/dev/api-tester/api-tester.tsx` in Task 2.

- [ ] **Step 1: Write the failing helper tests**

Create `tests/dev-api-tester.test.ts` with these assertions:

```ts
import { describe, expect, it } from "vitest";
import {
  isDevelopmentApiTester,
  readApiResult,
  retryAfterFrom,
} from "../lib/dev-api-tester";

describe("development API tester helpers", () => {
  it("is available only in development", () => {
    expect(isDevelopmentApiTester("development")).toBe(true);
    expect(isDevelopmentApiTester("production")).toBe(false);
    expect(isDevelopmentApiTester(undefined)).toBe(false);
  });

  it("reads JSON errors and preserves retryAfter", async () => {
    const result = await readApiResult(new Response(JSON.stringify({
      success: false,
      errors: { retryAfter: 41 },
    }), { status: 429, headers: { "Content-Type": "application/json" } }));

    expect(result).toEqual({
      status: 429,
      ok: false,
      body: { success: false, errors: { retryAfter: 41 } },
    });
    expect(retryAfterFrom(result.body)).toBe(41);
  });

  it("reads a plain-text response and rejects invalid cooldowns", async () => {
    const result = await readApiResult(new Response("Unavailable", { status: 502 }));

    expect(result).toEqual({ status: 502, ok: false, body: "Unavailable" });
    expect(retryAfterFrom({ errors: { retryAfter: -1 } })).toBeNull();
  });
});
```

- [ ] **Step 2: Run the focused test to prove it is red**

Run:

```powershell
npx.cmd vitest run tests/dev-api-tester.test.ts
```

Expected: FAIL because `../lib/dev-api-tester` does not exist.

- [ ] **Step 3: Implement the minimal helpers**

Create `lib/dev-api-tester.ts` with this public contract:

```ts
export function isDevelopmentApiTester(environment: string | undefined): boolean {
  return environment === "development";
}

export async function readApiResult(response: Response): Promise<{
  status: number;
  ok: boolean;
  body: unknown;
}> {
  const isJson = response.headers.get("content-type")?.includes("application/json");
  return {
    status: response.status,
    ok: response.ok,
    body: isJson ? await response.json() : await response.text(),
  };
}

export function retryAfterFrom(body: unknown): number | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const errors = (body as { errors?: unknown }).errors;
  if (!errors || typeof errors !== "object" || Array.isArray(errors)) return null;
  const retryAfter = (errors as { retryAfter?: unknown }).retryAfter;
  return typeof retryAfter === "number" && Number.isFinite(retryAfter) && retryAfter > 0
    ? retryAfter
    : null;
}
```

Do not catch malformed declared JSON: it indicates an unexpected API contract and should remain visible during testing.

- [ ] **Step 4: Run the focused test to prove it is green**

Run:

```powershell
npx.cmd vitest run tests/dev-api-tester.test.ts
```

Expected: 3 tests passing.

- [ ] **Step 5: Commit the helper and test**

```powershell
git add -- lib/dev-api-tester.ts tests/dev-api-tester.test.ts
git commit -m "feat: add development API tester helpers"
```

Expected: One commit containing exactly the helper and its focused test.

### Task 2: Build the development-only API tester screen

**Files:**
- Create: `app/dev/api-tester/page.tsx`
- Create: `app/dev/api-tester/api-tester.tsx`
- Modify: `docs/frontend/API-GUIDE.md`

**Interfaces:**
- Consumes: `isDevelopmentApiTester` from `lib/dev-api-tester.ts`.
- Consumes: `readApiResult` and `retryAfterFrom` from `lib/dev-api-tester.ts`.
- Produces: a development-only `/dev/api-tester` route with all eight manual actions.

- [ ] **Step 1: Read the current Next.js page guidance**

Run:

```powershell
Get-Content -Raw node_modules\next\dist\docs\01-app\01-getting-started\03-layouts-and-pages.md
```

Expected: Confirm the App Router server/client component boundary before creating `page.tsx` and the client component.

- [ ] **Step 2: Create the production guard page**

Create `app/dev/api-tester/page.tsx` with this behavior:

```tsx
import { notFound } from "next/navigation";
import { isDevelopmentApiTester } from "../../../lib/dev-api-tester";

import ApiTester from "./api-tester";

export default function DevelopmentApiTesterPage() {
  if (!isDevelopmentApiTester(process.env.NODE_ENV)) notFound();
  return <ApiTester />;
}
```

Do not mark this file as a client component and do not add a production escape hatch.

- [ ] **Step 3: Create the client tester with all eight explicit actions**

Create `app/dev/api-tester/api-tester.tsx` as a `"use client"` component.

Use controlled inputs with these initial values:

```ts
const attendance = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  attendeeType: "STUDENT",
  institution: "Bina Nusantara",
};
const workshop = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  competitionPath: "CTF",
  phoneNumber: "+62812345678",
  nim: "",
};
```

Implement a single `runRequest(label, input)` function that sets an in-flight
label, calls `fetch` with `credentials: "include"`, parses it through
`readApiResult`, stores `{ label, status, ok, body }` in the result panel, and
uses `retryAfterFrom(body)` only after a resend `429`. If fetch or declared
JSON parsing throws, store `{ label, status: null, ok: false, body: { message:
"Request failed" } }` rather than leaving the action in flight. Use `useEffect`
and one-second `setTimeout` to decrement the resend cooldown. Disable the
resend button while cooldown is positive or that action is in flight.

Render these labeled actions and exact route requests:

```text
POST /api/attendances              JSON { name, email, attendeeType, institution? }
POST /api/attendances/confirm      JSON { attendeeType, institution? }
POST /api/verifications/resend     JSON { email, purpose }
GET  /api/verifications/status     no body and no email query parameter
POST /api/workshops/enroll         JSON { name, email, competitionPath, phoneNumber, nim? }
POST /api/workshops/register       JSON { competitionPath, phoneNumber, nim? }
GET  /api/workshops/invitation     window.location.assign("/api/workshops/invitation")
POST /api/submissions              FormData with exactly competitionPath and file
```

For all JSON actions set `Content-Type: application/json`; for submission do
not set `Content-Type`. Keep the page visually simple with existing Tailwind
classes: a title, a warning panel about the session blocker, compact fieldsets,
action buttons, and a `pre` result panel with `aria-live="polite"`. Never
render an Aegis secret, session value, invitation URL, or raw file bytes.

- [ ] **Step 4: Update the frontend guide**

Add a `## Development API tester` section to `docs/frontend/API-GUIDE.md`
before `## Frontend integration checklist`:

```markdown
## Development API tester

Run `npm run dev` and open `/dev/api-tester`. The page is available only when
`NODE_ENV=development`, sends live same-origin requests, and never calls Aegis
directly. Use test email addresses because public entry and resend actions can
send verification email. Session-required actions still need a server-issued
`participant_session`; the tester intentionally does not bypass that limit.
```

- [ ] **Step 5: Run focused tests and static checks**

Run:

```powershell
npx.cmd vitest run tests/dev-api-tester.test.ts
npx.cmd next typegen
npx.cmd tsc --noEmit
npm.cmd run lint
```

Expected: helper tests pass; generated route types, TypeScript, and ESLint all exit 0.

- [ ] **Step 6: Manually smoke-test the development screen**

Run:

```powershell
npm.cmd run dev
```

Open `http://localhost:3000/dev/api-tester`. Confirm the eight action controls
render, the session warning is visible, public forms do not submit until their
button is clicked, and invitation navigation uses the route rather than a
client-side redirect URL. Stop the development server after the check.

- [ ] **Step 7: Commit the UI and guide**

```powershell
git add -- app/dev/api-tester/page.tsx app/dev/api-tester/api-tester.tsx docs/frontend/API-GUIDE.md
git commit -m "feat: add development API tester"
```

Expected: One commit contains the new page, client tester, and guide update.

### Task 3: Run full regression and production verification

**Files:**
- Verify only: `app/dev/api-tester/page.tsx`, `app/dev/api-tester/api-tester.tsx`, `lib/dev-api-tester.ts`, `tests/dev-api-tester.test.ts`, `docs/frontend/API-GUIDE.md`

**Interfaces:**
- Consumes: all Task 1 and Task 2 outputs.
- Produces: fresh evidence that the tester does not break the backend and production build.

- [ ] **Step 1: Run the full regression suite**

Run:

```powershell
npm.cmd test
```

Expected: All existing and new Vitest tests pass.

- [ ] **Step 2: Run the production build with a disposable database URL**

Run:

```powershell
$env:DATABASE_URL = "postgresql://sparta:sparta_dev@localhost:5432/sparta_dev?schema=public"
npm.cmd run build
```

Expected: Build exits 0. The generated route list may include `/dev/api-tester`, but rendering it in production resolves to the standard not-found behavior through the server guard.

- [ ] **Step 3: Verify the scoped diff and commit only if needed**

Run:

```powershell
git diff --check
git status --short
```

Expected: No whitespace errors and no unintended files. If Task 1 and Task 2 commits already exist, do not create an empty commit.
