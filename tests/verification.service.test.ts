import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cryptoState = vi.hoisted(() => ({ nextByte: 1 }));

vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  return { ...actual, randomBytes: () => Buffer.alloc(32, cryptoState.nextByte++) };
});

type Purpose = "ATTENDANCE" | "WORKSHOP";

type ParticipantRecord = {
  id: string;
  name: string;
  email: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type AttendanceRecord = {
  participantId: string;
  status: "PENDING" | "VERIFIED";
};

type WorkshopRegistrationRecord = {
  participantId: string;
  status: "PENDING" | "ACTIVE";
};

type VerificationRecord = {
  id: string;
  participantId: string;
  tokenHash: string;
  expiresAt: Date;
  verifiedAt: Date | null;
  purpose: Purpose;
  createdAt: Date;
};

function hashToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

function createFakePrisma() {
  const participants = new Map<string, ParticipantRecord>();
  const attendances = new Map<string, AttendanceRecord>();
  const registrations = new Map<string, WorkshopRegistrationRecord>();
  const verifications = new Map<string, VerificationRecord>();
  let nextVerificationId = 1;
  let transactionCalls = 0;

  const prisma = {
    participant: {
      async findUnique({ where }: { where: { email: string } }) {
        const participant = participants.get(where.email);
        if (!participant) return null;
        return {
          ...participant,
          attendance: attendances.get(participant.id) ?? null,
          workshopRegistration: registrations.get(participant.id) ?? null,
        };
      },
      async updateMany({
        where,
        data,
      }: {
        where: { id: string; emailVerifiedAt: null };
        data: { emailVerifiedAt: Date };
      }) {
        const participant = [...participants.values()].find(
          (record) => record.id === where.id && record.emailVerifiedAt === where.emailVerifiedAt,
        );
        if (!participant) return { count: 0 };
        participants.set(participant.email, { ...participant, ...data, updatedAt: new Date() });
        return { count: 1 };
      },
    },
    attendance: {
      async updateMany({
        where,
        data,
      }: {
        where: { participantId: string; status: "PENDING" };
        data: { status: "VERIFIED" };
      }) {
        const attendance = attendances.get(where.participantId);
        if (!attendance || attendance.status !== where.status) return { count: 0 };
        attendances.set(attendance.participantId, { ...attendance, ...data });
        return { count: 1 };
      },
    },
    workshopRegistration: {
      async updateMany({
        where,
        data,
      }: {
        where: { participantId: string; status: "PENDING" };
        data: { status: "ACTIVE" };
      }) {
        const registration = registrations.get(where.participantId);
        if (!registration || registration.status !== where.status) return { count: 0 };
        registrations.set(registration.participantId, { ...registration, ...data });
        return { count: 1 };
      },
    },
    emailVerification: {
      async create({
        data,
      }: {
        data: Omit<VerificationRecord, "id" | "createdAt" | "verifiedAt">;
      }) {
        const record: VerificationRecord = {
          id: `verification-${nextVerificationId++}`,
          ...data,
          verifiedAt: null,
          createdAt: new Date(),
        };
        verifications.set(record.tokenHash, record);
        return record;
      },
      async findUnique({ where }: { where: { tokenHash: string } }) {
        return verifications.get(where.tokenHash) ?? null;
      },
      async findFirst({
        where,
      }: {
        where: { participantId: string; purpose: Purpose };
        orderBy: { createdAt: "desc" };
      }) {
        return [...verifications.values()]
          .filter(
            (record) =>
              record.participantId === where.participantId && record.purpose === where.purpose,
          )
          .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0] ?? null;
      },
      async updateMany({
        where,
        data,
      }: {
        where: { id: string; verifiedAt: null };
        data: { verifiedAt: Date };
      }) {
        const record = [...verifications.values()].find(
          (candidate) => candidate.id === where.id && candidate.verifiedAt === where.verifiedAt,
        );
        if (!record) return { count: 0 };
        verifications.set(record.tokenHash, { ...record, ...data });
        return { count: 1 };
      },
      async deleteMany({
        where,
      }: {
        where: { participantId: string; purpose: Purpose; verifiedAt: null };
      }) {
        let count = 0;
        for (const [tokenHash, record] of verifications) {
          if (
            record.participantId === where.participantId &&
            record.purpose === where.purpose &&
            record.verifiedAt === where.verifiedAt
          ) {
            verifications.delete(tokenHash);
            count++;
          }
        }
        return { count };
      },
    },
    async $transaction<T>(callback: (transaction: unknown) => Promise<T>) {
      transactionCalls++;
      return callback(prisma);
    },
    seedParticipant(record: ParticipantRecord) {
      participants.set(record.email, record);
    },
    seedAttendance(record: AttendanceRecord) {
      attendances.set(record.participantId, record);
    },
    seedRegistration(record: WorkshopRegistrationRecord) {
      registrations.set(record.participantId, record);
    },
    seedVerification(record: VerificationRecord) {
      verifications.set(record.tokenHash, record);
    },
    getParticipant(email: string) {
      return participants.get(email);
    },
    getAttendance(participantId: string) {
      return attendances.get(participantId);
    },
    getRegistration(participantId: string) {
      return registrations.get(participantId);
    },
    getVerifications() {
      return [...verifications.values()];
    },
    get transactionCalls() {
      return transactionCalls;
    },
  };

  return prisma;
}

