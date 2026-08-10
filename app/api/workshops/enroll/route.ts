import { Participant, Prisma, WorkshopRegistration } from "@/generated/prisma/client";
import { ApplicationError } from "@/errors/application-error";
import { errorResponse, parseJsonBody, successResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { createWorkshopEnrollmentSchema } from "@/schemas";
import { dispatchVerificationLink } from "@/services/verification-dispatch";

export async function enrollWorkshop(input: {
  name: string;
  email: string;
  competitionPath: "CTF" | "BCC" | "CP";
  phoneNumber: string;
  nim?: string;
}) {
  let participant: Participant | null = null;
  input.email = input.email.trim().toLowerCase();
  try {
    participant = await prisma.participant.create({
      data: {
        name: input.name,
        email: input.email,
        emailVerifiedAt: null,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      participant = await prisma.participant.findUnique({
        where: { email: input.email },
      });
    } else {
      throw error;
    }
  }

  if (!participant) {
    throw new Error("Failed to create or find participant");
  }

  let registration: WorkshopRegistration | null = null;

  try {
    registration = await prisma.workshopRegistration.create({
      data: {
        participantId: participant.id,
        competitionPath: input.competitionPath,
        phoneNumber: input.phoneNumber,
        nim: input.nim || null,
      },
    });
    // BE-04/BE-05 wire the real purpose-bound verification dispatch here.
    await dispatchVerificationLink({ participantId: participant.id, purpose: "WORKSHOP" });
    return successResponse(registration, "Workshop registration created successfully", {
      status: 202,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      registration = await prisma.workshopRegistration.findUnique({
        where: { participantId: participant.id },
      });
    } else {
      throw error;
    }

    if (!registration) {
      throw new Error("Failed to create or find workshop registration");
    }
    if (registration.status === "PENDING") {
      return successResponse(
        registration,
        "Workshop registration already exists and is pending",
        { status: 200 },
      );
    }
    return errorResponse(
      new ApplicationError(
        "WORKSHOP_REGISTRATION_EXISTS",
        409,
        "Workshop registration already exists and is active",
      ),
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await parseJsonBody(request, createWorkshopEnrollmentSchema);
    return await enrollWorkshop(payload);
  } catch (error) {
    return errorResponse(error);
  }
}
