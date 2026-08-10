import { ZodError } from "zod";
import { describe, expect, it } from "vitest";

import { ApplicationError } from "../errors/application-error";
import { errorResponse, parseJsonBody, successResponse } from "../lib/api";
import {
  confirmAttendanceSchema,
  createAttendanceSchema,
  createWorkshopEnrollmentSchema,
  registerWorkshopSchema,
  resendVerificationSchema,
  submissionSchema,
} from "../schemas";

describe("BE-02 request schemas", () => {
  it("requires an institution for student attendance and rejects blank public institutions", () => {
    expect(
      createAttendanceSchema.safeParse({
        name: "Ada Lovelace",
        email: "ada@example.com",
        attendeeType: "STUDENT",
      }).success,
    ).toBe(false);
    expect(
      createAttendanceSchema.safeParse({
        name: "Ada Lovelace",
        email: "ada@example.com",
        attendeeType: "PUBLIC",
      }).success,
    ).toBe(true);
    expect(
      createAttendanceSchema.safeParse({
        name: "Ada Lovelace",
        email: "ada@example.com",
        attendeeType: "PUBLIC",
        institution: "   ",
      }).success,
    ).toBe(false);
  });

  it("accepts attendance confirmation data without forged identity", () => {
    expect(confirmAttendanceSchema.safeParse({ attendeeType: "PUBLIC" }).success).toBe(true);
    expect(
      confirmAttendanceSchema.safeParse({ attendeeType: "PUBLIC", participantId: "forged" })
        .success,
    ).toBe(false);
  });

  it("accepts full workshop enrollment identity and contact data", () => {
    const result = createWorkshopEnrollmentSchema.safeParse({
      name: "Grace Hopper",
      email: "grace@example.com",
      competitionPath: "CTF",
      phoneNumber: " +62812345678 ",
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phoneNumber).toBe("+62812345678");
  });

  it.each([
    ["unsupported path", { name: "Grace Hopper", email: "grace@example.com", competitionPath: "WEB", phoneNumber: "+62812345678" }],
    ["missing phone", { name: "Grace Hopper", email: "grace@example.com", competitionPath: "BCC" }],
    ["invalid phone", { name: "Grace Hopper", email: "grace@example.com", competitionPath: "CP", phoneNumber: "0812-345" }],
  ])("rejects workshop enrollment with %s", (_case, payload) => {
    expect(createWorkshopEnrollmentSchema.safeParse(payload).success).toBe(false);
  });

  it("accepts only valid resend identity and purpose", () => {
    expect(
      resendVerificationSchema.safeParse({ email: "ada@example.com", purpose: "ATTENDANCE" })
        .success,
    ).toBe(true);
    expect(
      resendVerificationSchema.safeParse({ email: "invalid", purpose: "OTHER" }).success,
    ).toBe(false);
  });

  it("accepts workshop activation without identity and with optional NIM", () => {
    expect(
      registerWorkshopSchema.safeParse({
        competitionPath: "BCC",
        phoneNumber: "+62812345678",
        nim: "12345678",
      }).success,
    ).toBe(true);
  });

  it.each([
    ["identity fields", { competitionPath: "CTF", phoneNumber: "+62812345678", name: "Ada", email: "ada@example.com" }],
    ["unsupported path", { competitionPath: "WEB", phoneNumber: "+62812345678" }],
    ["missing phone", { competitionPath: "CP" }],
    ["invalid phone", { competitionPath: "CP", phoneNumber: "123" }],
  ])("rejects workshop activation with %s", (_case, payload) => {
    expect(registerWorkshopSchema.safeParse(payload).success).toBe(false);
  });

  it("accepts only an approved submission path", () => {
    expect(submissionSchema.safeParse({ competitionPath: "CP" }).success).toBe(true);
    expect(submissionSchema.safeParse({ competitionPath: "WEB" }).success).toBe(false);
  });
});

describe("BE-02 API response contract", () => {
  it("returns the documented success envelope", async () => {
    const response = successResponse({ id: "participant-1" }, "Created");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      message: "Created",
      data: { id: "participant-1" },
    });
  });

  it("supports the documented 201 status without changing the success envelope", async () => {
    const response = successResponse({ id: "participant-1" }, "Created", {
      status: 201,
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      success: true,
      message: "Created",
      data: { id: "participant-1" },
    });
  });

  it.each([400, 401, 403, 404, 409, 410, 429, 500, 502] as const)(
    "preserves documented ApplicationError status %i",
    async (status) => {
      const response = errorResponse(
        new ApplicationError("KNOWN_ERROR", status, "Safe client message"),
      );

      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({
        success: false,
        message: "Safe client message",
      });
    },
  );

  it("maps Zod errors to a detailed validation response", async () => {
    const validation = createAttendanceSchema.safeParse({
      name: "A",
      email: "invalid",
      attendeeType: "PUBLIC",
    });
    expect(validation.success).toBe(false);
    if (validation.success) return;

    const response = errorResponse(validation.error);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Invalid request payload");
    expect(body.errors.fieldErrors.name).toBeDefined();
    expect(body.errors.fieldErrors.email).toBeDefined();
  });

  it("maps unknown errors to a safe 500 response", async () => {
    const response = errorResponse(new Error("database password leaked"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      success: false,
      message: "Internal server error",
    });
  });
});

describe("BE-02 JSON request parsing", () => {
  it("parses and validates a JSON request body", async () => {
    const request = new Request("http://localhost/api/attendances", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Ada Lovelace",
        email: "ada@example.com",
        attendeeType: "PUBLIC",
      }),
    });

    await expect(parseJsonBody(request, createAttendanceSchema)).resolves.toEqual({
      name: "Ada Lovelace",
      email: "ada@example.com",
      attendeeType: "PUBLIC",
    });
  });

  it("preserves Zod validation errors for the response mapper", async () => {
    const request = new Request("http://localhost/api/attendances", {
      method: "POST",
      body: JSON.stringify({ name: "A", email: "invalid" }),
    });

    await expect(parseJsonBody(request, createAttendanceSchema)).rejects.toBeInstanceOf(ZodError);
  });

  it("maps malformed JSON to a validation ApplicationError", async () => {
    const request = new Request("http://localhost/api/attendances", {
      method: "POST",
      body: "{not-json",
    });

    await expect(parseJsonBody(request, createAttendanceSchema)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400,
      message: "Invalid request payload",
    });
  });
});
