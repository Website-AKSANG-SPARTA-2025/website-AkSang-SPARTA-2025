# Next development LAN origin allowlist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permit the single LAN host `192.168.100.5` to load Next development resources from this application.

**Architecture:** Keep the allowlist in the existing typed Next configuration. A small Vitest test imports that configuration and asserts the exact host, preventing an accidental wildcard or production-facing application change.

**Tech Stack:** Next.js 16.3.0, TypeScript, Vitest 4.

## Global Constraints

- Add only `192.168.100.5`; do not add a wildcard or other LAN host.
- Use `allowedDevOrigins`, which applies only to `next dev`.
- Do not change routes, API behavior, authentication, environment variables, or production configuration.
- Do not add a dependency.

---

### Task 1: Whitelist the exact development origin

**Files:**
- Modify: `next.config.ts`
- Create: `tests/next-config.test.ts`

**Interfaces:**
- Consumes: the default `NextConfig` export from `next.config.ts`.
- Produces: `allowedDevOrigins: ["192.168.100.5"]` for the Next development server.

- [ ] **Step 1: Write the failing configuration test**

Create `tests/next-config.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import nextConfig from "../next.config";

describe("Next development origin configuration", () => {
  it("allows only the intended LAN host during development", () => {
    expect(nextConfig.allowedDevOrigins).toEqual(["192.168.100.5"]);
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npx.cmd vitest run tests/next-config.test.ts`

Expected: FAIL because `allowedDevOrigins` is not configured.

- [ ] **Step 3: Add the minimal Next configuration**

Change `next.config.ts` to:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.100.5"],
};

export default nextConfig;
```

- [ ] **Step 4: Verify the focused and project checks**

Run:

```powershell
npx.cmd vitest run tests/next-config.test.ts
npm.cmd run lint
npx.cmd tsc --noEmit
```

Expected: all commands exit `0`.

- [ ] **Step 5: Manually verify the development server**

Stop any existing server, run `npm.cmd run dev`, then load
`http://<development-server-ip>:3000/dev/api-tester` from `192.168.100.5`.
Confirm that `/_next/hmr` is no longer blocked. Stop the test server afterward.

- [ ] **Step 6: Commit only the configuration and test**

```powershell
git add -- next.config.ts tests/next-config.test.ts
git commit --only -m "fix: allow LAN origin in Next development" -- next.config.ts tests/next-config.test.ts
```

## Self-review

- Spec coverage: Task 1 constrains the exact host, development-only scope, and manual verification.
- Placeholder scan: no unfinished steps or unspecified commands.
- Type consistency: the test reads the existing default `NextConfig` export and uses Next's `allowedDevOrigins` property.
