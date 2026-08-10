import { beforeEach, describe, expect, it, vi } from "vitest";

type ParticipantRecord = {
  id: string;
  name: string;
  email: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type RegistrationRecord = {
  id: string;
  participantId: string;
  competitionPath: "CTF" | "BCC" | "CP";
  phoneNumber: string;
  nim: string | null;
  status: "PENDING" | "ACTIVE";
  createdAt: Date;
  updatedAt: Date;
};

function createFakePrisma() {
  const participants = new Map<string, ParticipantRecord>();
  const registrations = new Map<string, RegistrationRecord>();
  let nextParticipantId = 1;
  let nextRegistrationId = 1;
  let attendanceCreates = 0;

  return {
    participant: {
      async create({ data }: { data: Pick<ParticipantRecord, "name" | "email"> }) {
        const existing = participants.get(data.email);
        if (existing) throw { code: "P2002" };

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
    },
    attendance: {
      async create() {
        attendanceCreates++;
      },
    },
    workshopRegistration: {
      async findUnique({ where }: { where: { participantId: string } }) {
        return registrations.get(where.participantId) ?? null;
      },
      async create({
        data,
      }: {
        data: Pick<RegistrationRecord, "participantId" | "competitionPath" | "phoneNumber" | "nim" | "status">;
      }) {
        const record: RegistrationRecord = {
          id: `registration-${nextRegistrationId++}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        registrations.set(record.participantId, record);
        return record;
      },
    },
    seedParticipant(record: ParticipantRecord) {
      participants.set(record.email, record);
    },
    seedRegistration(record: RegistrationRecord) {
      registrations.set(record.participantId, record);
    },
    get attendanceCreates() {
      return attendanceCreates;
    },
  };
}

let prisma = createFakePrisma();

vi.mock("../lib/prisma", () => ({ getPrisma: () => prisma }));

import { enrollWorkshop } from "../services/workshop.service";

beforeEach(() => {
  prisma = createFakePrisma();
});

describe("public workshop entry service", () => {
  it("creates a pending registration without creating attendance", async () => {
    const result = await enrollWorkshop({
      name: "Grace Hopper",
      email: "grace@example.com",
      competitionPath: "CTF",
      phoneNumber: "+62812345678",
      nim: "12345678",
    });

    expect(result.created).toBe(true);
    expect(result.registration).toMatchObject({
      status: "PENDING",
      competitionPath: "CTF",
      phoneNumber: "+62812345678",
      nim: "12345678",
    });
    expect(result.participant.emailVerifiedAt).toBeNull();
    expect(prisma.attendanceCreates).toBe(0);
  });

  it("returns a pending duplicate without updating saved registration data", async () => {
    const participant: ParticipantRecord = {
      id: "participant-1",
      name: "Grace Hopper",
      email: "grace@example.com",
      emailVerifiedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const registration: RegistrationRecord = {
      id: "registration-1",
      participantId: participant.id,
      competitionPath: "CTF",
      phoneNumber: "+62812345678",
      nim: "12345678",
      status: "PENDING",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prisma.seedParticipant(participant);
    prisma.seedRegistration(registration);

    await expect(
      enrollWorkshop({
        name: "Changed Name",
        email: " GRACE@example.com ",
        competitionPath: "CP",
        phoneNumber: "+62899999999",
      }),
    ).resolves.toEqual({ participant, registration, created: false });
  });

  it("rejects an active registration with a conflict", async () => {
    const participant: ParticipantRecord = {
      id: "participant-1",
      name: "Grace Hopper",
      email: "grace@example.com",
      emailVerifiedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prisma.seedParticipant(participant);
    prisma.seedRegistration({
      id: "registration-active",
      participantId: participant.id,
      competitionPath: "BCC",
      phoneNumber: "+62812345678",
      nim: null,
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      enrollWorkshop({
        name: "Grace Hopper",
        email: "grace@example.com",
        competitionPath: "BCC",
        phoneNumber: "+62812345678",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT", status: 409 });
  });
});
