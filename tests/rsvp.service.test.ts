import { beforeEach, describe, expect, it, vi } from "vitest";

const { store, fakePrisma, findUniqueImpl, createImpl, updateImpl, findOrCreateParticipantMock } =
  vi.hoisted(() => {
    type RsvpRow = {
      id: string;
      participantId: string;
      status: "PENDING" | "VERIFIED";
      createdAt: Date;
      updatedAt: Date;
    };

    const store = new Map<string, RsvpRow>();

    const findUniqueImpl = async ({
      where,
    }: {
      where: { participantId: string };
    }): Promise<RsvpRow | null> => store.get(where.participantId) ?? null;

    const createImpl = async ({
      data,
    }: {
      data: { participantId: string; status: "PENDING" | "VERIFIED" };
    }): Promise<RsvpRow> => {
      if (store.has(data.participantId)) {
        throw Object.assign(new Error("unique constraint"), { code: "P2002" });
      }
      const row: RsvpRow = {
        id: `rsvp-${data.participantId}`,
        participantId: data.participantId,
        status: data.status,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.set(data.participantId, row);
      return row;
    };

    const updateImpl = async ({
      where,
      data,
    }: {
      where: { id: string };
      data: { status: "PENDING" | "VERIFIED" };
    }): Promise<RsvpRow> => {
      const row = [...store.values()].find((entry) => entry.id === where.id);
      if (!row) {
        throw new Error("record not found");
      }
      row.status = data.status;
      return row;
    };

    return {
      store,
      findUniqueImpl,
      createImpl,
      updateImpl,
      fakePrisma: {
        rsvp: { findUnique: vi.fn(findUniqueImpl), create: vi.fn(createImpl), update: vi.fn(updateImpl) },
      },
      findOrCreateParticipantMock: vi.fn(),
    };
  });

vi.mock("../lib/prisma", () => ({ prisma: fakePrisma }));
vi.mock("../services/participant.service", () => ({
  findOrCreateParticipant: findOrCreateParticipantMock,
}));

import {
  confirmRsvpForVerifiedParticipant,
  createOrGetPendingRsvp,
  createRsvp,
} from "../services/rsvp.service";

const participantId = "participant-1";

beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
  fakePrisma.rsvp.findUnique.mockReset().mockImplementation(findUniqueImpl);
  fakePrisma.rsvp.create.mockReset().mockImplementation(createImpl);
  fakePrisma.rsvp.update.mockReset().mockImplementation(updateImpl);
  findOrCreateParticipantMock.mockResolvedValue({
    id: participantId,
    name: "Ada Lovelace",
    email: "ada@example.com",
  });
});

describe("createOrGetPendingRsvp", () => {
  it("creates a PENDING RSVP when the participant has none", async () => {
    const { rsvp, isNew } = await createOrGetPendingRsvp(participantId);

    expect(isNew).toBe(true);
    expect(rsvp.participantId).toBe(participantId);
    expect(rsvp.status).toBe("PENDING");
    expect(store.size).toBe(1);
  });

  it("returns the existing PENDING RSVP without creating a second row", async () => {
    await createOrGetPendingRsvp(participantId);

    const { rsvp, isNew } = await createOrGetPendingRsvp(participantId);

    expect(isNew).toBe(false);
    expect(rsvp.status).toBe("PENDING");
    expect(store.size).toBe(1);
  });

  it("rejects an existing VERIFIED RSVP with 409 conflict", async () => {
    await createOrGetPendingRsvp(participantId);
    await confirmRsvpForVerifiedParticipant(participantId);

    await expect(createOrGetPendingRsvp(participantId)).rejects.toMatchObject({
      code: "CONFLICT",
      status: 409,
      message: "RSVP already verified",
    });
  });
});

describe("createRsvp", () => {
  it("creates a PENDING RSVP for a new participant", async () => {
    const result = await createRsvp({ name: "Ada Lovelace", email: "ada@example.com" });

    expect(result).toEqual({
      participantId,
      rsvpId: `rsvp-${participantId}`,
      status: "PENDING",
      isNew: true,
    });
    expect(findOrCreateParticipantMock).toHaveBeenCalledWith({
      name: "Ada Lovelace",
      email: "ada@example.com",
    });
  });

  it("returns the existing PENDING RSVP for a repeated request", async () => {
    await createRsvp({ name: "Ada Lovelace", email: "ada@example.com" });

    const result = await createRsvp({ name: "Ada Lovelace", email: "ada@example.com" });

    expect(result.isNew).toBe(false);
    expect(result.status).toBe("PENDING");
    expect(store.size).toBe(1);
  });

  it("rejects an existing VERIFIED RSVP with 409 conflict", async () => {
    await createRsvp({ name: "Ada Lovelace", email: "ada@example.com" });
    await confirmRsvpForVerifiedParticipant(participantId);

    await expect(
      createRsvp({ name: "Ada Lovelace", email: "ada@example.com" }),
    ).rejects.toMatchObject({ code: "CONFLICT", status: 409 });
  });

  it("surfaces a unique-constraint race by reading back the winning row", async () => {
    // First lookup sees no RSVP; a concurrent writer inserts one; our create
    // hits P2002; the service falls back to reading the winning row.
    fakePrisma.rsvp.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: `rsvp-${participantId}`,
        participantId,
        status: "PENDING",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    fakePrisma.rsvp.create.mockRejectedValueOnce(
      Object.assign(new Error("unique constraint"), { code: "P2002" }),
    );

    const result = await createRsvp({ name: "Ada Lovelace", email: "ada@example.com" });

    expect(result.isNew).toBe(false);
    expect(result.status).toBe("PENDING");
  });
});

describe("confirmRsvpForVerifiedParticipant", () => {
  it("creates a VERIFIED RSVP when the participant has none", async () => {
    const result = await confirmRsvpForVerifiedParticipant(participantId);

    expect(result).toEqual({
      rsvpId: `rsvp-${participantId}`,
      status: "VERIFIED",
      created: true,
    });
  });

  it("promotes an existing PENDING RSVP to VERIFIED", async () => {
    await createOrGetPendingRsvp(participantId);

    const result = await confirmRsvpForVerifiedParticipant(participantId);

    expect(result.created).toBe(false);
    expect(result.status).toBe("VERIFIED");
    expect(fakePrisma.rsvp.update).toHaveBeenCalledTimes(1);
  });

  it("rejects an already VERIFIED RSVP with 409 conflict", async () => {
    await createOrGetPendingRsvp(participantId);
    await confirmRsvpForVerifiedParticipant(participantId);

    await expect(confirmRsvpForVerifiedParticipant(participantId)).rejects.toMatchObject({
      code: "CONFLICT",
      status: 409,
      message: "RSVP already verified",
    });
  });
});
