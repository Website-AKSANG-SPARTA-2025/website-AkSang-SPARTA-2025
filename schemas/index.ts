import { z } from "zod";

const competitionPathSchema = z.enum(["CTF", "BCC", "CP"]);
const phoneNumberSchema = z.string().trim().regex(/^\+?[0-9]{8,20}$/);
const hasStudentInstitution = (data: { attendeeType?: string; institution?: string }) =>
  data.attendeeType !== "STUDENT" || Boolean(data.institution);

export const createAttendanceSchema = z
  .object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    attendeeType: z.enum(["STUDENT", "PUBLIC"]),
    institution: z.string().trim().min(1).optional(),
  })
  .strict()
  .refine(hasStudentInstitution, { message: "Institution is required for students" });

export const confirmAttendanceSchema = z
  .object({
    attendeeType: z.enum(["STUDENT", "PUBLIC"]),
    institution: z.string().trim().min(1).optional(),
  })
  .strict()
  .refine(hasStudentInstitution, { message: "Institution is required for students" });

export const createWorkshopEnrollmentSchema = z
  .object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    competitionPath: competitionPathSchema,
    phoneNumber: phoneNumberSchema,
    nim: z.string().min(1).optional(),
  })
  .strict();

export const resendVerificationSchema = z
  .object({
    email: z.string().email(),
    purpose: z.enum(["ATTENDANCE", "WORKSHOP"]),
  })
  .strict();

export const developmentSessionSchema = z
  .object({
    email: z.string().email(),
    secret: z.string().min(1),
  })
  .strict();

export const registerWorkshopSchema = z
  .object({
    competitionPath: competitionPathSchema,
    phoneNumber: phoneNumberSchema,
    nim: z.string().min(1).optional(),
  })
  .strict();

export const submissionSchema = z.object({
  competitionPath: competitionPathSchema,
});
