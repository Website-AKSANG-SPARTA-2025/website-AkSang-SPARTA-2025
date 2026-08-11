import { beforeEach, describe, expect, it, vi } from "vitest";

const boundaries = vi.hoisted(() => ({
  getPrisma: vi.fn(),
  uploadPdf: vi.fn(),
  deleteObject: vi.fn(),
}));

vi.mock("../lib/prisma", () => ({ getPrisma: boundaries.getPrisma }));
vi.mock("../lib/r2", () => ({
  uploadPdf: boundaries.uploadPdf,
  deleteObject: boundaries.deleteObject,
}));

import { createSubmission } from "../services/submission.service";

const pdf = new TextEncoder().encode("%PDF-1.7\nbody");
let create: ReturnType<typeof vi.fn>;

function file(): File {
  return new File([pdf], "solution.pdf", { type: "application/pdf" });
}

beforeEach(() => {
  create = vi.fn();
  boundaries.getPrisma.mockReturnValue({ submission: { create } });
  boundaries.uploadPdf.mockReset();
  boundaries.deleteObject.mockReset();
  boundaries.uploadPdf.mockResolvedValue({
    storageKey: "submissions/server-generated.pdf",
    fileName: "solution.pdf",
    contentType: "application/pdf",
    size: pdf.byteLength,
  });
});

describe("submission service", () => {
  it("uploads then persists only the approved submission metadata", async () => {
    create.mockResolvedValue({
      id: "submission-1",
      competitionPath: "CTF",
      fileName: "solution.pdf",
    });

    const result = await createSubmission({
      workshopRegistrationId: "registration-1",
      competitionPath: "CTF",
      file: file(),
    });

    expect(result).toMatchObject({
      id: "submission-1",
      competitionPath: "CTF",
      fileName: "solution.pdf",
    });
    expect(boundaries.uploadPdf).toHaveBeenCalledWith({
      bytes: pdf,
      originalFileName: "solution.pdf",
      contentType: "application/pdf",
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        workshopRegistrationId: "registration-1",
        competitionPath: "CTF",
        fileName: "solution.pdf",
        storageKey: "submissions/server-generated.pdf",
        contentType: "application/pdf",
        size: pdf.byteLength,
      },
    });
  });

  it("deletes the uploaded key exactly once when metadata persistence fails", async () => {
    create.mockRejectedValue(new Error("database unavailable"));

    await expect(
      createSubmission({
        workshopRegistrationId: "registration-1",
        competitionPath: "CTF",
        file: file(),
      }),
    ).rejects.toThrow("database unavailable");

    expect(boundaries.deleteObject).toHaveBeenCalledTimes(1);
    expect(boundaries.deleteObject).toHaveBeenCalledWith(
      "submissions/server-generated.pdf",
    );
  });

  it("keeps the persistence error when orphan cleanup also fails", async () => {
    create.mockRejectedValue(new Error("database unavailable"));
    boundaries.deleteObject.mockRejectedValue(
      new TypeError("cleanup unavailable"),
    );
    const errorLog = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    await expect(
      createSubmission({
        workshopRegistrationId: "registration-1",
        competitionPath: "CTF",
        file: file(),
      }),
    ).rejects.toThrow("database unavailable");

    expect(errorLog).toHaveBeenCalledWith(
      "Submission persistence cleanup failed",
      {
        persistenceError: "Error",
        cleanupError: "TypeError",
      },
    );
    errorLog.mockRestore();
  });
});
