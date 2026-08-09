import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationError } from "../errors/application-error";
import { createRsvpSchema, confirmRsvpSchema } from "../schemas/rsvp.schema";

const {
  findUniqueParticipantMock,
  createParticipantMock,
  findUniqueRsvpMock,
  createRsvpMock,
  updateRsvpMock,
  findFirstRsvpMock,
  findManyRsvpMock,
} = vi.hoisted(() => ({
  findUniqueParticipantMock: vi.fn(),
  createParticipantMock: vi.fn(),
  findUniqueRsvpMock: vi.fn(),
  createRsvpMock: vi.fn(),
  updateRsvpMock: vi.fn(),
  findFirstRsvpMock: vi.fn(),
  findManyRsvpMock: vi.fn(),
}));

vi.mock("../lib/prisma", () => ({
  prisma: {
    participant: {
      findUnique: findUniqueParticipantMock,
      create: createParticipantMock,
    },
    rsvp: {
      findUnique: findUniqueRsvpMock,
      create: createRsvpMock,
      update: updateRsvpMock,
      findFirst: findFirstRsvpMock,
      findMany: findManyRsvpMock,
    },
  },
}));

const {
  createRsvp,
  confirmRsvpForVerifiedParticipant,
  findRsvpByParticipantId,
  findRsvpById,
  findRsvpByEmail,
  getAllRsvps,
} = await import("../services/rsvp.service");

describe("RSVP Zod Schema", () => {
  it("validates payload correctly for createRsvpSchema", () => {
    const valid = createRsvpSchema.safeParse({
      name: "   Budi Santoso  ",
      email: "budi@example.com",
    });
    expect(valid.success).toBe(true);

    const invalidEmail = createRsvpSchema.safeParse({
      name: "Budi",
      email: "not-an-email",
    });
    expect(invalidEmail.success).toBe(false);

    const extraFields = createRsvpSchema.safeParse({
      name: "Budi",
      email: "budi@example.com",
      status: "VERIFIED",
    });
    expect(extraFields.success).toBe(false);
  });

  it("validates confirmRsvpSchema strictly accepts empty object", () => {
    expect(confirmRsvpSchema.safeParse({}).success).toBe(true);
    expect(confirmRsvpSchema.safeParse({ name: "hack" }).success).toBe(false);
  });
});

