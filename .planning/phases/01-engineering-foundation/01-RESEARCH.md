# Phase 01: Engineering Foundation - Research

**Researched:** 2026-06-18T23:50:34-03:00
**Status:** Ready for planning
**Mode:** MVP / walking skeleton, adapted to the locked Phase 1 boundary

## Research Complete

Phase 1 should create the engineering foundation that lets later phases build the operational product without reopening tooling, safety, or repository-shape decisions. The most important planning constraint is that this phase must be real and runnable, while still respecting the context boundary: no production credentials, no real store data, no required provider connection, and no business-rule implementation from Phase 2.

## Source Inputs

- `.planning/PROJECT.md` defines the product, zero-cost constraint, public-repo security posture, mobile-first direction, and modular monolith preference.
- `.planning/ROADMAP.md` assigns Phase 1 to FND-01, FND-02, FND-03, FND-04, and AUD-04.
- `.planning/REQUIREMENTS.md` defines the engineering, safety, quality, and audit baseline.
- `.planning/phases/01-engineering-foundation/01-CONTEXT.md` locks D-01 through D-20.
- `.planning/research/STACK.md` locks the preferred stack: pnpm/Turborepo, Expo, Vite, Hono on Cloudflare Workers, Neon/Drizzle behind adapters, Zod contracts, R2, Expo Push, GitHub Actions, Vitest, Playwright, Maestro, StrykerJS, and security checks.

## External Verification Notes

Primary docs checked during this research pass:

- pnpm workspaces: https://pnpm.io/workspaces
- Turborepo configuration: https://turborepo.dev/docs/reference/configuration
- Vitest projects: https://vitest.dev/guide/projects
- typescript-eslint project service: https://typescript-eslint.io/blog/project-service/
- pnpm CI on GitHub Actions: https://pnpm.io/continuous-integration
- Hono on Cloudflare Workers: https://hono.dev/docs/getting-started/cloudflare-workers
- Drizzle migrations: https://orm.drizzle.team/docs/migrations
- GitHub dependency review: https://docs.github.com/en/code-security/concepts/supply-chain-security/dependency-review
- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- OWASP MASVS: https://mas.owasp.org/MASVS/

Findings to apply:

- pnpm still uses `pnpm-workspace.yaml` as the workspace root marker. Use explicit `workspace:*` local dependencies so package links fail fast when a local package is missing.
- Turbo root `turbo.json` should define cacheable `build`, `typecheck`, `lint`, `format:check`, `test`, `test:smoke`, `security`, and non-cacheable persistent `dev` tasks.
- Vitest `test.projects` fits this monorepo better than ad hoc recursive test scripts because Phase 1 needs one root command that sees package/app projects.
- typescript-eslint `parserOptions.projectService` is the current simpler path for typed linting in monorepos; avoid maintaining separate `tsconfig.eslint.json` files unless execution discovers a blocker.
- Hono's Cloudflare Workers path supports local Wrangler development, typed bindings via generics, and `c.env` for runtime env access. Phase 1 should not use privileged database credentials in mobile/web.
- Drizzle supports codebase-first migration flows. Phase 1 should create the adapter and schema directories, but avoid live database push because D-17 forbids mandatory provider connections here.
- GitHub dependency review can enforce dependency checks in pull requests; baseline CI should also run `pnpm audit --audit-level high` and a local secret scanner.
- OWASP ASVS and MASVS should be referenced proportionally in a lightweight threat model now, then deepened when auth, evidence, offline sync, and role enforcement exist.

## Standard Stack for Planning

| Concern | Phase 1 Choice | Rationale |
|---|---|---|
| Package manager | pnpm with `pnpm-workspace.yaml` and `packageManager` pin | Matches stack decision and workspace linking behavior. |
| Task orchestration | Turborepo root `turbo.json` | Gives one command surface for all future apps/packages. |
| Mobile app | Expo scaffold in `apps/mobile` | Future camera, push, offline queue, and phone-first use. |
| Web app | Vite React scaffold in `apps/web` | Static admin/support surface without SSR cost. |
| API app | Hono Cloudflare Workers scaffold in `apps/api` | Edge-friendly typed API with health/probe smoke. |
| Shared packages | `packages/contracts`, `packages/config`, `packages/domain`, `packages/test-utils`, `packages/adapters` | Keeps contracts, env validation, future domain, fixtures, and provider adapters explicit. |
| Runtime validation | Zod in contracts/config boundaries | Enforces typed runtime boundaries early. |
| Testing | Vitest root projects plus Playwright/Maestro/Stryker config shells | Lets Phase 1 prove command wiring without fake feature coverage. |
| Security | `.gitignore`, `.env.example`, secretlint, dependency audit, CodeQL/dependency review, threat model | Matches public-repo and AUD-04 constraints. |

