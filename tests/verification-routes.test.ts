import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationError } from "../errors/application-error";

const boundaries = vi.hoisted(() => ({
  verifyToken: vi.fn(),
  resendVerification: vi.fn(),
  sendVerificationEmail: vi.fn(),
  setParticipantSessionCookie: vi.fn(async (response: Response) => {
    response.headers.set("Set-Cookie", "participant_session=signed; HttpOnly");
    return response;
  }),
}));

vi.mock("../services/verification.service", () => ({
  verifyToken: boundaries.verifyToken,
  resendVerification: boundaries.resendVerification,
}));
vi.mock("../services/notification.service", () => ({
  sendVerificationEmail: boundaries.sendVerificationEmail,
}));
vi.mock("../lib/session", () => ({
  setParticipantSessionCookie: boundaries.setParticipantSessionCookie,
}));

import { POST as resendRoute } from "../app/api/verifications/resend/route";
import { GET as verifyRoute } from "../app/api/verifications/verify/route";

function resendRequest(body: unknown): Request {
  return new Request("https://app.example.test/api/verifications/resend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  boundaries.verifyToken.mockReset();
  boundaries.resendVerification.mockReset();
  boundaries.sendVerificationEmail.mockReset();
  boundaries.setParticipantSessionCookie.mockClear();
});

describe("verification routes", () => {
  it("redirects verified ATTENDANCE to the event and sets the session cookie", async () => {
    boundaries.verifyToken.mockResolvedValue({ participantId: "participant-1", purpose: "ATTENDANCE" });

    const response = await verifyRoute(
      new Request("https://app.example.test/api/verifications/verify?token=valid-token"),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://app.example.test/event?verified=true");
    expect(response.headers.get("set-cookie")).toContain("participant_session=");
    expect(boundaries.setParticipantSessionCookie).toHaveBeenCalledWith(expect.any(Response), "participant-1");
  });

  it("redirects WORKSHOP verification without changing its purpose", async () => {
    boundaries.verifyToken.mockResolvedValue({ participantId: "participant-1", purpose: "WORKSHOP" });

    const response = await verifyRoute(
      new Request("https://app.example.test/api/verifications/verify?token=workshop-token"),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://app.example.test/workshop?verified=true");
  });

  it("maps missing, invalid, and expired verification links without setting a session", async () => {
    const missing = await verifyRoute(new Request("https://app.example.test/api/verifications/verify"));
    expect(missing.status).toBe(400);
    expect(boundaries.verifyToken).not.toHaveBeenCalled();

    boundaries.verifyToken.mockRejectedValue(
      new ApplicationError("VERIFICATION_EXPIRED", 410, "Verification link has expired"),
    );
    const expired = await verifyRoute(
      new Request("https://app.example.test/api/verifications/verify?token=expired"),
    );
    expect(expired.status).toBe(410);
    expect(boundaries.setParticipantSessionCookie).not.toHaveBeenCalled();
  });

  it("resends through email after eligibility and never returns the raw URL", async () => {
    boundaries.resendVerification.mockResolvedValue({
      participantId: "participant-1",
      participantName: "Ada Lovelace",
      email: "ada@example.com",
      purpose: "ATTENDANCE",
      verificationUrl: "https://app.example.test/api/verifications/verify?token=secret-token",
    });

    const response = await resendRoute(resendRequest({ email: "ada@example.com", purpose: "ATTENDANCE" }));
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body).toEqual({
      success: true,
      message: "A new verification link has been sent",
      data: {},
    });
    expect(JSON.stringify(body)).not.toContain("secret-token");
    expect(boundaries.sendVerificationEmail).toHaveBeenCalledWith({
      to: "ada@example.com",
      participantName: "Ada Lovelace",
      purpose: "ATTENDANCE",
      verificationUrl: "https://app.example.test/api/verifications/verify?token=secret-token",
    });
  });

  it("maps safe provider failures after resend state is created", async () => {
    boundaries.resendVerification.mockResolvedValue({
      participantId: "participant-1",
      participantName: "Ada Lovelace",
      email: "ada@example.com",
      purpose: "ATTENDANCE",
      verificationUrl: "https://app.example.test/api/verifications/verify?token=secret-token",
    });
    boundaries.sendVerificationEmail.mockRejectedValue(
      new ApplicationError("EXTERNAL_PROVIDER_ERROR", 502, "Unable to send verification email"),
    );

    const response = await resendRoute(resendRequest({ email: "ada@example.com", purpose: "ATTENDANCE" }));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(JSON.stringify(body)).not.toContain("secret-token");
  });
});
