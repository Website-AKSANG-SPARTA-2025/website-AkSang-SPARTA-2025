import type { Participant } from "../generated/prisma/client";
import { getPrisma } from "../lib/prisma";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isUniqueConflict(error: unknown): error is { code: "P2002" } {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function findOrCreateParticipant(input: {
  name: string;
  email: string;
}): Promise<Participant> {
  const email = normalizeEmail(input.email);
  const prisma = getPrisma();

  try {
    return await prisma.participant.create({ data: { name: input.name.trim(), email } });
  } catch (error) {
    if (!isUniqueConflict(error)) throw error;

    const participant = await prisma.participant.findUnique({ where: { email } });
    if (participant) return participant;
    throw error;
  }
}