## Architectural Responsibility Map

| Tier | Owns in Phase 1 | Must Not Own |
|---|---|---|
| `apps/mobile` | Expo boot smoke, safe dev screen, mobile command wiring | Privileged database credentials, business rules, provider SDK details. |
| `apps/web` | Vite boot smoke, safe dev screen, health/probe interaction | Domain risk logic, privileged database credentials, provider secrets. |
| `apps/api` | Hono health endpoint, probe endpoint, adapter wiring, env access through Worker-style bindings | UI state, real store data, direct mobile/web database exposure. |
| `packages/contracts` | Zod schemas and shared API contracts | Provider-specific clients or persistence side effects. |
| `packages/config` | Environment schemas, safe defaults, `.env.example` contract | Real secrets or dashboard-only configuration. |
| `packages/domain` | Empty/future-safe exports and dependency-boundary target | Phase 2 risk rules or persistence models. |
| `packages/adapters` | Provider interfaces and fake/local adapters for Phase 1 smoke | Concrete Neon/R2/Push credentials or live provider calls. |
| `packages/test-utils` | Fake Portuguese fixtures, smoke helpers, safety assertions | Real product/store/user/evidence data. |
| `.github/workflows` | CI quality/security orchestration | Manual release policy or paid services. |

## Planning Guidance

1. Treat this as an engineering walking skeleton, not product feature work.
2. Use fakes/adapters where a provider would require credentials. That honors D-17 and keeps the repo executable by anyone.
3. Create a small "safe probe" path that proves web/mobile/API/shared contracts are wired without introducing operational business logic.
4. Keep all examples in Portuguese-BR but fictitious.
5. Keep dependency boundaries executable in lint or a dedicated boundary check script.
6. Do not create real Neon projects, R2 buckets, Expo push credentials, or GitHub repository settings through the plan.

## Validation Architecture

| Validation Layer | Purpose | Command |
|---|---|---|
| Install integrity | Prove workspace graph and lockfile are coherent | `pnpm install --frozen-lockfile` |
| Type safety | Strict TypeScript across apps/packages | `pnpm typecheck` |
| Lint and boundaries | Type-aware lint plus no forbidden imports | `pnpm lint` |
| Format stability | Deterministic formatting | `pnpm format:check` |
| Unit/smoke tests | Vitest projects and safe fixture checks | `pnpm test` |
| App smoke | Build or smoke each app without credentials | `pnpm test:smoke` |
| Security | Secret/dependency/repo-safety checks | `pnpm security` |
| CI parity | Same sequence in GitHub Actions | `pnpm check` |

Sampling rule for execution: after each plan, run that plan's focused command plus `pnpm check` once the workspace install exists. Before verification, `pnpm check` must pass from the repository root.

## Common Pitfalls

- Letting Phase 1 become a business-domain implementation phase. Risk rules, lot lifecycles, task generation, and audit persistence belong later.
- Creating tool configs that are present but not wired into root scripts. Every gate should be runnable through documented commands.
- Treating push notifications as reliable execution proof. Phase 1 should only create provider interfaces; later phases must pair push with persistent tasks.
- Adding real provider secrets, real store names, or real evidence assets to examples.
- Creating dependency-boundary docs without an automated check.
- Over-sharing UI components across React Native and web. Share tokens, contracts, config, test utilities, and domain only.

## Open Questions (RESOLVED)

1. **Should Phase 1 connect to live Neon/Cloudflare/Expo services?** RESOLVED: No. D-17 requires adapters, env vars, and mocks/fakes without mandatory credentials.
2. **How should MVP/walking skeleton be interpreted with UI hint `no`?** RESOLVED: Build an engineering skeleton with safe smoke surfaces and API probe, not an operational production UI.
3. **Should dependency boundaries be documentation-only?** RESOLVED: No. D-07 requires automation, so lint or a boundary check script must fail on forbidden imports.
4. **Should coverage thresholds be strict now?** RESOLVED: No global artificial threshold. D-14 requires visible baseline only; stronger thresholds begin when critical rules exist.

## Research Complete

Planning can proceed with a sequential set of small plans: workspace/toolchain, runnable apps, typed boundaries, validation/test pyramid, and CI/security/docs.
