# S1-BE-05 — Verification Email Notification

- **PIC:** Denzel Santoso
- **Timeline:** Provider abstraction and mocked tests on 9 August; BE-04 integration and merge on 10 August; bug-fix buffer on 11 August 2026
- **Deadline:** 10 August 2026 for frontend integration
- **Sprint:** 1
- **Merge order:** 5
- **Depends on:** BE-04 server-side verification URL contract
- **Blocks:** complete RSVP, workshop-enrollment, and resend email delivery in integration
- **Contract:** `NotificationService.sendVerificationEmail(...)`
- **Owned files:** `lib/email.ts`, `services/notification.service.ts`, email template/helper files, email tests

> **Global rules:** API/DB contract is frozen by Backend Lead. Do not rename endpoints, request fields, response fields, model names, or cross-module interfaces without approval. Every secret stays server-side and must never be committed or logged.


## Goal (1 sentence)
Provide one server-side email abstraction that reliably sends the verification link without coupling RSVP/verification business logic to a vendor.

## Context you need to know
- Only email notification is in scope; WhatsApp provider/API is explicitly out of scope.
- BE-04 produces the verification URL; this module receives it and delivers it.
- Participant/verification persistence is not rolled back because provider calls are
  external. A new RSVP remains `PENDING` when the RSVP journey was used.
- A new workshop enrollment likewise keeps its `PENDING` workshop registration
  when email delivery fails.
- Resend is the approved Sprint 1 provider. Use the official `resend` SDK behind the Notification Service; RSVP and verification modules must not import the SDK directly.

## Required configuration
```env
RESEND_API_KEY=<server secret>
EMAIL_FROM=<verified sender>
```
`APP_BASE_URL` is owned by verification config, not email provider.

## Required service contract
Use equivalent semantics to:
```ts
type SendVerificationEmailInput = {
  to: string;
  participantName: string;
  verificationUrl: string;
  purpose: "RSVP" | "WORKSHOP";
};

sendVerificationEmail(input): Promise<void>
```
Rules:
- validate caller passed non-empty recipient + URL at service boundary;
- do not log `verificationUrl` because it contains the raw token;
- do not return provider response objects to route handlers;
- convert provider failure to a safe application error suitable for `502` or a handled pending state.

## Email content requirements
Keep content minimal and functional:
- participant name (escaped by templating mechanism);
- purpose-matching CTA/link: "Verify RSVP" or "Verify Workshop Access";
- statement that link expires (do not hardcode duration in prose unless generated from config);
- no OTP field/code;
- no workshop group invitation.

## Integration tasks owned by BE-05
After core adapter tests pass, wire the adapter at exactly these call sites:
1. `POST /api/rsvps` after BE-03 successfully creates/gets a PENDING RSVP and BE-04 creates a fresh verification link.
2. `POST /api/workshops/enroll` after BE-03 creates/reuses Participant plus a
   `PENDING` WorkshopRegistration and BE-04 creates a fresh WORKSHOP-purpose
   link.
3. `POST /api/verifications/resend` after BE-04 passes purpose-specific resend
   checks and creates a fresh link.

If email delivery fails:
- keep Participant/verification DB state intact; keep RSVP pending when one was
  created and keep a new workshop registration pending;
- return safe provider failure according to shared error mapping;
- user can use resend flow later.

## Suggested steps
1. Confirm `resend`, `RESEND_API_KEY`, and the verified `EMAIL_FROM` configuration are present.
2. Implement the Resend adapter in `lib/email.ts`.
3. Implement provider-neutral Notification Service.
4. Implement template/content.
5. Add fake provider for unit tests; no live external call in unit test suite.
6. Wire the three approved call sites only and pass token purpose to the template.
7. Add integration test with mocked provider success/failure.

## Boundary (what you must NOT touch)
- Do not generate/hash/validate verification tokens.
- Do not change RSVP persistence rules.
- Do not create session cookies.
- Do not add WhatsApp API or process/store phone number in this email module.
- Do not send workshop invitation by email unless PM changes scope.
- Do not log raw verification URLs/tokens/API keys.

## Done = (acceptance criteria — become tests)
- [ ] `sendVerificationEmail` can be mocked independently of provider SDK.
- [ ] Successful RSVP calls email adapter exactly once with participant email + generated verification URL.
- [ ] Successful workshop enrollment calls email adapter exactly once with
  purpose `WORKSHOP`, one pending workshop registration, and no RSVP creation.
- [ ] Resend calls email adapter exactly once only after resend eligibility passes.
- [ ] Provider failure does not delete Participant/verification records or a
  related pending RSVP.
- [ ] Provider failure is returned/logged safely without API key or raw token.
- [ ] Email body contains clickable purpose-matching verification URL and no OTP.
- [ ] No WhatsApp dependency or credential is introduced.
- [ ] Unit tests do not make live network calls.
