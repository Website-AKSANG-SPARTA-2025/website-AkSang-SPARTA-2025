import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getAegisVerificationStatus,
  sendAegisVerification,
} from "../lib/aegis-verification";

const originalBaseUrl = process.env.AEGIS_VERIFICATION_BASE_URL;
const originalApiKey = process.env.AEGIS_VERIFICATION_API_KEY;
const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  process.env.AEGIS_VERIFICATION_BASE_URL = "https://aegis.example.test/";
  process.env.AEGIS_VERIFICATION_API_KEY = "server-secret";
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalBaseUrl === undefined)
    delete process.env.AEGIS_VERIFICATION_BASE_URL;
  else process.env.AEGIS_VERIFICATION_BASE_URL = originalBaseUrl;
  if (originalApiKey === undefined)
    delete process.env.AEGIS_VERIFICATION_API_KEY;
  else process.env.AEGIS_VERIFICATION_API_KEY = originalApiKey;
});

describe("Aegis verification adapter", () => {
  it("posts an email to the configured endpoint with the server-only key", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(201, {
        status: "sent",
        email: "ada@example.com",
        expiresAt: "2026-08-11T01:00:00.000Z",
      }),
    );

    await expect(sendAegisVerification("ada@example.com")).resolves.toEqual({
      status: "sent",
      expiresAt: "2026-08-11T01:00:00.000Z",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://aegis.example.test/api/verification",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "server-secret",
        },
        body: JSON.stringify({ email: "ada@example.com" }),
      },
    );
  });

  it("returns an already-verified Aegis result without leaking its email", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        status: "already_verified",
        email: "ada@example.com",
        verifiedAt: "2026-08-11T01:00:00.000Z",
      }),
    );

    await expect(sendAegisVerification("ada@example.com")).resolves.toEqual({
      status: "already_verified",
      verifiedAt: "2026-08-11T01:00:00.000Z",
    });
  });

  it("encodes the status email in the query and returns an active pending link", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        status: "not_verified",
        email: "ada+event@example.com",
        registeredAt: "2026-08-11T00:00:00.000Z",
        linkActive: true,
        linkExpiresAt: "2026-08-11T01:00:00.000Z",
      }),
    );

    await expect(
      getAegisVerificationStatus("ada+event@example.com"),
    ).resolves.toEqual({
      status: "not_verified",
      registeredAt: "2026-08-11T00:00:00.000Z",
      linkActive: true,
      linkExpiresAt: "2026-08-11T01:00:00.000Z",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://aegis.example.test/api/verification?email=ada%2Bevent%40example.com",
      { headers: { "x-api-key": "server-secret" } },
    );
  });

  it("returns verified and not-registered status responses", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        status: "verified",
        email: "ada@example.com",
        verifiedAt: "2026-08-11T01:00:00.000Z",
      }),
    );
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { status: "not_registered", email: "ada@example.com" }),
    );

    await expect(
      getAegisVerificationStatus("ada@example.com"),
    ).resolves.toEqual({
      status: "verified",
      verifiedAt: "2026-08-11T01:00:00.000Z",
    });
    await expect(
      getAegisVerificationStatus("ada@example.com"),
    ).resolves.toEqual({
      status: "not_registered",
    });
  });

  it("maps documented send errors without flattening their meaning", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(429, {
        status: "error",
        error: "resend_too_soon",
        retryAfter: 41,
      }),
    );
    await expect(
      sendAegisVerification("ada@example.com"),
    ).rejects.toMatchObject({
      code: "RATE_LIMITED",
      status: 429,
      details: { retryAfter: 41 },
    });

    fetchMock.mockResolvedValueOnce(
      jsonResponse(429, { status: "error", error: "too_many_requests" }),
    );
    await expect(
      sendAegisVerification("ada@example.com"),
    ).rejects.toMatchObject({
      code: "RATE_LIMITED",
      status: 429,
    });

    fetchMock.mockResolvedValueOnce(
      jsonResponse(502, { status: "error", error: "email_send_failed" }),
    );
    await expect(
      sendAegisVerification("ada@example.com"),
    ).rejects.toMatchObject({
      code: "EXTERNAL_PROVIDER_ERROR",
      status: 502,
    });

    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, { status: "error", error: "invalid_email" }),
    );
    await expect(
      sendAegisVerification("ada@example.com"),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400,
    });
  });

  it("maps malformed or unreachable upstream responses to a safe service failure", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { status: "verified" }));
    await expect(
      getAegisVerificationStatus("ada@example.com"),
    ).rejects.toMatchObject({
      code: "EXTERNAL_PROVIDER_ERROR",
      status: 502,
    });

    fetchMock.mockRejectedValueOnce(new Error("network unavailable"));
    await expect(
      sendAegisVerification("ada@example.com"),
    ).rejects.toMatchObject({
      code: "EXTERNAL_PROVIDER_ERROR",
      status: 502,
    });
  });
});
