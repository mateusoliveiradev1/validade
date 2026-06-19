# Phase 02: Domain and Risk Core - Research

**Researched:** 2026-06-19T09:08:42-03:00
**Status:** Ready for planning
**Mode:** MVP / domain-only vertical slices

## RESEARCH COMPLETE

Phase 2 should turn the reserved `packages/domain` boundary into a pure, tested rule engine for product mode, rule profiles, risk state calculation, and physical-presence uncertainty. The phase should not create persistence, API routes, mobile screens, task rows, push behavior, or provider integration. It should produce stable TypeScript exports that later phases can call.

## Source Inputs

- `.planning/ROADMAP.md` assigns Phase 2 to CAT-04, LOC-04, RSK-01, and RSK-02.
- `.planning/REQUIREMENTS.md` defines formal-validity vs FLV quality-inspection requirements, uncertainty for unverified risky lots, risk windows, and actionability.
- `.planning/phases/02-domain-and-risk-core/02-CONTEXT.md` locks D-01 through D-18.
- `.planning/phases/01-engineering-foundation/01-CONTEXT.md` and Phase 1 outputs reserve `packages/domain` as a pure package with no UI, database, provider, app, or adapter imports.
- `.planning/research/STACK.md` recommends Vitest for domain rules and StrykerJS for mutation testing on critical rules.

## External Verification Notes

Primary docs checked for the planning surface:

- Vitest test projects: https://vitest.dev/guide/projects
- Vitest configuration: https://vitest.dev/config/
- StrykerJS Vitest runner: https://stryker-mutator.io/docs/stryker-js/vitest-runner/
- StrykerJS configuration: https://stryker-mutator.io/docs/stryker-js/configuration/
- Turborepo task configuration: https://turborepo.dev/docs/reference/configuration
- TypeScript TSConfig strict options: https://www.typescriptlang.org/tsconfig/

Findings to apply:

