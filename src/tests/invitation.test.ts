import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationError } from "../errors/application-error";

const boundaries = vi.hoisted(() => ({
  requireVerifiedParticipant: vi.fn(),
  findActiveRegistrationByParticipantId: vi.fn(),
}));

vi.mock("../lib/auth", () => ({
  requireVerifiedParticipant: boundaries.requireVerifiedParticipant,
}));
vi.mock("../services/workshop.service", () => ({
  findActiveRegistrationByParticipantId:
    boundaries.findActiveRegistrationByParticipantId,
}));

import { GET } from "../app/api/workshops/invitation/route";
import { invitationUrlForPath } from "../lib/invitation";

const originalCtf = process.env.WORKSHOP_CTF_COMMUNITY_LINK;
const originalBcc = process.env.WORKSHOP_BCC_COMMUNITY_LINK;
const originalCp = process.env.WORKSHOP_CP_COMMUNITY_LINK;

beforeEach(() => {
  process.env.WORKSHOP_CTF_COMMUNITY_LINK = "https://chat.example.test/ctf";
  process.env.WORKSHOP_BCC_COMMUNITY_LINK = "https://chat.example.test/bcc";
  process.env.WORKSHOP_CP_COMMUNITY_LINK = "https://chat.example.test/cp";
  boundaries.requireVerifiedParticipant.mockReset();
  boundaries.findActiveRegistrationByParticipantId.mockReset();
  boundaries.requireVerifiedParticipant.mockResolvedValue({
    id: "participant-1",
  });
});

afterEach(() => {
  if (originalCtf === undefined) delete process.env.WORKSHOP_CTF_COMMUNITY_LINK;
  else process.env.WORKSHOP_CTF_COMMUNITY_LINK = originalCtf;
  if (originalBcc === undefined) delete process.env.WORKSHOP_BCC_COMMUNITY_LINK;
  else process.env.WORKSHOP_BCC_COMMUNITY_LINK = originalBcc;
  if (originalCp === undefined) delete process.env.WORKSHOP_CP_COMMUNITY_LINK;
  else process.env.WORKSHOP_CP_COMMUNITY_LINK = originalCp;
});

describe("protected workshop invitations", () => {
  it("maps an active competition path to its server-only URL", () => {
    expect(invitationUrlForPath("CTF")).toBe("https://chat.example.test/ctf");
  });

  it("returns 401 without exposing a community URL when the session is invalid", async () => {
    boundaries.requireVerifiedParticipant.mockRejectedValue(
      new ApplicationError("UNAUTHORIZED", 401, "Authentication required"),
    );

    const response = await GET(
      new Request("https://app.example.test/api/workshops/invitation"),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(JSON.stringify(body)).not.toContain("chat.example.test");
    expect(
      boundaries.findActiveRegistrationByParticipantId,
    ).not.toHaveBeenCalled();
  });

  it("returns 403 for a verified participant without an active registration", async () => {
    boundaries.findActiveRegistrationByParticipantId.mockResolvedValue(null);

    const response = await GET(
      new Request("https://app.example.test/api/workshops/invitation"),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(JSON.stringify(body)).not.toContain("chat.example.test");
    expect(
      boundaries.findActiveRegistrationByParticipantId,
    ).toHaveBeenCalledWith("participant-1");
  });

  it("redirects only a verified participant with an active stored path", async () => {
    boundaries.findActiveRegistrationByParticipantId.mockResolvedValue({
      competitionPath: "CTF",
    });

    const response = await GET(
      new Request("https://app.example.test/api/workshops/invitation"),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://chat.example.test/ctf",
    );
  });

  it("keeps configuration failures free of the configured URL", async () => {
    boundaries.findActiveRegistrationByParticipantId.mockResolvedValue({
      competitionPath: "CTF",
    });
    delete process.env.WORKSHOP_CTF_COMMUNITY_LINK;

    const response = await GET(
      new Request("https://app.example.test/api/workshops/invitation"),
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("chat.example.test");
  });
});
