---
status: complete
phase: 18-controle-gpp-mobile-para-avaria-e-compras-internas
source: [18-VALIDATION.md, 18-05-PLAN.md]
started: 2026-07-03T02:47:00-03:00
updated: 2026-07-10T07:25:56-03:00
---

# Phase 18 UAT - Controle GPP Mobile

## Current Test

[testing complete]

## Tests

### 1. One-hand avaria registration

expected: GPP/sector flow opens Controle GPP, registers avaria, reviews, and shows central success only after acknowledgement.
result: pass

### 2. Offline avaria pending return online

expected: Network unavailable submission becomes `Pendente neste aparelho`; restored connectivity retries through `Sincronizar pendencias GPP`.
result: pass
note: "Android emulator evidence: with airplane mode plus Wi-Fi/data disabled, avaria showed `Pendente neste aparelho`; after connectivity returned, `Sincronizar pendencias GPP` removed the local item and reported exactly 1 central-confirmed record moved to `Enviadas hoje`."

### 3. Code-optional purchase request

expected: Sector user submits `Solicitar compra interna` with product name/description, optional product code, quantity/unit, and finality; central acknowledgement shows success.
result: pass
note: "Android emulator evidence: purchase `Tomate UAT sem codigo`, quantity `3 un`, reached review with `Codigo: opcional nao informado` and then displayed `Solicitacao enviada para central`."

### 4. Offline purchase pending GPP web perception

expected: Offline purchase remains local pending and later syncs so GPP web/provider can perceive the request.
result: pass
note: "Correlated local end-to-end evidence: `Cenoura UAT central - 5 kg` became `Pendente neste aparelho` offline, synced after connectivity/login restoration, and appeared in the authenticated GPP `/gpp/purchases` queue. Reposting the same idempotency key returned `replayed`; the GPP queue still contained exactly 1 matching purchase."

### 5. Conflict and discard justification

expected: Central rejection becomes visible `Conflito de GPP`; discard requires local justification.
result: pass
note: "Phase 18 Plan 06 routed regression: the conflict remains visible, empty justification keeps discard disabled, one justified press persists `state: discarded`, the exact reason and `discardedAt`, refreshes the route, and removes the item from the active queue without calling the central GPP client. The installed build 170 was not overwritten; native proof of this new code waits for a deliberate later build."

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0
blocked: 0

## Latest Local Evidence

- `apps/api/local-memory-api.ts` seeds local in-memory accounts:
  - setor: `setor@example.invalid` / `senha-piloto-forte-123`
  - GPP: `gpp@example.invalid` / `senha-piloto-forte-123`
- Login validation confirmed setor receives `activeRole=collaborator`, `canCreateGppEntry=true`, `canReadGppQueue=false`, `canActOnTask=true`.
- Login validation confirmed GPP receives `activeRole=gpp`, `canCreateGppEntry=false`, `canCorrectOwnPendingGppEntry=false`, `canReadGppQueue=true`, `canBaixarGppAvaria=true`, `canAttendGppPurchase=true`.
- Metro is running on `8082`; local API is running on `8790`; Android bundle contains `10.0.2.2:8790`.
- Passed API tests: `pnpm.cmd exec vitest run --config vitest.config.ts --project api apps/api/src/authorization.test.ts apps/api/src/authentication.test.ts`.
- Passed mobile tests: `pnpm.cmd exec vitest run --config vitest.config.ts --project mobile apps/mobile/src/capture/mobile-gpp-navigation.test.tsx apps/mobile/src/capture/gpp-pending-screen.test.tsx apps/mobile/src/capture/gpp-avaria-flow.test.tsx apps/mobile/src/auth/auth-flow.test.tsx`.
- Passed central placeholder regression: `pnpm.cmd exec vitest run --config vitest.config.ts --project mobile apps/mobile/src/capture/mobile-gpp-navigation.test.tsx apps/mobile/src/capture/gpp-pending-screen.test.tsx`.
- Passed typechecks: `pnpm.cmd --filter @validade-zero/api typecheck`, `pnpm.cmd --filter @validade-zero/mobile typecheck`.
- Emulator UAT passed offline avaria queue/retry and code-optional purchase submission.
- Emulator UAT reproduced a real 401 central rejection after a controlled local API restart; the item became `Conflito de GPP` with the authorization reason visible.
- Empty discard justification kept the destructive action disabled; entering a justification enabled it, but pressing it did not discard the item.
- Phase 18 Plan 06 fixed the missing route callback and added a routed regression proving one justified press persists the discarded record and refreshes it out of the active queue.
- Focused Plan 06 verification passed: 3 mobile test files / 11 tests, mobile typecheck, and Prettier checks for the touched source/test files.
- Android AVD `ValidadeZeroApi36` was available, but the installed package remained the approved build 170. It was intentionally not replaced with an unapproved build for this code-only gap retest.
- Correlated GPP queue proof: `Cenoura UAT central`, `5 kg`, status `solicitado`; replay state `replayed`; matching purchase count remained `1`.
- Focused mobile tests passed: 6 files / 22 tests.
- Focused API tests passed: 3 files / 25 tests.
- Mobile and API typechecks passed.

## Gaps

- truth: "A central rejection becomes visible as `Conflito de GPP`; discard requires a local justification and then removes the record from the active local queue."
  status: resolved
  resolution: "CaptureApp now passes a defensive `onDiscardConflict` handler that persists the trimmed reason and current discard timestamp through `repository.discardGppPending`, then refreshes the GPP lists."
  evidence: "apps/mobile/src/capture/mobile-gpp-navigation.test.tsx; commit 0849a02"
  test: 5
  root_cause: "GppPendingScreen exposes onDiscardConflict as optional, but CaptureApp does not pass a handler that calls repository.discardGppPending and refreshes the GPP lists."
  artifacts:
    - path: "apps/mobile/src/capture/CaptureApp.tsx"
      issue: "GppPendingScreen is rendered without onDiscardConflict wiring."
    - path: "apps/mobile/src/capture/GppPendingScreen.tsx"
      issue: "The destructive action invokes an optional callback, so missing integration fails silently."
  remaining_external_proof:
    - "Retest this exact path on the intentionally built post-170 APK when the GPP release is approved; do not treat build 170 as containing this fix."
  debug_session: "autonomous emulator UAT 2026-07-10"