- The root `vitest.config.ts` already uses `test.projects`; add a `domain` project instead of creating an unrelated runner.
- Stryker is already configured to mutate `packages/domain/src/**/*.ts`, so Phase 2 should make domain tests real and keep implementation files small enough for useful mutation feedback.
- `packages/domain/package.json` currently has a placeholder `test` script; replace it with a real Vitest command or make root Vitest include the domain project and keep package scripts aligned.
- The repo already has strict TS options such as `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `noImplicitReturns`; domain models should use discriminated unions and explicit result objects instead of optional-field bags.
- Turbo already exposes `typecheck`, `lint`, `test`, `test:mutation`, and `check`; Phase 2 should wire into those existing commands rather than add a parallel command surface.

## Domain Modeling Guidance

Use a small pure domain model with these stable concepts:

| Concept | Suggested shape | Why |
|---|---|---|
| Product mode | Discriminated union using `formal_validity`, `flv_inspection`, `receiving_monitored` | Satisfies D-01 and D-02 without ambiguous optional dates. |
| Rule profile | Explicit windows for radar, markdown, critical, expiry/quality, and max physical-confirmation age | Covers D-08, D-09, and D-10. |
| Lot snapshot | Immutable input object with product/category profile, current date, applicable dates, and last physical confirmation | Keeps engine pure and deterministic. |
| Risk state | Ordered state union: `safe`, `radar`, `markdown_due`, `critical`, `expired`, `uncertain` | Covers D-05 and D-07. |
| Reason code | Structured string union such as `expires_in_15_days`, `presence_stale`, `missing_required_date`, `expired` | Covers D-17 and avoids UI-copy-driven rules. |
| Operational command | `check_presence`, `request_markdown`, `withdraw_now`, `monitor`, `correct_data` | Covers D-15 and gives future task phases a stable handoff. |
| Physical confirmation | Concrete result union: `present`, `moved`, `withdrawn`, `loss`, `not_found`, `probably_sold_out` | Covers D-12 and D-13. |

Prefer one exported top-level function such as `calculateLotRisk(input)` plus helper builders or constants for default profiles. Keep date handling deterministic by accepting ISO date strings or `Date` objects only through a narrow parser/helper; tests should pin the current date explicitly.

## Risk Algorithm Guidance

The rule engine should evaluate these concerns in a predictable order while still returning all structured reasons:

1. Required data checks. Missing required date, received date, quality window, profile, or current date yields `uncertain` with `correct_data`.
2. Physical-presence recency. Stale or absent confirmation on a risky lot yields `uncertain` with `check_presence`.
3. Expired or beyond quality window dominates every other risk and yields `expired` with `withdraw_now`.
4. Critical window yields `critical`.
5. Markdown window yields `markdown_due` with `request_markdown`.
6. Radar window yields `radar` with `monitor`.
7. Otherwise yield `safe` with `monitor`.

Severity precedence must be encoded as data or a small comparator so tests can prove `expired` beats `markdown_due` and `critical`, and `uncertain` never silently becomes `safe`.

## MVP Slice Guidance

Although the phase is domain-only, plan vertically by executable business capability:

1. Test harness plus vocabulary/types.
2. Formal-validity and FLV risk-window calculation.
3. Physical-presence uncertainty and operational command mapping.
4. Mutation-ready scenario matrix and boundary verification.

Each slice should introduce tests before or alongside the implementation it proves. Avoid a plan that creates all types first and all behavior later; that would be horizontal and harder to verify.

## Validation Architecture

| Validation Layer | Purpose | Command |
|---|---|---|
| Domain unit tests | Prove product modes, risk states, reason codes, and commands | `pnpm --filter @validade-zero/domain test` |
| Root test matrix | Ensure the domain project is included in the monorepo test command | `pnpm test -- --project domain` or `pnpm test` |
| Type safety | Prove discriminated unions and exports compile under strict TS | `pnpm --filter @validade-zero/domain typecheck` |
| Boundary enforcement | Prove domain does not import UI, app, provider, database, or adapters | `pnpm lint` |
| Mutation readiness | Exercise critical domain rules through Stryker | `pnpm test:mutation` |
| Full CI parity | Run the project gate after all phase plans | `pnpm check` |

Sampling rule for execution: each plan must run its focused domain test or typecheck command. Before verification, run `pnpm lint`, `pnpm test`, `pnpm test:mutation`, and `pnpm check` unless mutation runtime becomes too expensive; if skipped, record the reason in the summary.

## Common Pitfalls

- Modeling FLV as a formal expiry date with nullable fields. That violates CAT-04 and D-01.
- Treating missing data, stale physical confirmation, `not_found`, or `probably_sold_out` as final safety. That violates LOC-04, D-04, D-06, D-11, and D-13.
- Returning only human-readable Portuguese copy from the engine. Future UI can translate; the domain must return structured reason codes.
- Importing Zod contracts, Hono, Drizzle, React, Expo, adapters, or provider SDKs into `packages/domain`. Domain should be pure TypeScript rules.
- Using the real system clock inside tests. All risk tests should provide current date explicitly.
- Creating persistent tasks or audit events in this phase. The output is a command recommendation, not a stored workflow.

## Open Questions (Resolved for Planning)

1. **Should Phase 2 add API or database schemas?** Resolved: no. The phase boundary is pure domain logic only.
2. **Should `not_found` and `probably_sold_out` close risk permanently?** Resolved: no. They resolve immediate uncertainty conditionally and remain traceable inputs for future phases.
3. **Should markdown/rebaixa workflow be implemented now?** Resolved: no. This phase only recommends `request_markdown`; Phase 6 implements the workflow.
4. **Should domain tests use real product/store examples?** Resolved: no. Use fictitious examples and existing test-utils rules.

## Planning Recommendation

Create four sequential plans. Start by wiring real domain tests and stable vocabulary, then implement risk-window evaluation, then add physical-presence uncertainty and command mapping, and finally harden mutation scenarios plus boundary verification. This keeps each wave executable, keeps `packages/domain` pure, and gives later phases a tested handoff without pulling in persistence or UI too early.
