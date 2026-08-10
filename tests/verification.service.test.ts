import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationError } from "../errors/application-error";

type Purpose = "ATTENDANCE" | "WORKSHOP";

const aegis = vi.hoisted(() => ({
  getAegisVerificationStatus: vi.fn(),
  sendAegisVerification: vi.fn(),
}));

vi.mock("../lib/aegis-verification", () => aegis);

type ParticipantRecord = {
  id: string;
  name: string;
  email: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type AttendanceRecord = { participantId: string; status: "PENDING" | "VERIFIED" };
type WorkshopRecord = { participantId: string; status: "PENDING" | "ACTIVE" };

function createFakePrisma() {
  const participants = new Map<string, ParticipantRecord>();
  const attendances = new Map<string, AttendanceRecord>();
  const registrations = new Map<string, WorkshopRecord>();
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
    seedRegistration(record: WorkshopRecord) {
      registrations.set(record.participantId, record);
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
    createdAt: new Date("2026-08-11T00:00:00.000Z"),
    updatedAt: new Date("2026-08-11T00:00:00.000Z"),
    ...overrides,
  };
}

let prisma = createFakePrisma();

vi.mock("../lib/prisma", () => ({ getPrisma: () => prisma }));

import {
  getVerificationStatus,
  resendVerification,
  sendVerification,
} from "../services/verification.service";

beforeEach(() => {
  prisma = createFakePrisma();
  aegis.getAegisVerificationStatus.mockReset();
  aegis.sendAegisVerification.mockReset();
});

describe("Aegis verification synchronization", () => {
  it("sends verification for a locally unverified participant", async () => {
    const record = participant();
    aegis.sendAegisVerification.mockResolvedValue({
      status: "sent",
      expiresAt: "2026-08-11T01:00:00.000Z",
    });

    await expect(sendVerification(record)).resolves.toEqual({
      status: "sent",
      expiresAt: "2026-08-11T01:00:00.000Z",
    });
    expect(aegis.sendAegisVerification).toHaveBeenCalledWith("ada@example.com");
    expect(record.emailVerifiedAt).toBeNull();
  });

  it("syncs an already-verified send result in one local transaction", async () => {
    const record = participant();
    prisma.seedParticipant(record);
    prisma.seedAttendance({ participantId: record.id, status: "PENDING" });
    prisma.seedRegistration({ participantId: record.id, status: "PENDING" });
    aegis.sendAegisVerification.mockResolvedValue({
      status: "already_verified",
      verifiedAt: "2026-08-11T02:00:00.000Z",
    });

    await expect(sendVerification(record)).resolves.toEqual({
      status: "already_verified",
      verifiedAt: "2026-08-11T02:00:00.000Z",
    });
    expect(prisma.transactionCalls).toBe(1);
    expect(prisma.getParticipant(record.email)?.emailVerifiedAt).toEqual(
      new Date("2026-08-11T02:00:00.000Z"),
    );
    expect(prisma.getAttendance(record.id)?.status).toBe("VERIFIED");
    expect(prisma.getRegistration(record.id)?.status).toBe("ACTIVE");
  });

  it("syncs external verified status and returns the Aegis timestamp", async () => {
    const record = participant();
    prisma.seedParticipant(record);
    prisma.seedAttendance({ participantId: record.id, status: "PENDING" });
    prisma.seedRegistration({ participantId: record.id, status: "PENDING" });
    aegis.getAegisVerificationStatus.mockResolvedValue({
      status: "verified",
      verifiedAt: "2026-08-11T03:00:00.000Z",
    });

    await expect(getVerificationStatus(record)).resolves.toEqual({
      verified: true,
      status: "verified",
      verifiedAt: "2026-08-11T03:00:00.000Z",
    });
    expect(prisma.getParticipant(record.email)?.emailVerifiedAt).toEqual(
      new Date("2026-08-11T03:00:00.000Z"),
    );
  });

  it("keeps the database unverified for a pending or unknown Aegis email", async () => {
    const record = participant();
    prisma.seedParticipant(record);
    aegis.getAegisVerificationStatus.mockResolvedValueOnce({
      status: "not_verified",
      registeredAt: "2026-08-11T00:00:00.000Z",
      linkActive: false,
    });
    aegis.getAegisVerificationStatus.mockResolvedValueOnce({ status: "not_registered" });

    await expect(getVerificationStatus(record)).resolves.toEqual({
      verified: false,
      status: "not_verified",
      registeredAt: "2026-08-11T00:00:00.000Z",
      linkActive: false,
    });
    await expect(getVerificationStatus(record)).resolves.toEqual({
      verified: false,
      status: "not_registered",
    });
    expect(prisma.getParticipant(record.email)?.emailVerifiedAt).toBeNull();
  });

  it("never requests upstream status for an already verified local participant", async () => {
    const verifiedAt = new Date("2026-08-11T04:00:00.000Z");
    const record = participant({ emailVerifiedAt: verifiedAt });

    await expect(getVerificationStatus(record)).resolves.toEqual({
      verified: true,
      status: "verified",
      verifiedAt: "2026-08-11T04:00:00.000Z",
    });
    expect(aegis.getAegisVerificationStatus).not.toHaveBeenCalled();
  });

  it("resends only for an eligible local purpose and propagates Aegis results", async () => {
    const record = participant();
    prisma.seedParticipant(record);
    prisma.seedAttendance({ participantId: record.id, status: "PENDING" });
    aegis.sendAegisVerification.mockResolvedValue({
      status: "sent",
      expiresAt: "2026-08-11T01:00:00.000Z",
    });

    await expect(
      resendVerification({ email: " ADA@example.com ", purpose: "ATTENDANCE" as Purpose }),
    ).resolves.toEqual({ status: "sent", expiresAt: "2026-08-11T01:00:00.000Z" });
    expect(aegis.sendAegisVerification).toHaveBeenCalledWith("ada@example.com");

    await expect(
      resendVerification({ email: "ada@example.com", purpose: "WORKSHOP" as Purpose }),
    ).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
  });

  it("retains existing attendance conflict semantics before sending", async () => {
    const record = participant();
    prisma.seedParticipant(record);
    prisma.seedAttendance({ participantId: record.id, status: "VERIFIED" });

    await expect(
      resendVerification({ email: "ada@example.com", purpose: "ATTENDANCE" as Purpose }),
    ).rejects.toEqual(new ApplicationError("CONFLICT", 409, "Attendance already verified"));
    expect(aegis.sendAegisVerification).not.toHaveBeenCalled();
  });
});
