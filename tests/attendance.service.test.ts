import { beforeEach, describe, expect, it, vi } from "vitest";

type ParticipantRecord = {
  id: string;
  name: string;
  email: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type AttendanceRecord = {
  id: string;
  participantId: string;
  status: "PENDING" | "VERIFIED";
  attendeeType: "STUDENT" | "PUBLIC";
  institution: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function createFakePrisma() {
  const participants = new Map<string, ParticipantRecord>();
  const attendances = new Map<string, AttendanceRecord>();
  let nextParticipantId = 1;
  let nextAttendanceId = 1;
  let nextParticipantCreateError: unknown;
  let attendanceCreates = 0;

  const participant = {
    async create({ data }: { data: Pick<ParticipantRecord, "name" | "email"> }) {
      const error = nextParticipantCreateError;
      nextParticipantCreateError = undefined;
      if (error) throw error;
      if (participants.has(data.email)) throw { code: "P2002" };

      const record: ParticipantRecord = {
        id: `participant-${nextParticipantId++}`,
        ...data,
        emailVerifiedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      participants.set(record.email, record);
      return record;
    },
    async findUnique({ where }: { where: { email?: string } }) {
      return where.email ? participants.get(where.email) ?? null : null;
    },
  };

  const attendance = {
    async findUnique({ where }: { where: { participantId: string } }) {
      return attendances.get(where.participantId) ?? null;
    },
    async create({
      data,
    }: {
      data: Pick<AttendanceRecord, "participantId" | "status" | "attendeeType" | "institution">;
    }) {
      attendanceCreates++;
      const record: AttendanceRecord = {
        id: `attendance-${nextAttendanceId++}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      attendances.set(record.participantId, record);
      return record;
    },
    async update({
      where,
      data,
    }: {
      where: { participantId: string };
      data: Pick<AttendanceRecord, "status">;
    }) {
      const record = attendances.get(where.participantId)!;
      const updated = { ...record, ...data, updatedAt: new Date() };
      attendances.set(where.participantId, updated);
      return updated;
    },
  };

  return {
    participant,
    attendance,
    workshopRegistration: {},
    seedParticipant(record: ParticipantRecord) {
      participants.set(record.email, record);
    },
    seedAttendance(record: AttendanceRecord) {
      attendances.set(record.participantId, record);
    },
    setParticipantCreateError(error: unknown) {
      nextParticipantCreateError = error;
    },
    get attendanceCreates() {
      return attendanceCreates;
    },
  };
}

let prisma = createFakePrisma();

vi.mock("../lib/prisma", () => ({ getPrisma: () => prisma }));

import {
  confirmAttendanceForVerifiedParticipant,
  createAttendance,
} from "../services/attendance.service";
import { findOrCreateParticipant, normalizeEmail } from "../services/participant.service";

beforeEach(() => {
  prisma = createFakePrisma();
});

describe("attendance entry services", () => {
  it("normalizes email and retries the identity lookup after a unique conflict", async () => {
    expect(normalizeEmail(" Ada@Example.COM ")).toBe("ada@example.com");

    const existing: ParticipantRecord = {
      id: "participant-existing",
      name: "Ada Lovelace",
      email: "ada@example.com",
      emailVerifiedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prisma.seedParticipant(existing);
    prisma.setParticipantCreateError({ code: "P2002" });

    await expect(findOrCreateParticipant({ name: " Ada ", email: " Ada@Example.COM " })).resolves.toBe(
      existing,
    );
  });

  it("creates a pending attendance with the submitted classification", async () => {
    const result = await createAttendance({
      name: "Ada Lovelace",
      email: "ada@example.com",
      attendeeType: "STUDENT",
      institution: " Bina Nusantara ",
    });

    expect(result.created).toBe(true);
    expect(result.attendance).toMatchObject({
      status: "PENDING",
      attendeeType: "STUDENT",
      institution: "Bina Nusantara",
    });
  });

  it("returns a pending duplicate without overwriting its classification", async () => {
    const first = await createAttendance({
      name: "Ada Lovelace",
      email: "ada@example.com",
      attendeeType: "STUDENT",
      institution: "Bina Nusantara",
    });

    const repeated = await createAttendance({
      name: "Changed Name",
      email: " ADA@example.com ",
      attendeeType: "PUBLIC",
    });

    expect(repeated).toEqual({ participant: first.participant, attendance: first.attendance, created: false });
  });

  it("rejects a verified duplicate with a conflict", async () => {
    const participant: ParticipantRecord = {
      id: "participant-verified",
      name: "Ada Lovelace",
      email: "ada@example.com",
      emailVerifiedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prisma.seedParticipant(participant);
    prisma.seedAttendance({
      id: "attendance-verified",
      participantId: participant.id,
      status: "VERIFIED",
      attendeeType: "PUBLIC",
      institution: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      createAttendance({ name: "Ada Lovelace", email: "ada@example.com", attendeeType: "PUBLIC" }),
    ).rejects.toMatchObject({ code: "CONFLICT", status: 409 });
  });

  it("creates a verified attendance during trusted confirmation when one is missing", async () => {
    const result = await confirmAttendanceForVerifiedParticipant("participant-1", {
      attendeeType: "PUBLIC",
    });

    expect(result).toMatchObject({
      created: true,
      attendance: { participantId: "participant-1", status: "VERIFIED", attendeeType: "PUBLIC", institution: null },
    });
  });

  it("promotes only a matching pending attendance during trusted confirmation", async () => {
    prisma.seedAttendance({
      id: "attendance-pending",
      participantId: "participant-1",
      status: "PENDING",
      attendeeType: "STUDENT",
      institution: "Bina Nusantara",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      confirmAttendanceForVerifiedParticipant("participant-1", {
        attendeeType: "STUDENT",
        institution: " Bina Nusantara ",
      }),
    ).resolves.toMatchObject({ created: false, attendance: { status: "VERIFIED" } });
  });

  it("rejects a mismatched pending classification during trusted confirmation", async () => {
    prisma.seedAttendance({
      id: "attendance-pending",
      participantId: "participant-1",
      status: "PENDING",
      attendeeType: "PUBLIC",
      institution: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      confirmAttendanceForVerifiedParticipant("participant-1", {
        attendeeType: "STUDENT",
        institution: "Bina Nusantara",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT", status: 409 });
  });
});
