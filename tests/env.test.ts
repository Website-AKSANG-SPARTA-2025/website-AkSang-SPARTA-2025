import { afterEach, describe, expect, it } from "vitest";

import { positiveIntegerEnv, requiredEnv } from "../lib/env";

const originalMissingValue = process.env.MISSING_VALUE;
const originalTtl = process.env.TEST_TTL;

afterEach(() => {
  if (originalMissingValue === undefined) delete process.env.MISSING_VALUE;
  else process.env.MISSING_VALUE = originalMissingValue;

  if (originalTtl === undefined) delete process.env.TEST_TTL;
  else process.env.TEST_TTL = originalTtl;
});

describe("environment helpers", () => {
  it("rejects a missing required value", () => {
    delete process.env.MISSING_VALUE;

    expect(() => requiredEnv("MISSING_VALUE")).toThrow("MISSING_VALUE is required");
  });

  it("uses a fallback or valid positive integer", () => {
    delete process.env.TEST_TTL;
    expect(positiveIntegerEnv("TEST_TTL", 15)).toBe(15);

    process.env.TEST_TTL = "60";
    expect(positiveIntegerEnv("TEST_TTL", 15)).toBe(60);
  });

  it("rejects a non-positive integer", () => {
    process.env.TEST_TTL = "0";

    expect(() => positiveIntegerEnv("TEST_TTL", 15)).toThrow(
      "TEST_TTL must be a positive integer",
    );
  });
});
