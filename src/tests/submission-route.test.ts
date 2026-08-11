import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationError } from "../errors/application-error";

const boundaries = vi.hoisted(() => ({
  requireVerifiedParticipant: vi.fn(),
  findActiveRegistrationByParticipantId: vi.fn(),
  validatePdf: vi.fn(),
  createSubmission: vi.fn(),
}));

vi.mock("../lib/auth", () => ({
  requireVerifiedParticipant: boundaries.requireVerifiedParticipant,
}));
vi.mock("../lib/r2", () => ({ validatePdf: boundaries.validatePdf }));
vi.mock("../services/submission.service", () => ({
  createSubmission: boundaries.createSubmission,
}));
vi.mock("../services/workshop.service", () => ({
  findActiveRegistrationByParticipantId:
    boundaries.findActiveRegistrationByParticipantId,
}));

import { POST } from "../app/api/submissions/route";

const pdf = new TextEncoder().encode("%PDF-1.7\nbody");

function submissionRequest(
  options: {
    competitionPath?: string;
    file?: File;
    extra?: Record<string, string>;
  } = {},
): Request {
  const form = new FormData();
  form.set("competitionPath", options.competitionPath ?? "CTF");
  form.set(
    "file",
    options.file ??
      new File([pdf], "solution.pdf", { type: "application/pdf" }),
  );
  for (const [key, value] of Object.entries(options.extra ?? {}))
    form.set(key, value);

  return new Request("https://app.example.test/api/submissions", {
    method: "POST",
    body: form,
  });
}

function guardedRequest(): {
  request: Request;
  formData: ReturnType<typeof vi.fn>;
} {
  const formData = vi.fn();
  return { request: { formData } as unknown as Request, formData };
}

beforeEach(() => {
  boundaries.requireVerifiedParticipant.mockReset();
  boundaries.findActiveRegistrationByParticipantId.mockReset();
  boundaries.validatePdf.mockReset();
  boundaries.createSubmission.mockReset();
  boundaries.requireVerifiedParticipant.mockResolvedValue({
    id: "participant-1",
  });
  boundaries.findActiveRegistrationByParticipantId.mockResolvedValue({
    id: "registration-1",
    participantId: "participant-1",
    competitionPath: "BCC",
    status: "ACTIVE",
  });
});

describe("submission route", () => {
  it("requires a verified session before parsing multipart data", async () => {
    boundaries.requireVerifiedParticipant.mockRejectedValue(
      new ApplicationError("UNAUTHORIZED", 401, "Authentication required"),
    );
    const { request, formData } = guardedRequest();

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(formData).not.toHaveBeenCalled();
    expect(
      boundaries.findActiveRegistrationByParticipantId,
    ).not.toHaveBeenCalled();
    expect(boundaries.createSubmission).not.toHaveBeenCalled();
  });

  it("stops unregistered verified participants before parsing or upload", async () => {
    boundaries.findActiveRegistrationByParticipantId.mockResolvedValue(null);
    const { request, formData } = guardedRequest();

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      success: false,
      message: "Participant is not registered for the workshop",
    });
    expect(formData).not.toHaveBeenCalled();
    expect(boundaries.validatePdf).not.toHaveBeenCalled();
    expect(boundaries.createSubmission).not.toHaveBeenCalled();
  });

  it("rejects invalid paths and client-supplied identity fields before upload", async () => {
    const invalidPath = await POST(
      submissionRequest({ competitionPath: "OTHER" }),
    );
    const forgedIdentity = await POST(
      submissionRequest({ extra: { email: "forged@example.test" } }),
    );

    expect(invalidPath.status).toBe(400);
    expect(forgedIdentity.status).toBe(400);
    expect(boundaries.validatePdf).not.toHaveBeenCalled();
    expect(boundaries.createSubmission).not.toHaveBeenCalled();
  });

  it("rejects an invalid PDF before it reaches the submission service", async () => {
    boundaries.validatePdf.mockImplementation(() => {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        400,
        "Only PDF files are allowed",
      );
    });

    const response = await POST(
      submissionRequest({
        file: new File(["not a PDF"], "fake.pdf", { type: "application/pdf" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      success: false,
      message: "Only PDF files are allowed",
    });
    expect(boundaries.validatePdf).toHaveBeenCalledWith({
      bytes: expect.any(Uint8Array),
      originalFileName: "fake.pdf",
      contentType: "application/pdf",
    });
    expect(boundaries.createSubmission).not.toHaveBeenCalled();
  });

  it("creates a submission with only the trusted active registration", async () => {
    boundaries.createSubmission.mockResolvedValue({
      id: "submission-1",
      competitionPath: "CTF",
      fileName: "solution.pdf",
    });

    const response = await POST(submissionRequest());
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({
      success: true,
      message: "Submission created successfully",
      data: {
        id: "submission-1",
        competitionPath: "CTF",
        fileName: "solution.pdf",
      },
    });
    expect(
      boundaries.findActiveRegistrationByParticipantId,
    ).toHaveBeenCalledWith("participant-1");
    expect(boundaries.createSubmission).toHaveBeenCalledWith({
      workshopRegistrationId: "registration-1",
      competitionPath: "CTF",
      file: expect.any(File),
    });
  });

  it("returns a safe error when persistence fails after upload cleanup", async () => {
    boundaries.createSubmission.mockRejectedValue(
      new Error("database unavailable"),
    );

    const response = await POST(submissionRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ success: false, message: "Internal server error" });
    expect(JSON.stringify(body)).not.toContain("database unavailable");
  });
});
