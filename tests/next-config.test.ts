import { describe, expect, it } from "vitest";

import nextConfig from "../next.config";

describe("Next development origin configuration", () => {
  it("allows only the intended LAN host during development", () => {
    expect(nextConfig.allowedDevOrigins).toEqual(["192.168.100.5"]);
  });
});
