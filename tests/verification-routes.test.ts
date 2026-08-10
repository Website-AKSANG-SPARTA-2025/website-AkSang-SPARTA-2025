import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationError } from "../errors/application-error";

const boundaries = vi.hoisted(() => ({
  getVerificationStatus: vi.fn(),
  requireParticipant: vi.fn(),
  resendVerification: vi.fn(),
}));

vi.mock("../services/verification.service", () => ({
  getVerificationStatus: boundaries.getVerificationStatus,
  resendVerification: boundaries.resendVerification,
}));
vi.mock("../lib/auth", () => ({ requireParticipant: boundaries.requireParticipant }));

import { POST as resendRoute } from "../app/api/verifications/resend/route";
import { GET as statusRoute } from "../app/api/verifications/status/route";

function resendRequest(body: unknown): Request {
  return new Request("https://app.example.test/api/verifications/resend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  boundaries.getVerificationStatus.mockReset();
  boundaries.requireParticipant.mockReset();
  boundaries.resendVerification.mockReset();
  boundaries.requireParticipant.mockResolvedValue({
    id: "participant-1",
    email: "ada@example.com",
    emailVerifiedAt: null,
  });
});

describe("Aegis verification routes", () => {
  it("resends through Aegis and never exposes an email link or token", async () => {
    boundaries.resendVerification.mockResolvedValue({
      status: "sent",
      expiresAt: "2026-08-11T01:00:00.000Z",
    });

    const response = await resendRoute(resendRequest({ email: "ada@example.com", purpose: "ATTENDANCE" }));
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body).toEqual({
      success: true,
      message: "A new verification email has been sent",
      data: { status: "sent", expiresAt: "2026-08-11T01:00:00.000Z" },
    });
    expect(JSON.stringify(body)).not.toMatch(/token|https?:/i);
    expect(boundaries.resendVerification).toHaveBeenCalledWith({
      email: "ada@example.com",
      purpose: "ATTENDANCE",
    });
  });

  it("returns verified when Aegis resend reports an already verified email", async () => {
    boundaries.resendVerification.mockResolvedValue({
      status: "already_verified",
      verifiedAt: "2026-08-11T01:00:00.000Z",
    });

    const response = await resendRoute(resendRequest({ email: "ada@example.com", purpose: "ATTENDANCE" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      message: "Email is already verified",
      data: {
        verified: true,
        status: "verified",
        verifiedAt: "2026-08-11T01:00:00.000Z",
      },
    });
  });

  it("preserves resend cooldown and upstream error details", async () => {
    boundaries.resendVerification.mockRejectedValueOnce(
      new ApplicationError("RATE_LIMITED", 429, "Please wait", { retryAfter: 41 }),
    );
    const cooldown = await resendRoute(resendRequest({ email: "ada@example.com", purpose: "ATTENDANCE" }));
    expect(cooldown.status).toBe(429);
    expect(await cooldown.json()).toEqual({
      success: false,
      message: "Please wait",
      errors: { retryAfter: 41 },
    });

    boundaries.resendVerification.mockRejectedValueOnce(
      new ApplicationError("RATE_LIMITED", 429, "Too many verification requests"),
    );
    const tooMany = await resendRoute(resendRequest({ email: "ada@example.com", purpose: "ATTENDANCE" }));
    expect(tooMany.status).toBe(429);

    boundaries.resendVerification.mockRejectedValueOnce(
      new ApplicationError("EXTERNAL_PROVIDER_ERROR", 502, "Verification email could not be sent"),
    );
    const unavailable = await resendRoute(resendRequest({ email: "ada@example.com", purpose: "ATTENDANCE" }));
    expect(unavailable.status).toBe(502);
  });

  it("checks status for the signed-session participant instead of an arbitrary query email", async () => {
    boundaries.getVerificationStatus.mockResolvedValue({
      verified: false,
      status: "not_verified",
      registeredAt: "2026-08-11T00:00:00.000Z",
      linkActive: false,
    });

    const response = await statusRoute(
      new Request("https://app.example.test/api/verifications/status?email=other@example.com"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: {
        verified: false,
        status: "not_verified",
        registeredAt: "2026-08-11T00:00:00.000Z",
        linkActive: false,
      },
    });
    expect(boundaries.getVerificationStatus).toHaveBeenCalledWith({
      id: "participant-1",
      email: "ada@example.com",
      emailVerifiedAt: null,
    });
  });

  it("returns status variants and rejects callers without a valid session", async () => {
    boundaries.getVerificationStatus.mockResolvedValueOnce({
      verified: true,
      status: "verified",
      verifiedAt: "2026-08-11T01:00:00.000Z",
    });
    const verified = await statusRoute(new Request("https://app.example.test/api/verifications/status"));
    expect(verified.status).toBe(200);
    expect(await verified.json()).toMatchObject({ data: { verified: true, status: "verified" } });

    boundaries.getVerificationStatus.mockResolvedValueOnce({
      verified: false,
      status: "not_registered",
    });
    const unknown = await statusRoute(new Request("https://app.example.test/api/verifications/status"));
    expect(unknown.status).toBe(200);
    expect(await unknown.json()).toMatchObject({ data: { status: "not_registered" } });

    boundaries.requireParticipant.mockRejectedValueOnce(
      new ApplicationError("UNAUTHORIZED", 401, "Authentication required"),
    );
    const unauthorized = await statusRoute(new Request("https://app.example.test/api/verifications/status"));
    expect(unauthorized.status).toBe(401);
  });
});
