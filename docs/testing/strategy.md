# Testing Strategy

Validade Zero starts with smoke-level confidence in Phase 1. The goal is to prove the engineering skeleton is runnable and safe without pretending that future business flows already exist.

## CI-Safe Commands

- `pnpm test` runs the root Vitest project matrix for current package and app tests.
- `pnpm test:smoke` runs the API, web, and mobile smoke projects only.
- `pnpm typecheck` validates runtime TypeScript projects.
- `pnpm lint` runs ESLint plus dependency-boundary validation.
- `pnpm format:check` checks code style.
- `pnpm security` runs env, secret, data-safety, sensitive-evidence, and package security gates.
- `pnpm check` combines the CI-safe quality gates.

## Local Setup Commands

- `pnpm test:e2e:web` runs Playwright against the Vite web smoke surface. It starts the Vite dev server automatically and requires Playwright browsers installed locally.
- `pnpm test:e2e:mobile` runs the Maestro smoke flow against a locally available mobile app build or emulator target.
- `pnpm test:mutation` runs Stryker. Phase 1 keeps thresholds at zero because critical domain rules begin in Phase 2.

## Phase 2 Domain Rules

Phase 2 turns `packages/domain/src` into the executable rule surface for product modes, risk windows, physical-presence uncertainty, operational commands, and conditional presence resolutions.

- `pnpm --filter @validade-zero/domain test` is the fast feedback command for domain unit and scenario coverage.
- `pnpm --filter @validade-zero/domain typecheck` verifies the strict TypeScript domain boundary.
- `pnpm test:mutation` runs Stryker against `packages/domain/src/**/*.ts` through the existing `stryker.config.json` mutation target.
- Mutation thresholds are still configured at zero, so mutation output must be reviewed for surviving mutants in critical branches before Phase 2 is considered verified.
- `pnpm lint` includes `scripts/check-boundaries.mjs`, which helps confirm the domain package stays free of UI, app, provider, database, and adapter dependencies.

## Future E2E Matrix

Future phases should extend this matrix with real flows as they are implemented:

- Cadastro de produto e lote.
- Tela Hoje com tarefas de conferência, rebaixa, movimentação e retirada.
- Solicitação, aprovação, aplicação e conferência de rebaixa.
- Push, lembretes recorrentes e escalonamento.
- Fila offline, sync e conflito explícito.
- Auditoria, papéis e fechamento de turno.

## Fixture Rules

- Use fixtures from `@validade-zero/test-utils` instead of real data.
- Every store, user, product, lot, and evidence example must include `FICTICIO` or `EXEMPLO`.
- Evidence examples must use fake object keys, not real photos or operational assets.

## Phase 8 authorization and truthful close

- `pnpm --filter @validade-zero/contracts test -- authorization` validates strict membership commands and server-owned authority fields.
- `pnpm vitest run --config vitest.config.ts --project api -- memberships` covers admin-only, store-scoped, versioned membership mutations and audit records.
- `pnpm vitest run --config vitest.config.ts --project mobile -- shift-close` covers blocker policy, unsafe offline receipts, checklist ordering, and role visibility.
- `pnpm test:e2e:web` covers the administrative web surface and its explicit confirmation state. Cross-store and forged-role denials remain API-level tests because the Vite E2E fixture contains no privileged backend.
- `pnpm security:evidence` scans tracked source, fixtures, docs, snapshots, and generated text artifacts for device URIs, embedded binaries, signed object queries, raw bearer material, and private production-like object references.

The remaining release checks are intentionally manual: real auth issuer claims, private R2 policy and 90-day lifecycle, disposable Neon migration verification, and a device/offline handoff walkthrough. Do not mark these as automated based on a local component or browser fixture.
