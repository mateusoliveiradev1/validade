# Phase 02: Domain and Risk Core - Pattern Map

**Generated:** 2026-06-19T09:08:42-03:00
**Status:** Existing Phase 1 foundation available; domain business rules not yet implemented

## File Classification

| File or Glob | Role | Closest Existing Analog | Pattern to Follow |
|---|---|---|---|
| `packages/domain/src/index.ts` | Public domain export boundary | Existing placeholder in same file | Replace placeholder with stable exports while preserving pure package boundary. |
| `packages/domain/src/**/*.ts` | Domain models, risk engine, reason codes, commands | `packages/config/src/index.ts` for small typed modules | Use strict TS exports, explicit types, no `any`, no runtime side effects. |
| `packages/domain/src/**/*.test.ts` | Domain TDD coverage | `packages/config/src/index.test.ts`, `packages/test-utils/src/fixtures.test.ts` | Use Vitest, deterministic inputs, clear behavior assertions. |
| `packages/domain/package.json` | Package scripts | Other `packages/*/package.json` files | Keep `typecheck`, `build`, `lint`, `test`, `test:smoke`, `security` aligned with root Turbo tasks. |
| `packages/domain/tsconfig.json` | Domain TypeScript project | Existing package tsconfig | Extend root strict config, include source and tests only as needed by package scripts. |
| `vitest.config.ts` | Root test matrix | Existing api/web/mobile/config/test-utils projects | Add a `domain` project rooted at `packages/domain` with `src/**/*.test.ts`. |
| `stryker.config.json` | Mutation testing | Existing config already mutates domain | Keep domain mutate glob; ensure domain tests are included by Vitest config. |
| `eslint.config.mjs` | Typed lint and domain import restrictions | Existing domain override | Preserve domain forbidden imports and update allowDefaultProject only if new config/test files require it. |
| `scripts/check-boundaries.mjs` | Dependency boundary scanner | Existing script | Domain should pass without script changes unless new file extensions or import forms require coverage. |
| `packages/test-utils/src/fixtures.ts` | Fictitious examples | Existing fixtures | Use or extend fictitious product/lot examples only; never real store/product/evidence data. |

## Existing Code Excerpts to Preserve

`packages/domain/src/index.ts` currently declares the intended boundary:

```ts
forbiddenDependencies: ["apps/*", "database clients", "provider SDKs", "UI packages"],
```

Preserve the intent even if the placeholder object is removed. The new implementation can keep a boundary export or move the idea into tests/docs, but domain imports must remain pure.

`eslint.config.mjs` already blocks domain imports from:

```ts
"react", "react-dom", "react-native", "expo", "hono", "drizzle-orm", "@neondatabase/*", "pg"
```

Do not weaken this rule. If domain needs validation, use pure TypeScript types and functions in this phase instead of importing contracts or provider libraries.

`stryker.config.json` already targets:

```json
"packages/domain/src/**/*.ts"
```

Make the domain tests meaningful enough that this mutation target is useful.

## Shared Patterns

- Package exports point at `./src/index.ts` during this early monorepo stage.
- Root scripts are canonical; package scripts should compose with them instead of inventing isolated workflows.
- Tests live beside source under `src/**/*.test.ts`.
- Test fixtures are fictitious and marked with `FICTICIO`, `Ficticio`, `ficticio`, or `EXEMPLO`.
- Domain code must not depend on apps, UI frameworks, adapters, database clients, Cloudflare, Expo push, Hono, or provider SDKs.
- Critical rules should be represented by small pure functions so Vitest and Stryker can exercise branches directly.

## Recommended Internal Module Split

The executor may choose exact filenames, but the plan should point toward this shape:

| Module | Owns |
|---|---|
| `types.ts` | Product modes, rule profiles, lot snapshot, risk state, command, reason-code types. |
| `profiles.ts` | Default 60/15/3/0 profile and profile resolution helpers. |
| `risk.ts` | `calculateLotRisk` and severity comparator. |
| `presence.ts` | Physical confirmation status and stale-presence helpers. |
| `index.ts` | Public re-exports only, plus optional boundary marker. |

Keep modules small. If execution finds simpler names that fit the current codebase, use them, but avoid one giant `index.ts` with all rule logic.

## No UI-SPEC Needed

ROADMAP marks Phase 2 with `UI hint: no`. No frontend files are in scope, and no UI design contract is required for this phase.

## Pattern Compliance Notes

- Plans should include `.planning/phases/02-domain-and-risk-core/02-CONTEXT.md`, `02-RESEARCH.md`, `02-VALIDATION.md`, and this file in `<read_first>`.
- Plans that modify tests must include deterministic current-date examples.
- Plans that modify domain logic must include acceptance criteria proving CAT-04, LOC-04, RSK-01, RSK-02, and D-01 through D-18 are not silently dropped.
