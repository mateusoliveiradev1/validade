---
phase: 18-controle-gpp-mobile-para-avaria-e-compras-internas
status: local-validated-real-uat-pending
updated: 2026-07-03T13:30:36-03:00
---

# Phase 18 Testing Evidence

## Current Local Verification

- Local API: `apps/api/local-memory-api.ts` is running on `http://127.0.0.1:8790`.
- Metro: Expo/Metro is running on `8082` for Android.
- Emulator routing: Android bundle contains `10.0.2.2:8790`, so emulator traffic targets the local in-memory API instead of the original/staging API.
- Emulator attached: `emulator-5554`.

## Test Accounts

- Setor: `setor@example.invalid` / `senha-piloto-forte-123`
  - `activeRole=collaborator`
  - `canCreateGppEntry=true`
  - `canReadGppQueue=false`
  - `canActOnTask=true`
- GPP: `gpp@example.invalid` / `senha-piloto-forte-123`
  - `activeRole=gpp`
  - `canCreateGppEntry=false`
  - `canCorrectOwnPendingGppEntry=false`
  - `canReadGppQueue=true`
  - `canBaixarGppAvaria=true`
  - `canAttendGppPurchase=true`

## UI/UX Fixes Validated Locally

- GPP central mode opens as `Fila GPP`, shows disabled `Fila recebida` / `Acoes do GPP` placeholders, and hides `Registrar avaria` / `Solicitar compra interna`. Local sector sent receipts are no longer counted as GPP responses.
- Setor/collaborator mode keeps the send actions in the separate Controle GPP surface.
- `Controle GPP` and `Enviadas hoje` render acknowledgement timestamps in `pt-BR` / `America/Sao_Paulo` instead of raw ISO strings.
- Pending retry remains explicit through `Sincronizar pendencias GPP`.

## Automated Commands Run

- `pnpm.cmd exec vitest run --config vitest.config.ts --project api apps/api/src/authorization.test.ts apps/api/src/authentication.test.ts`
  - result: passed (`2` files, `18` tests)
  - coverage: auth session action derivation, Controle GPP feature flag, role-scoped actions.
- `pnpm.cmd exec vitest run --config vitest.config.ts --project mobile apps/mobile/src/capture/mobile-gpp-navigation.test.tsx apps/mobile/src/capture/gpp-pending-screen.test.tsx apps/mobile/src/capture/gpp-avaria-flow.test.tsx apps/mobile/src/auth/auth-flow.test.tsx`
  - result: passed (`4` files, `25` tests)
  - coverage: central/sector navigation split, pending/sent-today surfaces, offline avaria flow, AuthGate GPP access.
- `pnpm.cmd --filter @validade-zero/api typecheck`
  - result: passed
- `pnpm.cmd --filter @validade-zero/mobile typecheck`
  - result: passed
- `pnpm.cmd exec vitest run --config vitest.config.ts --project mobile apps/mobile/src/capture/mobile-gpp-navigation.test.tsx apps/mobile/src/capture/gpp-pending-screen.test.tsx`
  - result: passed (`2` files, `7` tests)
  - coverage: GPP central placeholder, disabled central actions, no `Respondidas hoje` local sent count leakage, sent/pending screen regression.

## Manual-Only Checks

- Real offline/online transition on emulator/device with internet disabled then restored.
- Physical one-hand aisle usability for avaria and purchase.
- GPP web/provider queue perception after central acknowledgement.
- Real central rejection converted into visible conflict, with discard justification retained locally.
- Full central GPP attendance workflow; current mobile central surface is truthful but still partial.

## Notes

Renderer tests prove contract, navigation, copy, state boundaries, retry mapping, role separation, and Today separation. They do not prove OS network transitions, device ergonomics, or provider/web GPP perception.
