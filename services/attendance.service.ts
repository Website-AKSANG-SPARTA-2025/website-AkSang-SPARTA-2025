import type { Attendance, Participant } from "../generated/prisma/client";
import { ApplicationError } from "../errors/application-error";
import { getPrisma } from "../lib/prisma";

import { findOrCreateParticipant } from "./participant.service";

export type AttendanceClassification = {
  attendeeType: "STUDENT" | "PUBLIC";
  institution?: string;
};

function institutionFor(input: AttendanceClassification): string | null {
  return input.institution?.trim() ?? null;
}

function conflict(message: string): ApplicationError {
  return new ApplicationError("CONFLICT", 409, message);
}

export async function createAttendance(
  input: { name: string; email: string } & AttendanceClassification,
): Promise<{ participant: Participant; attendance: Attendance; created: boolean }> {
  const participant = await findOrCreateParticipant(input);
  const prisma = getPrisma();
  const attendance = await prisma.attendance.findUnique({ where: { participantId: participant.id } });

  if (attendance) {
    if (attendance.status === "VERIFIED") throw conflict("Attendance already verified");
    return { participant, attendance, created: false };
  }

  const created = await prisma.attendance.create({
    data: {
      participantId: participant.id,
      status: "PENDING",
      attendeeType: input.attendeeType,
      institution: institutionFor(input),
    },
  });
  return { participant, attendance: created, created: true };
}

export async function confirmAttendanceForVerifiedParticipant(
  participantId: string,
  input: AttendanceClassification,
): Promise<{ attendance: Attendance; created: boolean }> {
  const prisma = getPrisma();
  const attendance = await prisma.attendance.findUnique({ where: { participantId } });
  const institution = institutionFor(input);

  if (!attendance) {
    return {
      attendance: await prisma.attendance.create({
        data: { participantId, status: "VERIFIED", attendeeType: input.attendeeType, institution },
      }),
      created: true,
    };
  }

  if (attendance.status === "VERIFIED") throw conflict("Attendance already verified");
  if (attendance.attendeeType !== input.attendeeType || attendance.institution !== institution) {
    throw conflict("Attendance classification does not match");
  }

  return {
    attendance: await prisma.attendance.update({
      where: { participantId },
      data: { status: "VERIFIED" },
    }),
    created: false,
  };
}
