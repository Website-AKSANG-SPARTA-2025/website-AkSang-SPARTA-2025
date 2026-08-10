# Next development LAN origin design

## Goal

Allow the development server to serve Next development resources to the single
LAN host `192.168.100.5`.

## Change

Add `allowedDevOrigins: ["192.168.100.5"]` to `next.config.ts`.

## Boundaries

- The allowlist applies only to `next dev`.
- No API route, authentication rule, environment variable, or production
  configuration changes.
- Do not use a wildcard or allow additional LAN hosts.

## Verification

Restart `npm run dev`, load `/dev/api-tester` from `192.168.100.5`, and check
that the blocked `/_next/hmr` warning no longer appears.
