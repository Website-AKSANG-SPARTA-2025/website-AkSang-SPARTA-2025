# Attendance terminology and attendee classification

## Goal

Replace the offline-event RSVP concept with Attendance and collect an attendee
classification plus institution without changing the verification flow.

## Chosen design

The project uses a full rename now because no RSVP route or client has been
implemented. There will be no RSVP compatibility aliases.

| Existing name | New name |
| --- | --- |
| `Rsvp` | `Attendance` |
| `RsvpStatus` | `AttendanceStatus` |
| `Participant.rsvp` | `Participant.attendance` |
| `VerificationPurpose.RSVP` | `VerificationPurpose.ATTENDANCE` |
| `/api/rsvps` | `/api/attendances` |
| `/api/rsvps/confirm` | `/api/attendances/confirm` |

The Attendance model keeps `status: PENDING | VERIFIED` for the email
verification lifecycle. It adds a separate required
`attendeeType: STUDENT | PUBLIC` field and an optional `institution` field.

`institution` is required by request validation when `attendeeType` is
`STUDENT`; it may be omitted when `attendeeType` is `PUBLIC`. A supplied
institution must be non-empty after trimming.

## Data and migration

Use a forward Prisma migration; do not edit the existing initial migration.
The migration renames the existing PostgreSQL type/table and adds the
`AttendeeType` enum, `attendeeType`, and nullable `institution` columns.
Existing Attendance rows are backfilled as `PUBLIC`, then `attendeeType` is
made required. New records do not receive a database default and must provide
their attendee type.

## API and verification behavior

Attendance creation accepts `name`, `email`, `attendeeType`, and optional
`institution`. It otherwise retains the existing pending/verified behavior.
The purpose-bound verification flow uses `ATTENDANCE` and marks the linked
Attendance record as `VERIFIED`; workshop behavior remains unchanged. The
existing offline-event redirect remains `/event?verified=true`.

## Documentation and testing

Update the backend contract/work-order documentation and all current
RSVP-named schemas, services, routes, tests, and response keys to the
Attendance names. Add validation coverage for a student without an institution
and a public attendee without one. Keep the existing verification and workshop
coverage under their renamed Attendance terminology.

## Out of scope

No compatibility endpoints, extra attendee categories, frontend redesign, or
changes to workshop/submission behavior are included.
