# S1-BE-08 — Authenticated Workshop Invitation

- **PIC:** Christian Immanuel
- **Timeline:** Implementation, integration test, and merge on 10 August; bug-fix buffer on 11 August 2026
- **Deadline:** 10 August 2026 for frontend integration
- **Sprint:** 1
- **Merge order:** 8
- **Depends on:** BE-06 session resolver; BE-07 registration lookup
- **Contract:** `GET /api/workshops/invitation`
- **Owned files:** `app/api/workshops/invitation/route.ts`, invitation-specific service helper only if needed, tests

> **Global rules:** API/DB contract is frozen by Backend Lead. Do not rename endpoints, request fields, response fields, model names, or cross-module interfaces without approval. Every secret stays server-side and must never be committed or logged.


## Goal (1 sentence)
Let only a verified participant with an active workshop registration click the
frontend "Join Community / Group" button and be redirected to the group for
their saved path, without using a WhatsApp API.

## Context you need to know
- Frontend button should point to this backend endpoint, not embed the secret group URL directly in public frontend code.
- Backend must check session + `ACTIVE` WorkshopRegistration on every request;
  Attendance is never an invitation prerequisite.
- Invitation links are server configuration, one URL per saved path:
```env
WORKSHOP_CTF_COMMUNITY_LINK=<actual CTF invitation URL>
WORKSHOP_BCC_COMMUNITY_LINK=<actual BCC invitation URL>
WORKSHOP_CP_COMMUNITY_LINK=<actual CP invitation URL>
```
- Successful endpoint returns **302 redirect** to the URL mapped from the
  registration's `competitionPath`.
- Frontend may render its invitation card after backend activation: either
  `POST /api/workshops/register` returns `invitationAvailable: true`, or a
  successful WORKSHOP verification redirects to `/workshop?verified=true`.
  That query state is visual only; its button target is always the protected
  `/api/workshops/invitation` endpoint.

## Endpoint contract
```http
GET /api/workshops/invitation
Cookie: participant_session=...
```
Behavior:
1. session missing/invalid/unverified → `401`.
2. verified participant but no `ACTIVE` WorkshopRegistration → `403`.
3. active registered participant → `302 Found` with `Location: <saved-path group URL>`.
4. server config missing/invalid → safe `500` without exposing an invitation URL.

## Security requirements
- Do not return the invitation URL in a JSON body on failure.
- Do not put the invitation URL in client bundle/env prefixed for browser exposure.
- Do not accept `participantId`, email, or registration ID from query/body.
- Eligibility is always derived from session.
- Do not collect/update phone number here and do not add WhatsApp API.

## Suggested steps
1. Import `requireVerifiedParticipant` from BE-06.
2. Use BE-07 `findActiveRegistrationByParticipantId`.
3. Map its `competitionPath` to the matching server-only invitation config.
4. Return 302 redirect on success.
5. Add tests for 401, 403, 302, missing config.
6. Give frontend the fixed button target `/api/workshops/invitation`.

## Boundary (what you must NOT touch)
- Do not modify registration persistence.
- Do not expose invitation during `POST /api/workshops/register` response except boolean availability already defined.
- Do not send invitation via WhatsApp/email/SMS.
- Do not collect, change, or expose phone number.
- Do not bypass session with email query parameter.
- Do not implement submission.

## Done = (acceptance criteria — become tests)
- [ ] Missing session → `401`.
- [ ] Verified but inactive/unregistered participant → `403`.
- [ ] Active registered participant → `302` to the group URL for its saved path.
- [ ] Verified workshop-only participant with `ACTIVE` WorkshopRegistration also
  receives the `302` redirect.
- [ ] Invitation URL is not present in frontend/public config or failed JSON responses.
- [ ] Endpoint accepts no participant identity parameter.
- [ ] No WhatsApp dependency exists; the three raw invitation URLs are server-only.
- [ ] Frontend integration instruction is exactly: button href/action = `/api/workshops/invitation`.
