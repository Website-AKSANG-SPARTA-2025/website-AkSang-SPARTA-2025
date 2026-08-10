import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { ApplicationError } from "../errors/application-error";

const mocks = vi.hoisted(() => ({
  findActiveRegistration: vi.fn(),
  validatePdf: vi.fn(),
  uploadPdf: vi.fn(),
  deleteObject: vi.fn(),
  createSubmission: vi.fn(),
}));

vi.mock("../services/workshop.service", () => ({
  findActiveRegistrationByParticipantId: mocks.findActiveRegistration,
}));
vi.mock("../lib/r2", () => ({
  validatePdf: mocks.validatePdf,
  uploadPdf: mocks.uploadPdf,
  deleteObject: mocks.deleteObject,
}));
vi.mock("../lib/prisma", () => ({
  prisma: { submission: { create: mocks.createSubmission } },
}));

const { createSubmission, requireActiveWorkshopRegistration } = await import("../services/submission.service");

const validInput = {
  workshopRegistrationId: "registration-1",
  competitionPath: "CTF",
  file: {
    bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]),
    originalFileName: "solution.pdf",
    contentType: "application/pdf",
  },
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.findActiveRegistration.mockResolvedValue({ id: "registration-1" });
  mocks.uploadPdf.mockResolvedValue({
    storageKey: "submissions/object.pdf",
    fileName: "solution.pdf",
    contentType: "application/pdf",
    size: 5,
  });
  mocks.createSubmission.mockResolvedValue({
    id: "submission-1",
    competitionPath: "CTF",
    fileName: "solution.pdf",
  });
});

describe("createSubmission", () => {
  it("rejects a participant without an ACTIVE workshop registration before file work", async () => {
    mocks.findActiveRegistration.mockResolvedValue(null);

    await expect(requireActiveWorkshopRegistration("participant-1")).rejects.toMatchObject({ status: 403 });
    expect(mocks.validatePdf).not.toHaveBeenCalled();
    expect(mocks.uploadPdf).not.toHaveBeenCalled();
  });

  it("rejects an invalid competition path without uploading", async () => {
    await expect(createSubmission({ ...validInput, competitionPath: "OTHER" })).rejects.toBeInstanceOf(
      ZodError,
    );
    expect(mocks.uploadPdf).not.toHaveBeenCalled();
  });

  it("maps invalid PDF validation to the frozen client-safe message", async () => {
    mocks.validatePdf.mockImplementation(() => {
      throw new ApplicationError("VALIDATION_ERROR", 400, "invalid");
    });

    await expect(createSubmission(validInput)).rejects.toMatchObject({
      status: 400,
      message: "Only PDF files are allowed",
    });
    expect(mocks.createSubmission).not.toHaveBeenCalled();
  });

  it("uploads once and persists only the required Submission metadata", async () => {
    await expect(createSubmission(validInput)).resolves.toMatchObject({ id: "submission-1" });

    expect(mocks.uploadPdf).toHaveBeenCalledTimes(1);
    expect(mocks.createSubmission).toHaveBeenCalledWith({
      data: {
        workshopRegistrationId: "registration-1",
        competitionPath: "CTF",
        fileName: "solution.pdf",
        storageKey: "submissions/object.pdf",
        contentType: "application/pdf",
        size: 5,
      },
    });
  });

  it("deletes the uploaded object exactly once if the database insert fails", async () => {
    mocks.createSubmission.mockRejectedValue(new Error("database unavailable"));

    await expect(createSubmission(validInput)).rejects.toThrow("database unavailable");
    expect(mocks.deleteObject).toHaveBeenCalledTimes(1);
    expect(mocks.deleteObject).toHaveBeenCalledWith("submissions/object.pdf");
  });
});
