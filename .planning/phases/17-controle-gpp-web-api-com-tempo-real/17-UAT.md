---
phase: 17-controle-gpp-web-api-com-tempo-real
created: 2026-07-02
public_safe: true
---

# Controle GPP Web/API - UAT Checklist

Use this checklist only with sanitized test data or a controlled store sample approved for validation. Do not copy real product labels, photos, private URLs, tokens, personal data, or store-sensitive notes into repo artifacts.

## Ground Rules

- Keep **caderno/caixa paralelo** during the first validation. The web surface is not enough to remove the physical fallback on day one.
- Validate a small controlled set first, for example one avaria group, one compra interna, one divergence path, and one history lookup.
- Treat central database responses as truth. Do not consider an action done until the web UI shows central-confirmed copy.
- Realtime is convenience only. If it pauses, use `Atualizar` and continue validating central snapshots.
- If central is unavailable, stop the baixa/attendance path and retry later. Do not mark the physical item as cleared from the web alone.

## Pre-Checks

1. Confirm `controle_gpp_enabled` is intentionally enabled only in the target validation environment.
2. Confirm the signed-in user has the `gpp` role or explicit GPP actions for the target store.
3. Confirm current build validation remains `0.12.0` / `170`; Phase 17 does not require a new mobile build.
4. Confirm the physical caderno/caixa remains available beside the web flow.

## Avarias

1. Register or seed a sanitized avaria group for one sector.
2. Open `Controle GPP`.
3. Confirm the `Avarias` tab shows sectors first.
4. Confirm the busiest sector opens automatically.
5. Confirm the group row shows product code/name, sector/finality, total quantity/unit, entry count, divergence count when present, latest activity, and actions.
6. Click `Detalhes` and confirm the side panel shows summary, individual entries, movements/saldo, audit/history, and footer actions.
7. Click `Baixar`, review the confirmation, and verify it includes setor, product code/name, total, finality, entry count, saldo when available, and the estorno/correcao warning.
8. Confirm baixa only if the physical caderno/caixa sample agrees.
9. Expected pass: UI shows `Baixa registrada na central` only after central response.

## Compras Internas

1. Create a sanitized request from one sector with product name and quantity.
2. Open `Compras internas`.
3. Confirm requester, product/name/code when supplied, quantity/unit, finality, request time, and status are visible.
4. For a request without product code, click `Atendido` and confirm the form requires product code confirmation.
5. Test `Parcial` and `Sem produto` with a short sanitized reason.
6. Expected pass: each outcome shows action-specific central copy only after central response.

## Divergencias

1. Mark a sanitized avaria as divergent with a closed reason and observation.
2. Confirm the item cannot be baixado while status is divergent.
3. Confirm `Divergencias` shows reason, owner next action, correction/review status, and detail access.
4. Correct/review through the controlled path.
5. Expected pass: baixa is available only after correction and GPP review.

## Historico

1. Open `Historico`.
2. Filter by period, setor, product/code, type/status, and actor where available.
3. Confirm rows show action, product/code or request label, sector, actor role, timestamp, and status.
4. Expected pass: completed/canceled/estornado/admin correction paths remain visible and auditable.

## Central Failure And Retry

1. Simulate or wait for an approved central-unavailable fixture/test environment.
2. Confirm the UI shows `Central indisponivel`.
3. Confirm `Baixar` and attendance actions are blocked or fail closed.
4. Confirm failed baixa/divergence leaves the row visible and retryable.
5. Expected pass: no copy says the work was successful while central failed.

## Realtime Paused And Manual Refresh

1. Open the route with realtime unavailable or disconnected.
2. Confirm `Tempo real pausado` or `Tempo real indisponivel` is visible.
3. Confirm `Atualizar` remains visible.
4. Trigger a central change from another authorized session or fixture.
5. Use `Atualizar` and confirm the route rereads central truth.
6. Expected pass: event or manual refresh never applies row truth without central snapshot reread.

## Exit Criteria

- All controlled sample rows match physical caderno/caixa.
- No central-failed action was treated as completed.
- GPP history matches expected sanitized actions.
- Realtime active/paused states are understandable to the operator.
- Any disagreement keeps physical fallback in place and is recorded outside public repo details.

## Stop Conditions

- Real product labels or private data would need to be written into the repo.
- Central is unavailable for the sample.
- Product code/quantity cannot be confirmed.
- GPP and physical caderno/caixa disagree.
- A user can perform a write outside their authorized store.
