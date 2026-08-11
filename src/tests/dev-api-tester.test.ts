import { describe, expect, it } from "vitest";

import {
  isDevelopmentApiTester,
  readApiResult,
  retryAfterFrom,
} from "../lib/dev-api-tester";

describe("development API tester helpers", () => {
  it("is available only in development", () => {
    expect(isDevelopmentApiTester("development")).toBe(true);
    expect(isDevelopmentApiTester("production")).toBe(false);
    expect(isDevelopmentApiTester(undefined)).toBe(false);
  });

  it("reads JSON errors and preserves retryAfter", async () => {
    const result = await readApiResult(
      new Response(
        JSON.stringify({ success: false, errors: { retryAfter: 41 } }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      ),
    );

    expect(result).toEqual({
      status: 429,
      ok: false,
      body: { success: false, errors: { retryAfter: 41 } },
    });
    expect(retryAfterFrom(result.body)).toBe(41);
  });

  it("reads plain text and rejects invalid cooldowns", async () => {
    const result = await readApiResult(
      new Response("Unavailable", { status: 502 }),
    );

    expect(result).toEqual({ status: 502, ok: false, body: "Unavailable" });
    expect(retryAfterFrom({ errors: { retryAfter: -1 } })).toBeNull();
  });
});
