# S1-BE-01 — Database & Prisma Baseline

- **PIC:** Backend Lead — baseline implementation, migration verification, and approval
- **Timeline:** Baseline implementation before staff sprint; empty-database verification and contract freeze on 9 August 2026
- **Deadline:** 9 August 2026 before BE-03/BE-04/BE-07/BE-10 merge
- **Sprint:** 1
- **Merge order:** 1 / first implementation merge after architecture freeze
- **Depends on:** Backend Lead architecture + naming freeze only
- **Blocks:** BE-03, BE-04, BE-07, BE-10
- **Contract:** `prisma/schema.prisma` must match the approved backend architecture
- **Owned files:** `prisma/schema.prisma`, `prisma/migrations/**`, root `prisma.config.ts`, optional DB seed file only

> **Global rules:** API/DB contract is frozen by Backend Lead. Do not rename endpoints, request fields, response fields, model names, or cross-module interfaces without approval. Every secret stays server-side and must never be committed or logged.


## Goal (1 sentence)
Provide one clean Prisma schema and initial migration that all backend features can build on without redefining participant, RSVP, verification, workshop, or submission data.

## Context you need to know
- `Participant` is the single source of truth for `name`, `email`, and `emailVerifiedAt`.
- Name and email are collected once through RSVP or public workshop enrollment.
  A workshop-only participant may have no RSVP.
- One participant has at most one RSVP and one workshop registration in the current project scope.
- A workshop registration stores exactly one selected path (`CTF`, `BCC`, or
  `CP`), a required phone number, optional NIM, and access status.
- Verification tokens are stored only as hashes; raw tokens must never be persisted.
- Submission metadata is stored in PostgreSQL; PDF bytes are stored in Cloudflare R2.
- Session is **stateless/signed-cookie based** in this sprint; do **not** add a `Session` table unless Backend Lead explicitly changes the contract.

## Required schema — implement exactly this domain shape
```prisma
enum RsvpStatus {
  PENDING
  VERIFIED
}

enum CompetitionPath {
  CTF
  BCC
  CP
}

enum WorkshopRegistrationStatus {
  PENDING
  ACTIVE
}

enum VerificationPurpose {
  RSVP
  WORKSHOP
}

model Participant {
  id              String    @id @default(cuid())
  name            String
  email           String    @unique
  emailVerifiedAt DateTime?

  rsvp                 Rsvp?
  verifications        EmailVerification[]
  workshopRegistration WorkshopRegistration?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Rsvp {
  id            String     @id @default(cuid())
  participantId String     @unique
  status        RsvpStatus @default(PENDING)

  participant Participant @relation(fields: [participantId], references: [id], onDelete: Cascade)

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

  participant Participant @relation(fields: [participantId], references: [id], onDelete: Cascade)

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

  participant Participant @relation(fields: [participantId], references: [id], onDelete: Cascade)
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

  workshopRegistration WorkshopRegistration @relation(fields: [workshopRegistrationId], references: [id], onDelete: Cascade)

  submittedAt DateTime @default(now())

  @@index([workshopRegistrationId])
}
```

## Suggested steps
1. Confirm or create root `prisma.config.ts` for Prisma ORM v7: load local `.env` with `dotenv/config`, point it to `prisma/schema.prisma` and `prisma/migrations`, and read `DATABASE_URL` through `env("DATABASE_URL")`. Do not replace an equivalent valid configuration.
2. Implement the approved models/enums above.
3. Generate one initial migration from a clean local database.
4. Run `prisma format`, `prisma validate`, and migration from an empty database.
5. Generate Prisma Client and verify the generated types expose all five models.
6. Add a minimal seed only if the repository already has a seed convention; otherwise do not invent one.

## Boundary (what you must NOT touch)
- Do not implement API routes, Zod schemas, services, session logic, email logic, or R2 logic.
- Do not add password/auth tables; this project uses email verification link + verified session.
- Do not make `nim` required; current contract keeps it optional.
- Do not make `phoneNumber` optional or move it to `Participant`.
- Do not add WhatsApp URLs/API data to the database.
- Do not add new competition paths beyond `CTF`, `BCC`, `CP`.
- Do not create a second identity table such as `WorkshopParticipant`.

## Done = (acceptance criteria — become tests/checks)
- [ ] `prisma validate` passes.
- [ ] `prisma.config.ts` resolves the schema, migrations, and server-only `DATABASE_URL` without committing a real environment file.
- [ ] Migration applies successfully to an empty PostgreSQL database.
- [ ] Migration can be replayed from scratch without manual SQL fixes.
- [ ] `Participant.email` is unique.
- [ ] `Rsvp.participantId` is unique.
- [ ] `WorkshopRegistration.participantId` is unique.
- [ ] `WorkshopRegistration` has required `competitionPath` and `phoneNumber`,
  optional `nim`, and `PENDING`/`ACTIVE` status with default `PENDING`.
- [ ] `CompetitionPath` contains exactly `CTF`, `BCC`, and `CP`.
- [ ] `VerificationPurpose` contains exactly `RSVP` and `WORKSHOP`.
- [ ] `EmailVerification.purpose` is required and supports purpose-specific
  verification/resend queries.
- [ ] Raw verification token has no database column; only `tokenHash` exists.
- [ ] Submission references `WorkshopRegistration`, not participant email.
- [ ] No WhatsApp field exists.
- [ ] No session table is introduced.
- [ ] Backend Lead approves schema + migration before BE-03/BE-04/BE-07/BE-10 merge against it.
