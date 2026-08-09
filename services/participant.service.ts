import { prisma } from "../lib/prisma";
import type { Participant } from "../generated/prisma/client";

export async function findOrCreateParticipant(input: {
  name: string;
  email: string;
}): Promise<Participant> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const trimmedName = input.name.trim();

  const existing = await prisma.participant.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    return existing;
  }

  try {
    return await prisma.participant.create({
      data: {
        name: trimmedName,
        email: normalizedEmail,
        emailVerifiedAt: null,
      },
    });
  } catch (error: any) {
    // Handle potential unique constraint race condition (P2002)
    if (error?.code === "P2002") {
      const retryExisting = await prisma.participant.findUnique({
        where: { email: normalizedEmail },
      });
      if (retryExisting) {
        return retryExisting;
      }
    }
    throw error;
  }
}

export async function findParticipantByEmail(email: string): Promise<Participant | null> {
  const normalizedEmail = email.trim().toLowerCase();
  return prisma.participant.findUnique({
    where: { email: normalizedEmail },
  });
}

export async function findParticipantById(id: string): Promise<Participant | null> {
  return prisma.participant.findUnique({
    where: { id },
  });
}
