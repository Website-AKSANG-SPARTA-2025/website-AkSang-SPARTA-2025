import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationError } from "../errors/application-error";
import { ZodError } from "zod";

const mocks = vi.hoisted(() => ({
  requireVerifiedParticipant: vi.fn(),
  requireActiveWorkshopRegistration: vi.fn(),
  createSubmission: vi.fn(),
}));

vi.mock("../lib/auth", () => ({ requireVerifiedParticipant: mocks.requireVerifiedParticipant }));
vi.mock("../services/submission.service", () => ({
  createSubmission: mocks.createSubmission,
  requireActiveWorkshopRegistration: mocks.requireActiveWorkshopRegistration,
}));

const { POST } = await import("../app/api/submissions/route");

function requestWithForm(form: FormData): Request {
  return new Request("http://localhost/api/submissions", { method: "POST", body: form });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireVerifiedParticipant.mockResolvedValue({ id: "participant-1" });
  mocks.requireActiveWorkshopRegistration.mockResolvedValue({ id: "registration-1" });
  mocks.createSubmission.mockResolvedValue({
    id: "submission-1",
    competitionPath: "CTF",
    fileName: "solution.pdf",
  });
});

describe("POST /api/submissions", () => {
  it("returns 401 before parsing or uploading when the session is invalid", async () => {
    mocks.requireVerifiedParticipant.mockRejectedValue(
      new ApplicationError("UNAUTHORIZED", 401, "Authentication required"),
    );

    const response = await POST(requestWithForm(new FormData()));
    expect(response.status).toBe(401);
    expect(mocks.createSubmission).not.toHaveBeenCalled();
    expect(mocks.requireActiveWorkshopRegistration).not.toHaveBeenCalled();
  });

  it("returns the documented 201 response for a valid multipart request", async () => {
    const form = new FormData();
    form.set("competitionPath", "CTF");
    form.set("file", new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], "solution.pdf", {
      type: "application/pdf",
    }));

    const response = await POST(requestWithForm(form));
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: "Submission created successfully",
      data: { id: "submission-1", competitionPath: "CTF", fileName: "solution.pdf" },
    });
    expect(mocks.createSubmission).toHaveBeenCalledWith(expect.objectContaining({
      workshopRegistrationId: "registration-1",
      competitionPath: "CTF",
    }));
  });

  it("returns 403 before reading file bytes when no ACTIVE workshop registration exists", async () => {
    mocks.requireActiveWorkshopRegistration.mockRejectedValue(
      new ApplicationError(
        "WORKSHOP_REGISTRATION_REQUIRED",
        403,
        "Participant is not registered for the workshop",
      ),
    );

    const response = await POST(requestWithForm(new FormData()));
    expect(response.status).toBe(403);
    expect(mocks.createSubmission).not.toHaveBeenCalled();
  });

  it("maps an invalid competition path to 400", async () => {
    mocks.createSubmission.mockRejectedValue(
      new ZodError([
        {
          code: "invalid_value",
          values: ["CTF", "BCC", "CP"],
          path: ["competitionPath"],
          message: "Invalid path",
        },
      ]),
    );
    const form = new FormData();
    form.set("competitionPath", "OTHER");
    form.set("file", new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], "solution.pdf", {
      type: "application/pdf",
    }));

    const response = await POST(requestWithForm(form));
    expect(response.status).toBe(400);
  });
});
