import { beforeEach, describe, expect, it, vi } from "vitest";

const boundaries = vi.hoisted(() => ({ getPrisma: vi.fn() }));

vi.mock("../lib/prisma", () => ({ getPrisma: boundaries.getPrisma }));

import {
  findActiveRegistrationByParticipantId,
  registerParticipant,
} from "../services/workshop.service";

let create: ReturnType<typeof vi.fn>;
let findFirst: ReturnType<typeof vi.fn>;

beforeEach(() => {
  create = vi.fn();
  findFirst = vi.fn();
  boundaries.getPrisma.mockReturnValue({
    workshopRegistration: { create, findFirst },
  });
});

describe("workshop activation service", () => {
  it("creates one ACTIVE registration from the trusted participant ID", async () => {
    create.mockResolvedValue({
      id: "registration-1",
      participantId: "participant-1",
      competitionPath: "CTF",
      phoneNumber: "+62812345678",
      nim: null,
      status: "ACTIVE",
    });

    await expect(
      registerParticipant("participant-1", {
        competitionPath: "CTF",
        phoneNumber: "+62812345678",
      }),
    ).resolves.toMatchObject({
      status: "ACTIVE",
      competitionPath: "CTF",
      nim: null,
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        participantId: "participant-1",
        competitionPath: "CTF",
        phoneNumber: "+62812345678",
        nim: null,
        status: "ACTIVE",
      },
    });
  });

  it("maps a unique registration conflict to 409 without overwriting PII", async () => {
    create.mockRejectedValue({ code: "P2002" });

    await expect(
      registerParticipant("participant-1", {
        competitionPath: "BCC",
        phoneNumber: "+62899999999",
        nim: "12345678",
      }),
    ).rejects.toMatchObject({
      status: 409,
      message: "Workshop participant already registered",
    });
  });

  it("returns only active registrations for downstream eligibility", async () => {
    findFirst.mockResolvedValue(null);
    await expect(
      findActiveRegistrationByParticipantId("participant-1"),
    ).resolves.toBeNull();
    expect(findFirst).toHaveBeenCalledWith({
      where: { participantId: "participant-1", status: "ACTIVE" },
    });

    const active = {
      id: "registration-1",
      participantId: "participant-1",
      status: "ACTIVE",
    };
    findFirst.mockResolvedValue(active);
    await expect(
      findActiveRegistrationByParticipantId("participant-1"),
    ).resolves.toBe(active);
  });
});