function participant(overrides: Partial<ParticipantRecord> = {}): ParticipantRecord {
  return {
    id: "participant-1",
    name: "Ada Lovelace",
    email: "ada@example.com",
    emailVerifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function verification(
  rawToken: string,
  purpose: Purpose,
  overrides: Partial<VerificationRecord> = {},
): VerificationRecord {
  return {
    id: `seed-${rawToken}`,
    participantId: "participant-1",
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + 15 * 60_000),
    verifiedAt: null,
    purpose,
    createdAt: new Date(),
    ...overrides,
  };
}

let prisma = createFakePrisma();

vi.mock("../lib/prisma", () => ({ getPrisma: () => prisma }));

import {
  createVerification,
  resendVerification,
  verifyToken,
} from "../services/verification.service";

const originalAppBaseUrl = process.env.APP_BASE_URL;
const originalTtl = process.env.EMAIL_VERIFICATION_TTL_MINUTES;
const originalCooldown = process.env.EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-11T00:00:00.000Z"));
  cryptoState.nextByte = 1;
  prisma = createFakePrisma();
  process.env.APP_BASE_URL = "https://app.example.test/base";
  process.env.EMAIL_VERIFICATION_TTL_MINUTES = "15";
  process.env.EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS = "60";
});

afterEach(() => {
  vi.useRealTimers();
  if (originalAppBaseUrl === undefined) delete process.env.APP_BASE_URL;
  else process.env.APP_BASE_URL = originalAppBaseUrl;
  if (originalTtl === undefined) delete process.env.EMAIL_VERIFICATION_TTL_MINUTES;
  else process.env.EMAIL_VERIFICATION_TTL_MINUTES = originalTtl;
  if (originalCooldown === undefined) delete process.env.EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS;
  else process.env.EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS = originalCooldown;
});

