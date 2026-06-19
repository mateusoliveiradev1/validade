# Phase 01: Engineering Foundation - Pattern Map

**Generated:** 2026-06-18T23:50:34-03:00
**Status:** No existing code analogs; use source docs and locked project patterns

## File Classification

| File or Glob | Role | Closest Existing Analog | Pattern to Follow |
|---|---|---|---|
| `package.json` | Root command surface | None | Use `.planning/research/STACK.md` and pnpm/Turbo docs. |
| `pnpm-workspace.yaml` | Workspace root | None | Include `apps/*` and `packages/*`; fail fast with workspace packages. |
| `turbo.json` | Task graph | None | Define cacheable checks and persistent `dev`. |
| `tsconfig.base.json` | Shared strict TS base | None | `strict: true`, no unsafe relaxations, app/package configs extend it. |
| `eslint.config.*` | Typed lint and boundaries | None | Use typescript-eslint project service and boundary restrictions. |
| `apps/mobile/**` | Expo app smoke | None | Bootable app with safe Portuguese copy and no credentials. |
| `apps/web/**` | Vite app smoke | None | Bootable app with a dev-safe probe interaction to API contract. |
| `apps/api/**` | Hono Worker API | None | Hono app exports typed routes; env access through bindings, not privileged clients in web/mobile. |
| `packages/contracts/**` | Zod/Hono RPC contracts | None | Contracts are provider-agnostic and imported by apps. |
| `packages/config/**` | Runtime env validation | None | Safe schemas, `.env.example` parity, no real secrets. |
| `packages/domain/**` | Future business boundary | None | Empty/future-safe exports, no UI/infra/database dependency. |
| `packages/adapters/**` | Provider/fake interfaces | None | Interfaces first; fake/local adapters for Phase 1 smoke. |
| `packages/test-utils/**` | Fixtures and safety assertions | None | Portuguese fictitious data only. |
| `.github/workflows/ci.yml` | CI quality/security gate | None | Same command sequence documented in README. |
| `docs/security/threat-model-phase-01.md` | Lightweight threat model | None | STRIDE plus ASVS/MASVS references, proportional to Phase 1. |

## Shared Patterns

- Every app/package has a `package.json` with scripts consumed by root Turbo tasks.
- All local package dependencies use `workspace:*`.
- All TypeScript projects extend `tsconfig.base.json`.
- API contracts and env schemas are validated with Zod before use.
- Fixtures use clearly fictitious names, stores, users, lots, and evidence references.
- Root scripts are the source of truth for local and CI validation.

## No Analog Found

This repository has no implemented source code yet. Executors should read the canonical planning docs and use official starter patterns for pnpm, Turbo, Expo, Vite, Hono, Vitest, and typescript-eslint instead of trying to infer local code style.

## Pattern Compliance Notes

- Plans should reference this file in `<read_first>` when creating root tooling, apps, packages, security docs, or CI.
- If execution discovers generated starter files with framework-specific conventions, preserve working generated conventions and adapt them to the locked workspace structure instead of rewriting them wholesale.
