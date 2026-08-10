# Frontend Backend API Guide Design

## Purpose

Create one frontend-facing integration guide at
`docs/frontend/API-GUIDE.md`. It will describe every active backend endpoint,
the request and response contracts, frontend state transitions, and the
database concepts that explain those contracts.

## Audience and scope

The audience is the SPARTA frontend team. The guide covers the current
Next.js backend only:

- attendance creation and confirmation;
- email verification status and resend;
- workshop enrollment and registration;
- invitation redirect;
- PDF submission;
- shared response, validation, error, session, and environment constraints.

It will document the current implementation faithfully. It will not add a
frontend, change endpoint behavior, expose secrets, or infer an unimplemented
login flow.

## Document structure

1. **Readiness notice.** State that same-origin calls use the HttpOnly
   `participant_session` cookie. Explicitly flag that no active route currently
   issues this cookie after the Aegis email link is clicked, so session-required
   endpoints cannot be reached by a newly verified anonymous browser yet.
2. **Shared API contract.** Define the JSON success and error envelopes,
   content types, status-code handling, `credentials: "include"`, and the rule
   that Aegis credentials never reach the browser.
3. **Endpoint table.** List all eight active backend routes, method, auth
   requirement, content type, request fields, success outcomes, and primary
   error outcomes.
4. **Endpoint details and examples.** Give minimal copyable fetch examples and
   representative response bodies for each route. Explain special handling for
   202 pending verification, 302 invitation redirect, multipart PDF upload,
   and 429 `retryAfter`.
5. **Feature flows.** Describe UI state transitions for new attendance,
   new workshop enrollment, resend, status refresh, verified-session actions,
   and submission. The verification flow stops at the explicit session blocker
   rather than suggesting an insecure browser workaround.
6. **Data tables.** Provide field tables for `Participant`, `Attendance`,
   `WorkshopRegistration`, and `Submission`; enum values; one-to-one and
   one-to-many relationships; and status-transition tables. Mark fields that
   are server-private and not returned by API endpoints.
7. **Frontend test checklist.** Cover validation errors, duplicate entries,
   Aegis retry behavior, expired links, unauthenticated/forbidden actions,
   redirects, and PDF validation.

## Technical decisions

- Keep the guide as one Markdown file so endpoint contracts and data meanings
  stay together for frontend implementation.
- Use only the routes that exist under `app/api/**`; do not document direct
  browser calls to Aegis.
- Treat the backend response envelope as the source of truth:
  `{ success: true, data }` and `{ success: false, message, errors? }`.
- Make the missing safe session-establishment route a blocking integration
  note, not a hidden frontend caveat. The frontend must never mint or edit
  `participant_session` itself.
- Keep database documentation conceptual: it explains status and relation
  behavior but does not authorize client-side database access.

## Acceptance criteria

- A frontend developer can implement every currently usable request without
  reading backend source.
- Every endpoint, request field, success state, and meaningful error state is
  represented.
- The guide clearly distinguishes public, authenticated, and verified-only
  routes.
- The guide includes all four data models, enum values, relationships, and
  status changes.
- It does not include secrets, Aegis API key usage, local token handling, or a
  fabricated session solution.
