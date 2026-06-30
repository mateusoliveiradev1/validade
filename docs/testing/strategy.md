# Testing Strategy

Validade Zero starts with smoke-level confidence in Phase 1. The goal is to prove the engineering skeleton is runnable and safe without pretending that future business flows already exist.

## CI-Safe Commands

- `pnpm test` runs the root Vitest project matrix for current package and app tests.
- `pnpm test:smoke` runs the API, web, and mobile smoke projects only.
- `pnpm typecheck` validates runtime TypeScript projects.
- `pnpm lint` runs ESLint plus dependency-boundary validation.
- `pnpm format:check` checks code style.
- `pnpm security` runs env, secret, data-safety, sensitive-evidence, and package security gates.
- `pnpm security:ui-release` rejects provisional product copy, missing privacy sections, auth-gate composition regressions, unsupported Command Center metrics, and missing launch assets.
- `pnpm performance:budgets` measures the built web asset budget; run it after `pnpm build`.
- `pnpm check` combines the CI-safe quality gates.

## Local Setup Commands

- `pnpm test:e2e:web` runs Playwright against authenticated Command Center, privacy, responsive navigation, audit fallback, and membership-revocation fixtures. It starts Vite automatically and requires Playwright browsers installed locally.
- `pnpm test:e2e:mobile` runs the Maestro v1 auth/privacy flow against a locally available mobile app build or emulator target. Authenticated operational continuation needs a pilot-safe fixture on that device.
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

## Phase 9 release sequence

1. Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`.
2. Run `pnpm test:e2e:web`, `pnpm security`, and `pnpm performance:budgets`.
3. Run `pnpm test:e2e:mobile` only with an available emulator or internal APK, then record the exact result.
4. Run `pnpm check` before a release decision. Provider and physical-device checks remain blocked until their evidence is recorded.

## Phase 10 real pilot flow

- `pnpm --filter @validade-zero/mobile test -- mobile-release-journeys` covers auth gate, prepare-turn composition, central product reuse, lot registration, and return to Hoje with fictional data.
- `pnpm test:e2e:web` covers Command Center active/resolved consistency, role/store denial, privacy, audit fallback, and membership administration.
- `pnpm --filter @validade-zero/domain test -- shift-close`, `pnpm --filter @validade-zero/contracts test -- shift-close`, `pnpm vitest run --config vitest.config.ts --project api -- shift-close capture`, and `pnpm --filter @validade-zero/mobile test -- shift-close` cover central shift-close revalidation and unsafe handoff behavior.
- `pnpm test:e2e:mobile` remains the installed-build gate. If no Android device or emulator is connected, record the exact blocked output in `.planning/phases/10-real-pilot-flow-rebuild/10-UAT.md` and do not mark Android readiness as passed.
- `.planning/phases/10-real-pilot-flow-rebuild/10-VALIDATION.md` is the final truth matrix for Phase 10. It must separate repository readiness from external Android/provider readiness.

## Phase 11 mobile visual validation

- `pnpm.cmd --filter @validade-zero/mobile test -- mobile-release-journeys today-screen offline-sync shift-close` covers the polished component journey with fictional data before installed Android validation.
- `.maestro/v1-readiness.yaml` is the root `pnpm.cmd test:e2e:mobile` entrypoint for installed Android evidence. It must not assert a direct safe `Hoje` state without `Preparar turno`.
- Historical emulator/APK PASS evidence is context only. Current installed Android, provider push, camera/device, and physical-device readiness must be read from the Phase 11 UAT matrix and release truth matrix.
- Screenshot checkpoint names are sanitized evidence labels only: `phase11-login-privacy`, `phase11-preparar-turno`, `phase11-hoje-verdict`, `phase11-product-path`, `phase11-lot-registration`, `phase11-terminal-pending`, `phase11-conflict-sync`, and `phase11-shift-close`.
- Raw Maestro screenshots, device paths, APK/build URLs, tokens, provider identifiers, and real photos stay local unless a narrow allowlist is reviewed and `pnpm.cmd security:evidence` passes.
- If no emulator or approved Android device is connected, run `adb devices` and `pnpm.cmd test:e2e:mobile`, record the exact blocked output in `.planning/phases/11-mobile-visual-polish-and-emulator-validation/11-UAT.md`, and keep Android installed validation blocked.

## Phase 12 pilot readiness

- `pnpm.cmd --filter @validade-zero/contracts test -- command-center alerts capture` covers the readiness contracts, safe push-test contracts, UAT checklist contracts, and pilot blocker schema.
- `pnpm.cmd vitest run --config vitest.config.ts --project api -- command-center alerts authorization` covers same-store/admin safe push-test authority, Command Center projection, UAT checklist projection, and pilot blocker synthesis.
- `pnpm.cmd vitest run --config vitest.config.ts --project web -- command-center` covers device readiness, build compatibility, safe push timeline, `UAT Loja 18`, and `Bloqueios do piloto`.
- `pnpm.cmd --filter @validade-zero/mobile test -- build-info prepare-turn push-alerts` covers installed-build metadata, prepare-turn telemetry, local-only push degradation, and notification copy safety.
- `pnpm.cmd test:e2e:mobile` remains the installed Android gate for Phase 12. It is not replaced by component, API, or web tests.
- If no emulator or approved Android device is connected, record the exact blocked output in `.planning/phases/12-pilot-operations-and-device-readiness/12-UAT.md` and keep Android/provider/camera/physical UAT gates externally blocked.

Latest blocked installed-device output:

```text
adb devices
List of devices attached
```

```text
pnpm.cmd test:e2e:mobile
You have 0 devices connected, which is not enough to run 1 shards. Missing 1 device(s).
$ maestro test .maestro/v1-readiness.yaml
Not enough devices connected (0) to run the requested number of shards (1).
```

Public evidence rules remain strict: no raw screenshots, real photos, push tokens, Firebase files, build URLs, provider tickets, device serials, real product names, real lot values, credentials, private links, or store/customer-sensitive details in Git.

## Phase 14 mobile Ajustes

- `pnpm.cmd --filter @validade-zero/mobile test -- mobile-release-journeys ajustes-screen today-screen auth-flow` covers the repo-local Ajustes route, push controls, sync health, build/update truth, privacy, and sign-out behavior with fictional data.
- These tests prove component and route behavior only. They do not prove an installed Android APK, remote push provider delivery, camera/evidence capture, or physical Loja 18 UAT.
- Keep Phase 14 evidence public-safe: no raw APK/build URLs, EAS links, push tokens, provider tickets/receipts, raw device IDs, screenshots with sensitive content, camera files, real product names, real lot values, credentials, or private store details.
- Installed-device, provider, camera/evidence, and physical-store proof must be recorded separately when a real approved device/build is available.

## Phase 15 operational surface distillation

- `pnpm.cmd --filter @validade-zero/mobile test` covers the repo-local Hoje, Preparar turno, product/lot entry, Ajustes readiness, and Fechamento behavior with fictional data.
- `pnpm.cmd --filter @validade-zero/domain test` and `pnpm.cmd --filter @validade-zero/contracts test` cover strict product policy, safe-close blockers, and public Command Center labels.
- `pnpm.cmd --filter @validade-zero/web test` covers Command Center vocabulary and routing across Operacao, Aparelhos, Atualizacoes, and Validacao.
- `pnpm.cmd check` is the Phase 15 repository gate and includes typecheck, lint/boundaries, format, full tests, smoke tests, build, security, and performance budgets.
- Phase 15 repository gates do not prove installed Android, real provider push, camera/evidence capture, second-device convergence, or physical Loja 18 UAT. Record those as external proof gates unless they are actually run with sanitized evidence.
- Keep Phase 15 vocabulary public-safe: leitura central, cache local, fila local, fila de sincronizacao, push, camera, build, autorizacao do aparelho, revisao de produto, and lote sincronizado. Do not commit raw build URLs, provider payloads, push tokens, raw device IDs, real photos, real product names, real lot values, credentials, or private store details.
