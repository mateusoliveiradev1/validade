# Controle GPP Web/API Release Note

Phase 17 adds the web/API foundation for Controle GPP. It is additive, feature-flagged, and central-first.

## What Is Included

- New `gpp` role and GPP-specific backend capabilities.
- Store-scoped API routes for GPP queue, detail, history, avarias, divergencias, baixa, and compras internas.
- Additive database persistence for GPP avarias, movements, purchase requests, mutation receipts, and audit-linked events.
- Web `Controle GPP` route with tabs `Avarias`, `Compras internas`, `Divergencias`, and `Historico`.
- Realtime store-room refresh hints through Durable Object binding support, with manual refresh fallback.

## Feature Flag

The feature is hidden unless `controle_gpp_enabled` is true in the session context.

Checked-in `apps/api/wrangler.toml` does not enable either `CONTROLE_GPP_ENABLED` or `VALIDADE_ZERO_CONTROLE_GPP_ENABLED`, so local/staging config remains default-off unless an operator deliberately sets the flag outside the repo.

Rollback is manual and immediate: disable the flag and refresh sessions. Existing GPP tables/audit records remain in the database for traceability, but the web route is no longer exposed.

## Role And Invitation Expectations

- Invite GPP users with the `gpp` role for the correct store.
- Do not reuse `lead` or `admin` just to operate GPP baixa.
- UI hiding is only ergonomics. Backend authorization enforces store scope and write capability on every GPP route.
- Collaborator, leadership, GPP, and admin permissions remain distinct.

## Central-First Behavior

- Web writes show `Salvando na central...` while pending.
- Success copy appears only after the central API confirms or replays a confirmed mutation.
- Failure copy uses `Falha na central` and keeps work visible/retryable.
- Realtime events are refresh hints only; clients re-read central snapshots before visible truth changes.

## What Remains Manual

- No automatic ERP, stock, or external-system baixa is performed by Phase 17.
- Physical caderno/caixa must stay in parallel during initial validation.
- A real GPP desk cutover requires controlled UAT and agreement between web history and physical labels.
- Mobile Controle GPP entry is Phase 18.
- Hoje integration for GPP avaria/reaproveitamento/producao is Phase 19.
- Realtime expansion beyond GPP is Phase 20.

## Build 170 Boundary

Phase 17 does not change `Hoje`, offline sync semantics, Expo config, app version, or Android version code. Current validation remains `0.12.0` / build `170`.

The only mobile source adjustment is compatibility with the widened shared session role union: mobile session UI can accept/display `activeRole: "gpp"` without exposing a mobile Controle GPP route or granting shift-close behavior. Mobile GPP execution remains Phase 18.

## Validation Summary

Focused tests passed for domain, contracts, database, API, web, mobile compatibility/regression, and Playwright web E2E. The full `pnpm check` gate and public-safe evidence scan passed before closeout.
