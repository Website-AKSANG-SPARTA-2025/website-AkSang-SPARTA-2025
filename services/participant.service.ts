import type { Participant } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

/**
 * Creates or reuses the single Participant identity for a public entry flow.
 *
 * OWNED BY BE-03A (Ferdinand Valentino Darmawan): this file is implemented
 * here to unblock BE-03B integration on the shared BE-03 branch and MUST be
 * reviewed/signed off by BE-03A and the Backend Lead before the BE-03 PR.
 *
 * Semantics (task S1-BE-03 rules 1-4):
 * - name is trimmed; email is trimmed + lowercased before lookup/persist;
 * - an existing normalized email reuses the same Participant row;
 * - uniqueness relies on the database unique constraint; a concurrent
 *   P2002 race falls back to reading the winning row.
 */
export async function findOrCreateParticipant(input: {
  name: string;
  email: string;
}): Promise<Participant> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();

  const existing = await prisma.participant.findUnique({ where: { email } });
  if (existing) {
    return existing;
  }

  try {
    return await prisma.participant.create({
      data: { name, email },
    });
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      const winner = await prisma.participant.findUnique({ where: { email } });
      if (winner) {
        return winner;
      }
    }
    throw error;
  }
}