describe("verification lifecycle", () => {
  it("stores a hash instead of the raw token and returns a server-only URL", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    prisma.seedParticipant(participant());

    const dispatch = await createVerification("participant-1", "ATTENDANCE");
    const rawToken = new URL(dispatch.verificationUrl).searchParams.get("token")!;
    const [stored] = prisma.getVerifications();

    expect(dispatch).toMatchObject({ participantId: "participant-1", purpose: "ATTENDANCE" });
    expect(dispatch.verificationUrl).toBe(
      `https://app.example.test/api/verifications/verify?token=${encodeURIComponent(rawToken)}`,
    );
    expect(stored).toMatchObject({
      participantId: "participant-1",
      tokenHash: hashToken(rawToken),
      expiresAt: new Date("2026-08-11T00:15:00.000Z"),
      purpose: "ATTENDANCE",
    });
    expect(stored.tokenHash).not.toBe(rawToken);
    expect(JSON.stringify(stored)).not.toContain(rawToken);
    expect(log).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it("rejects unknown, expired, and used tokens", async () => {
    await expect(verifyToken("unknown")).rejects.toMatchObject({ status: 400 });

    prisma.seedVerification(
      verification("expired", "ATTENDANCE", { expiresAt: new Date("2026-08-11T00:00:00.000Z") }),
    );
    await expect(verifyToken("expired")).rejects.toMatchObject({ status: 410 });

    prisma.seedVerification(verification("used", "ATTENDANCE", { verifiedAt: new Date() }));
    await expect(verifyToken("used")).rejects.toMatchObject({ status: 400 });
  });

  it("verifies only pending Attendance for an ATTENDANCE token in one transaction", async () => {
    prisma.seedParticipant(participant());
    prisma.seedAttendance({ participantId: "participant-1", status: "PENDING" });
    prisma.seedRegistration({ participantId: "participant-1", status: "PENDING" });
    prisma.seedVerification(verification("attendance-token", "ATTENDANCE"));

    await expect(verifyToken("attendance-token")).resolves.toEqual({
      participantId: "participant-1",
      purpose: "ATTENDANCE",
    });

    expect(prisma.transactionCalls).toBe(1);
    expect(prisma.getParticipant("ada@example.com")?.emailVerifiedAt).toEqual(
      new Date("2026-08-11T00:00:00.000Z"),
    );
    expect(prisma.getAttendance("participant-1")).toMatchObject({ status: "VERIFIED" });
    expect(prisma.getRegistration("participant-1")).toMatchObject({ status: "PENDING" });
    expect(prisma.getVerifications()[0]?.verifiedAt).toEqual(new Date("2026-08-11T00:00:00.000Z"));
  });

  it("activates only a pending workshop registration for a WORKSHOP token", async () => {
    prisma.seedParticipant(participant());
    prisma.seedAttendance({ participantId: "participant-1", status: "PENDING" });
    prisma.seedRegistration({ participantId: "participant-1", status: "PENDING" });
    prisma.seedVerification(verification("workshop-token", "WORKSHOP"));

    await expect(verifyToken("workshop-token")).resolves.toEqual({
      participantId: "participant-1",
      purpose: "WORKSHOP",
    });

    expect(prisma.getAttendance("participant-1")).toMatchObject({ status: "PENDING" });
    expect(prisma.getRegistration("participant-1")).toMatchObject({ status: "ACTIVE" });
  });

  it("rejects attendance resend when no pending Attendance is eligible", async () => {
    prisma.seedParticipant(participant());
    await expect(
      resendVerification({ email: " ADA@example.com ", purpose: "ATTENDANCE" }),
    ).rejects.toMatchObject({ status: 404 });

    prisma.seedAttendance({ participantId: "participant-1", status: "VERIFIED" });
    await expect(
      resendVerification({ email: "ada@example.com", purpose: "ATTENDANCE" }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("allows workshop resend for an active registration without mutating it", async () => {
    prisma.seedParticipant(participant({ name: "Grace Hopper", email: "grace@example.com" }));
    prisma.seedRegistration({ participantId: "participant-1", status: "ACTIVE" });

    const dispatch = await resendVerification({ email: " GRACE@example.com ", purpose: "WORKSHOP" });

    expect(dispatch).toMatchObject({
      participantId: "participant-1",
      participantName: "Grace Hopper",
      email: "grace@example.com",
      purpose: "WORKSHOP",
    });
    expect(prisma.getRegistration("participant-1")).toMatchObject({ status: "ACTIVE" });
  });

  it("enforces the same-purpose cooldown and invalidates only unused same-purpose tokens", async () => {
    prisma.seedParticipant(participant());
    prisma.seedAttendance({ participantId: "participant-1", status: "PENDING" });
    prisma.seedVerification(
      verification("recent-attendance", "ATTENDANCE", {
        createdAt: new Date("2026-08-10T23:59:30.000Z"),
      }),
    );

    await expect(
      resendVerification({ email: "ada@example.com", purpose: "ATTENDANCE" }),
    ).rejects.toMatchObject({ status: 429 });

    vi.setSystemTime(new Date("2026-08-11T00:00:31.000Z"));
    prisma.seedVerification(
      verification("used-attendance", "ATTENDANCE", {
        createdAt: new Date("2026-08-10T23:57:00.000Z"),
        verifiedAt: new Date("2026-08-10T23:58:00.000Z"),
      }),
    );
    prisma.seedVerification(
      verification("workshop-token", "WORKSHOP", {
        createdAt: new Date("2026-08-11T00:00:00.000Z"),
      }),
    );

    const dispatch = await resendVerification({ email: "ada@example.com", purpose: "ATTENDANCE" });
    const records = prisma.getVerifications();
    const rawToken = new URL(dispatch.verificationUrl).searchParams.get("token")!;

    expect(records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tokenHash: hashToken("used-attendance"), purpose: "ATTENDANCE" }),
        expect.objectContaining({ tokenHash: hashToken("workshop-token"), purpose: "WORKSHOP" }),
        expect.objectContaining({ tokenHash: hashToken(rawToken), purpose: "ATTENDANCE", verifiedAt: null }),
      ]),
    );
    expect(records.some((record) => record.tokenHash === hashToken("recent-attendance"))).toBe(false);
  });
});