describe("RSVP Service primitives", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createRsvp", () => {
    it("creates a new Participant and PENDING RSVP when participant does not exist", async () => {
      findUniqueParticipantMock.mockResolvedValue(null);
      createParticipantMock.mockResolvedValue({
        id: "p-123",
        name: "Budi Santoso",
        email: "budi@example.com",
        emailVerifiedAt: null,
      });
      findUniqueRsvpMock.mockResolvedValue(null);
      createRsvpMock.mockResolvedValue({
        id: "rsvp-123",
        participantId: "p-123",
        status: "PENDING",
      });

      const result = await createRsvp({
        name: "  Budi Santoso ",
        email: "BUDI@EXAMPLE.COM ",
      });

      expect(createParticipantMock).toHaveBeenCalledWith({
        data: {
          name: "Budi Santoso",
          email: "budi@example.com",
          emailVerifiedAt: null,
        },
      });
      expect(createRsvpMock).toHaveBeenCalledWith({
        data: {
          participantId: "p-123",
          status: "PENDING",
        },
      });
      expect(result.isExisting).toBe(false);
      expect(result.rsvp.id).toBe("rsvp-123");
    });

    it("returns existing RSVP if participant already has a PENDING RSVP", async () => {
      const existingParticipant = {
        id: "p-123",
        name: "Budi Santoso",
        email: "budi@example.com",
      };
      const existingRsvp = {
        id: "rsvp-123",
        participantId: "p-123",
        status: "PENDING",
      };

      findUniqueParticipantMock.mockResolvedValue(existingParticipant);
      findUniqueRsvpMock.mockResolvedValue(existingRsvp);

      const result = await createRsvp({
        name: "Budi Santoso",
        email: "budi@example.com",
      });

      expect(createRsvpMock).not.toHaveBeenCalled();
      expect(result.isExisting).toBe(true);
      expect(result.rsvp.id).toBe("rsvp-123");
    });

    it("throws 409 CONFLICT if participant already has a VERIFIED RSVP", async () => {
      const existingParticipant = {
        id: "p-123",
        name: "Budi Santoso",
        email: "budi@example.com",
      };
      const verifiedRsvp = {
        id: "rsvp-123",
        participantId: "p-123",
        status: "VERIFIED",
      };

      findUniqueParticipantMock.mockResolvedValue(existingParticipant);
      findUniqueRsvpMock.mockResolvedValue(verifiedRsvp);

      await expect(
        createRsvp({ name: "Budi Santoso", email: "budi@example.com" }),
      ).rejects.toMatchObject({
        status: 409,
        message: "RSVP has already been verified",
      });
    });
  });

  describe("confirmRsvpForVerifiedParticipant", () => {
    it("creates a VERIFIED RSVP if no RSVP exists", async () => {
      findUniqueRsvpMock.mockResolvedValue(null);
      createRsvpMock.mockResolvedValue({
        id: "rsvp-1",
        participantId: "p-1",
        status: "VERIFIED",
      });

      const rsvp = await confirmRsvpForVerifiedParticipant("p-1");

      expect(createRsvpMock).toHaveBeenCalledWith({
        data: {
          participantId: "p-1",
          status: "VERIFIED",
        },
      });
      expect(rsvp.status).toBe("VERIFIED");
    });

    it("promotes a PENDING RSVP to VERIFIED", async () => {
      findUniqueRsvpMock.mockResolvedValue({
        id: "rsvp-1",
        participantId: "p-1",
        status: "PENDING",
      });
      updateRsvpMock.mockResolvedValue({
        id: "rsvp-1",
        participantId: "p-1",
        status: "VERIFIED",
      });

      const rsvp = await confirmRsvpForVerifiedParticipant("p-1");

      expect(updateRsvpMock).toHaveBeenCalledWith({
        where: { id: "rsvp-1" },
        data: { status: "VERIFIED" },
      });
      expect(rsvp.status).toBe("VERIFIED");
    });

    it("throws 409 CONFLICT if RSVP is already VERIFIED", async () => {
      findUniqueRsvpMock.mockResolvedValue({
        id: "rsvp-1",
        participantId: "p-1",
        status: "VERIFIED",
      });

      await expect(confirmRsvpForVerifiedParticipant("p-1")).rejects.toBeInstanceOf(
        ApplicationError,
      );
    });
  });

  describe("Query DB helpers", () => {
    it("findRsvpByParticipantId queries prisma by participantId", async () => {
      findUniqueRsvpMock.mockResolvedValue({ id: "rsvp-1" });
      await findRsvpByParticipantId("p-1");
      expect(findUniqueRsvpMock).toHaveBeenCalledWith({
        where: { participantId: "p-1" },
        include: { participant: true },
      });
    });

    it("findRsvpById queries prisma by id", async () => {
      findUniqueRsvpMock.mockResolvedValue({ id: "rsvp-1" });
      await findRsvpById("rsvp-1");
      expect(findUniqueRsvpMock).toHaveBeenCalledWith({
        where: { id: "rsvp-1" },
        include: { participant: true },
      });
    });

    it("findRsvpByEmail normalizes email and queries prisma", async () => {
      findFirstRsvpMock.mockResolvedValue({ id: "rsvp-1" });
      await findRsvpByEmail("  USER@EXAMPLE.COM ");
      expect(findFirstRsvpMock).toHaveBeenCalledWith({
        where: {
          participant: {
            email: "user@example.com",
          },
        },
        include: { participant: true },
      });
    });

    it("getAllRsvps queries list of rsvps ordered by createdAt desc", async () => {
      findManyRsvpMock.mockResolvedValue([{ id: "rsvp-1" }]);
      const res = await getAllRsvps();
      expect(res).toHaveLength(1);
      expect(findManyRsvpMock).toHaveBeenCalledWith({
        include: { participant: true },
        orderBy: { createdAt: "desc" },
      });
    });
  });
});
