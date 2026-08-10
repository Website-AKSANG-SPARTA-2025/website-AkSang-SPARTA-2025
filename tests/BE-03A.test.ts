import { afterEach, describe, expect, it } from "vitest";

import { prisma } from "../lib/prisma";
import { enrollWorkshop } from "../app/api/workshops/enroll/route"; 

// Tracks emails created during each test so they can be cleaned up afterward.
// Deleting the Participant cascades to WorkshopRegistration automatically
// (per the onDelete: Cascade in schema.prisma).
let createdEmails: string[] = [];

afterEach(async () => {
  if (createdEmails.length > 0) {
    await prisma.participant.deleteMany({
      where: { email: { in: createdEmails } },
    });
    createdEmails = [];
  }
});

function uniqueEmail(label: string) {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  createdEmails.push(email);
  return email;
}

describe("enrollWorkshop - participant + registration creation", () => {
  it("creates exactly one Participant and one PENDING WorkshopRegistration with selected path, phone, and NIM", async () => {
    const email = uniqueEmail("new-enroll");

    const response = await enrollWorkshop({
      name: "Grace Hopper",
      email,
      competitionPath: "CTF",
      phoneNumber: "+62812345678",
      nim: "12345678",
    });

    expect(response.status).toBe(202);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.competitionPath).toBe("CTF");
    expect(body.data.phoneNumber).toBe("+62812345678");
    expect(body.data.nim).toBe("12345678");
    expect(body.data.status).toBe("PENDING");

    // Confirm exactly one Participant and one WorkshopRegistration exist, and no Rsvp was created
    const participant = await prisma.participant.findUnique({
      where: { email },
      include: { workshopRegistration: true, rsvp: true },
    });

    expect(participant).not.toBeNull();
    expect(participant?.workshopRegistration).not.toBeNull();
    expect(participant?.rsvp).toBeNull(); // no Rsvp should ever be created here

    const registrationCount = await prisma.workshopRegistration.count({
      where: { participantId: participant!.id },
    });
    expect(registrationCount).toBe(1);
  });

  it("reuses the same Participant when the same email is submitted with different casing", async () => {
    const baseEmail = uniqueEmail("casing-test");
    const upperCaseEmail = baseEmail.toUpperCase();

    const firstResponse = await enrollWorkshop({
      name: "Ada Lovelace",
      email: baseEmail,
      competitionPath: "BCC",
      phoneNumber: "+62812345001",
    });
    expect(firstResponse.status).toBe(202);
    const firstBody = await firstResponse.json();
    const firstParticipantId = firstBody.data.participantId;

    // Second call uses different casing on the same email — should reuse the
    // same Participant, and since a PENDING registration already exists,
    // should hit the 200 reuse path rather than creating a duplicate.
    const secondResponse = await enrollWorkshop({
      name: "Ada Lovelace",
      email: upperCaseEmail,
      competitionPath: "CP", // deliberately different, to confirm it's ignored
      phoneNumber: "+62899999999", // deliberately different, to confirm it's ignored
    });
    expect(secondResponse.status).toBe(200);
    const secondBody = await secondResponse.json();
    expect(secondBody.data.participantId).toBe(firstParticipantId);

    // Only one Participant should exist for this normalized email
    const participants = await prisma.participant.findMany({
      where: { email: baseEmail.toLowerCase() },
    });
    expect(participants.length).toBe(1);
  });
});

describe("enrollWorkshop - repeated pending enrollment", () => {
  it("does not overwrite saved path, phone number, or NIM on a repeated pending enrollment", async () => {
    const email = uniqueEmail("repeat-pending");

    const firstResponse = await enrollWorkshop({
      name: "Grace Hopper",
      email,
      competitionPath: "CTF",
      phoneNumber: "+62811111111",
      nim: "11111111",
    });
    expect(firstResponse.status).toBe(202);

    // Second attempt with different values — should be silently ignored,
    // original values must remain untouched
    const secondResponse = await enrollWorkshop({
      name: "Grace Hopper",
      email,
      competitionPath: "BCC",
      phoneNumber: "+62899999999",
      nim: "99999999",
    });

    expect(secondResponse.status).toBe(200);
    const secondBody = await secondResponse.json();
    expect(secondBody.data.competitionPath).toBe("CTF"); // unchanged
    expect(secondBody.data.phoneNumber).toBe("+62811111111"); // unchanged
    expect(secondBody.data.nim).toBe("11111111"); // unchanged
    expect(secondBody.data.status).toBe("PENDING");

    // Confirm only one WorkshopRegistration row exists — no duplicate created
    const participant = await prisma.participant.findUnique({ where: { email } });
    const registrationCount = await prisma.workshopRegistration.count({
      where: { participantId: participant!.id },
    });
    expect(registrationCount).toBe(1);
  });

  it("returns 409 when the existing WorkshopRegistration is ACTIVE", async () => {
    const email = uniqueEmail("active-conflict");

    const firstResponse = await enrollWorkshop({
      name: "Katherine Johnson",
      email,
      competitionPath: "CP",
      phoneNumber: "+62822222222",
    });
    expect(firstResponse.status).toBe(202);

    // Manually promote to ACTIVE to simulate a completed verification,
    // since that flow (BE-04) isn't implemented yet
    const participant = await prisma.participant.findUnique({ where: { email } });
    await prisma.workshopRegistration.update({
      where: { participantId: participant!.id },
      data: { status: "ACTIVE" },
    });

    const secondResponse = await enrollWorkshop({
      name: "Katherine Johnson",
      email,
      competitionPath: "CP",
      phoneNumber: "+62822222222",
    });

    expect(secondResponse.status).toBe(409);
    const secondBody = await secondResponse.json();
    expect(secondBody.success).toBe(false);

    // Confirm still only one registration row, and it's still ACTIVE (untouched)
    const registrations = await prisma.workshopRegistration.findMany({
      where: { participantId: participant!.id },
    });
    expect(registrations.length).toBe(1);
    expect(registrations[0].status).toBe("ACTIVE");
  });
});