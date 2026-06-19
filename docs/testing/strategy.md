# Testing Strategy

Validade Zero starts with smoke-level confidence in Phase 1. The goal is to prove the engineering skeleton is runnable and safe without pretending that future business flows already exist.

## CI-Safe Commands

- `pnpm test` runs the root Vitest project matrix for current package and app tests.
- `pnpm test:smoke` runs the API, web, and mobile smoke projects only.
- `pnpm typecheck` validates runtime TypeScript projects.
- `pnpm lint` runs ESLint plus dependency-boundary validation.
- `pnpm format:check` checks code style.
- `pnpm security` runs env, secret, data-safety, and package security gates.
- `pnpm check` combines the CI-safe quality gates.

## Local Setup Commands

- `pnpm test:e2e:web` runs Playwright against the Vite web smoke surface. It starts the Vite dev server automatically and requires Playwright browsers installed locally.
- `pnpm test:e2e:mobile` runs the Maestro smoke flow against a locally available mobile app build or emulator target.
- `pnpm test:mutation` runs Stryker. Phase 1 keeps thresholds at zero because critical domain rules begin in Phase 2.

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
