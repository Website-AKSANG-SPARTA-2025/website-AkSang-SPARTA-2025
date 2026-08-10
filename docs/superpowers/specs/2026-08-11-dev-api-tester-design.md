# Development API Tester Design

## Purpose

Add a small live frontend playground at `/dev/api-tester` for manually testing
the current SPARTA backend and as a copyable starting point for future
frontend work.

## Scope

The tester calls the existing same-origin backend routes only. It covers:

- `POST /api/attendances`;
- `POST /api/attendances/confirm`;
- `POST /api/verifications/resend`;
- `GET /api/verifications/status`;
- `POST /api/workshops/enroll`;
- `POST /api/workshops/register`;
- `GET /api/workshops/invitation`;
- `POST /api/submissions`.

It is a manual development tool, not a production user flow, login system, or
replacement for the product frontend.

## Architecture

`app/dev/api-tester/page.tsx` is a server component that returns `notFound()`
in production. It renders one client component,
`app/dev/api-tester/api-tester.tsx`, only in development.

The client component owns the simple form state and a small shared request
helper. It exports the pure `readApiResult(response)` helper used by that
request path, so it can be unit-tested with native `Response` values. It calls
routes with `credentials: "include"`, sends JSON only to JSON routes, sends
`FormData` to submission, and renders the last HTTP status and parsed response.
It does not call Aegis directly or access server secrets.

The invitation action uses browser navigation to
`/api/workshops/invitation`, matching the endpoint's `302` behavior instead
of attempting to parse it as JSON.

## User interface

The page contains compact sections for:

1. Attendance creation and confirmed-attendance testing.
2. New workshop enrollment and session-based workshop registration.
3. Verification resend and session-bound status refresh.
4. PDF submission and invitation navigation.
5. A persistent result panel showing the endpoint, HTTP status, and JSON/body.

Each request requires an explicit button click. The page never automatically
sends Aegis email and disables the clicked action while it is in flight.

For resend, a 429 response with `errors.retryAfter` starts a visible countdown
and temporarily disables resend. Other error envelopes remain visible for
manual debugging.

## Session limitation

The tester will make live calls to all eight routes. It must visibly state
that the backend currently has no safe session issuance after an Aegis link.
Consequently, a fresh browser can fully exercise public entry/resend routes,
but session-required routes normally return `401`. The tester must not add a
test session endpoint, set cookies manually, or imply that verification grants
a browser session.

## Safety and production behavior

- The route is unavailable in production through server-side `notFound()`.
- No Aegis API key, server environment value, token, participant ID, or
  invitation URL is placed in client code.
- The UI uses only the existing public request fields and does not attach an
  arbitrary email to verification status.
- It does not alter API routes, database schema, auth behavior, or provider
  configuration.

## Documentation and verification

Add a short section to `docs/frontend/API-GUIDE.md` describing how to open the
development tester, its development-only boundary, and the session limitation.

Add `tests/api-tester.test.ts` for `readApiResult(response)`: one JSON error
with `errors.retryAfter`, and one plain-text response. Do not add a browser
test library or test-only auth route. Verify the page with the existing test
suite, lint, Next type generation/typecheck, and production build. The build
must omit the tester route behavior in production by returning the standard
not-found page.

## Acceptance criteria

- `/dev/api-tester` renders locally in development and is unavailable in
  production.
- Every active API route has an explicit, correctly formed manual action.
- JSON, multipart, redirect, status-only, and resend cooldown behavior match
  the frontend API guide.
- The page exposes no server secrets and introduces no auth bypass.
- The tester clearly distinguishes public-route success from the current
  session-protected limitation.
