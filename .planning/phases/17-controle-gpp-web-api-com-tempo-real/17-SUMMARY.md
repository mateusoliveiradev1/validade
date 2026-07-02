---
phase: 17-controle-gpp-web-api-com-tempo-real
status: complete
completed: 2026-07-02
requirements:
  - GPP-01
  - GPP-02
  - GPP-03
  - GPP-04
  - GPP-05
  - GPP-06
  - GPP-07
plans_completed: 6
verification: passed
review: clean
---

# Phase 17 Summary - Controle GPP Web API com Tempo Real

Phase 17 delivered the additive, feature-flagged Controle GPP web/API foundation: explicit GPP authorization, central persistence, audited/idempotent API writes, realtime refresh hints, and a dense operational web route for Avarias, Compras internas, Divergencias, and Historico.

## What Shipped

- **Contracts and authorization:** Added explicit `gpp` role/action vocabulary, feature flag session shape, strict GPP request/response contracts, audit vocabulary, and default-off runtime parsing.
- **Persistence:** Added GPP tables/migration and repository behavior for avarias, movements, purchases, saldo, mutation receipts, divergence/correction/review/baixa/cancel/estorno, and audit-linked history.
- **API:** Added store-scoped GPP queue/detail/history/mutation routes with backend-only authorization, creator-only collaborator constraints, central-first writes, idempotency, audit append, and publish-after-commit hooks.
- **Realtime:** Added store-room Durable Object/WebSocket refresh hints that publish only after central success and never carry visible row truth.
- **Web:** Added feature-flagged `Controle GPP` route with Avarias, Compras internas, Divergencias, Historico, sector-first grouping, grouped baixa, detail/divergence sheets, purchase attendance, retryable failure states, and manual refresh fallback.
- **Closeout:** Added public-safe UAT/release docs, code review, full verification, and final gate evidence.

## Requirement Trace

| Requirement | Status | Evidence |
|-------------|--------|----------|
| GPP-01 | Complete | `17-01-SUMMARY.md`, `17-06-SUMMARY.md`; feature flag/session actions are default-off, and mobile build `0.12.0` / Android `170` remains unchanged. |
| GPP-02 | Complete | `17-02-SUMMARY.md`, `17-03-SUMMARY.md`; GPP avaria is the primary record with destination/finality, quantity/unit, product identity, persistence, API, and tests. |
| GPP-03 | Complete | `17-02-SUMMARY.md`, `17-03-SUMMARY.md`, `17-05-SUMMARY.md`; compras internas are separate from avaria, requestable by name/quantity, and serviceable with GPP code confirmation. |
| GPP-04 | Complete | `17-01-SUMMARY.md`, `17-03-SUMMARY.md`, `17-05-SUMMARY.md`; backend authorization enforces role/action/store scope for every GPP read/write. |
| GPP-05 | Complete | `17-02-SUMMARY.md`, `17-03-SUMMARY.md`; divergence, correction, GPP review, baixa, cancellation, administrative correction, estorno, receipts, and audit are append-oriented and tested. |
| GPP-06 | Complete | `17-04-SUMMARY.md`, `17-05-SUMMARY.md`; realtime events are post-central-success refresh hints, and web clients re-read central snapshots with paused/manual fallback. |
| GPP-07 | Complete | `17-05-SUMMARY.md`; web GPP surface shows operational tabs by store/sector with grouped baixa, details, confirmations, and no decorative dashboard noise. |

## Final Verification

- `cmd /c pnpm.cmd --filter @validade-zero/domain test` - PASS, 14 files / 155 tests.
- `cmd /c pnpm.cmd --filter @validade-zero/contracts test` - PASS, 12 files / 114 tests.
- `cmd /c pnpm.cmd --filter @validade-zero/database test` - PASS, 2 files / 62 tests.
- `cmd /c pnpm.cmd --filter @validade-zero/api test` - PASS, 14 files / 114 tests.
- `cmd /c pnpm.cmd --filter @validade-zero/web test` - PASS, 12 files / 56 tests.
- `cmd /c pnpm.cmd --filter @validade-zero/mobile typecheck` - PASS.
- `cmd /c pnpm.cmd --filter @validade-zero/mobile test` - PASS, 38 files / 292 tests.
- `cmd /c pnpm.cmd test:e2e:web` - PASS, 7 Playwright tests.
- `cmd /c pnpm.cmd security:evidence` - PASS.
- `cmd /c pnpm.cmd check` - PASS: typecheck, lint, dependency boundaries, format, full Vitest, smoke Vitest, build, security, and performance budgets.
- `cmd /c gsd-sdk.cmd query verify.schema-drift 17` - PASS, no schema drift.
- `cmd /c gsd-sdk.cmd query verify.codebase-drift` - skipped, no `STRUCTURE.md`; no action required.
- `git diff --check 60c1aacf^..HEAD` - PASS.

## Deviations

The original closeout plan expected no mobile files to change. The full gate revealed that mobile session UI types also had to accept the widened shared `activeRole: "gpp"` union. The resulting mobile change is compatibility-only and does not add mobile Controle GPP execution, Hoje integration, offline/local-pending GPP behavior, Expo config, app version, or Android versionCode changes.

## Rollout Boundary

Phase 17 is deployable as hidden web/API foundation only. The route stays hidden unless `controle_gpp_enabled` and GPP read action are present. Disabling the flag hides the route while preserving database/audit records for traceability.

## Manual-Only Proof Remaining

- Real GPP desk operation with physical labels/caixa.
- Cross-device perception on the real store network.
- Decision to remove caderno/caixa parallel fallback.
- ERP/stock baixa integration.
- Mobile GPP capture and local-pending behavior.
- Hoje integration with GPP records.

## Next Step

Start Phase 18 with `$gsd-discuss-phase 18` when ready to add mobile Controle GPP capture on top of the proven web/API foundation.
