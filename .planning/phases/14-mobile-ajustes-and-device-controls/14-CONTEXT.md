# Phase 14: Mobile Ajustes and Device Controls - Context

**Gathered:** 2026-06-28T23:58:32.8427366-03:00
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 14 creates the mobile `Ajustes` area as the operator-owned home for account/store context, push and reminders, sync health, update/build truth, diagnostics, privacy, and sign-out. It should move detailed device/control truth out of `Hoje` without weakening the operational guarantees: `Hoje` remains the sales-area execution surface, push remains a reminder/diagnostic signal, sync remains explicit, and local APK update truth remains manual and visible.

This phase should not redesign `Hoje`, `Preparar turno`, or `Fechamento do turno` beyond the integration points required to open Ajustes, return to the current operational route, and surface the same readiness vocabulary. Phase 15 owns broader operational-surface distillation.

</domain>

<decisions>
## Implementation Decisions

### Entrada e navegacao de Ajustes
- **D-01:** Ajustes opens from a fixed button in the authenticated session bar, next to store, role, and session identity. It should replace the current scattered `Privacidade` and `Sair` quick actions with a clearer control home rather than adding noise inside `Hoje`.
- **D-02:** Opening Ajustes must preserve the current operational route stack. Returning from Ajustes brings the operator back exactly to the task, lot, shift close, or `Hoje` state they were using.
- **D-03:** The first Ajustes screen is a device readiness summary: account/store identity at the top, then cards for push/reminders, sync, build/update, and privacy/account controls, each with state and next action.
- **D-04:** Ajustes uses the calm operational mobile language already present in `Hoje`: existing `ScreenHeader`, `StatusNotice`, button patterns, capture colors, and direct PT-BR copy. It should not look like a technical debug panel.

### Push, lembretes e teste seguro
- **D-05:** Ajustes must show push/reminder state, allow activation, allow disabling, and offer a safe test. Every control must preserve the rule that push does not resolve tasks, prove physical execution, or declare the sales area safe.
- **D-06:** Disabling alerts applies only to this device. The copy must say tasks remain active in `Hoje`, and other devices/leadership paths can still keep cobranca visible.
- **D-07:** The mobile safe push test proves only this device path: permission, token or local reminder availability, and notification receipt/opening when possible. It does not prove the global remote provider path and does not prove physical execution.
- **D-08:** Degraded push is `Atencao` by default. It becomes blocking only for a validation step that explicitly requires remote push proof or when the current workflow is proving provider delivery.

### Sync, conflitos e bloqueio de fechamento
- **D-09:** Ajustes leads sync with an operational summary: last central read, last sync/send attempt, pending command count, conflict count, and a clear statement that the current state either blocks safe close or does not block it.
- **D-10:** Ajustes owns sync recovery controls: retry pending commands, review conflicts, and discard an offline action only with an explicit reason. Reuse the existing mobile conflict rules instead of inventing weaker shortcuts.
- **D-11:** Ajustes must separate `ultima leitura central` from `ultima sync`. Central read means downloading the store truth; sync means sending local actions. One cannot substitute for the other.
- **D-12:** Safe shift close is blocked by critical sync conflict, critical local action pending central confirmation, or missing/stale central read. Non-critical pending sync may stay visible without automatically blocking safe close unless planning finds an existing domain rule that is stricter.

### Build/update, conta, privacidade e saida
- **D-13:** Update/build truth appears as installed versus approved version: installed app version/build, approved APK artifact label, compatibility, environment, API target, package id, and a manual next step when the build is stale or incompatible.
- **D-14:** Account/store in Ajustes is read-only for Phase 14. It shows person, active store, active role, account status, and session state. If store or role is wrong, the next step is to talk to leadership/admin; no manual store switching is introduced in this phase.
- **D-15:** Privacy in Ajustes includes a shortcut to the existing Centro de Privacidade plus a short operational summary of data used for operation, evidence, sync, permissions, device/build, and audit.
- **D-16:** Sign-out requires confirmation and warning about pending local commands or conflicts. Signing out does not delete pending work, resolve tasks, or make the area safe; it only ends the session.

### the agent's Discretion
- The planner may decide exact component boundaries, whether Ajustes is modeled as a route inside `CaptureApp` or a sibling authenticated shell screen, and how to sequence smaller cards inside the readiness summary, as long as route preservation and truth boundaries above hold.
- The planner may choose which existing push/sync/build helpers need light extraction from `TodayScreen` into shared mobile components.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and milestone truth
- `.planning/ROADMAP.md` - Phase 14 goal, SET-01..SET-05 scope, and success criteria for mobile Ajustes.
- `.planning/REQUIREMENTS.md` - v1.1 requirements, especially SET-01 through SET-05 and the OPS/VAL boundaries that keep Phase 14 from absorbing later phases.
- `.planning/PROJECT.md` - milestone context and key decisions: devices are permanent operational truth, APK update truth is explicit, and push is not execution proof.

### Phase 13 handoff
- `.planning/phases/13-web-operational-navigation-and-readiness-surfaces/13-CONTEXT.md` - route/truth split from web: Operacao, Aparelhos, Atualizacoes, Validacao, and the device/update/push boundaries Phase 14 mirrors on mobile.
- `.planning/phases/13-web-operational-navigation-and-readiness-surfaces/13-VERIFICATION.md` - proof that Phase 13 preserved shared `/command-center` truth and kept Android/provider/camera/Loja 18 proof external.

### Existing mobile shell and controls
- `apps/mobile/App.tsx` - authenticated app composition, session handoff into `CaptureApp`, build-info injection, repository construction, sync engine, and prepare/close clients.
- `apps/mobile/src/auth/AuthGate.tsx` - existing authenticated session bar, privacy route, sign-out behavior, session/account/store gating, and mobile auth client methods.
- `apps/mobile/src/capture/CaptureApp.tsx` - current route stack, Android back handling, prepare-turn gate, Today/task/detail/shift-close navigation, push-open routing, and build-info handoff.
- `apps/mobile/src/capture/capture-ui.tsx` - reusable ScreenHeader, StatusNotice, PrimaryAction, SecondaryAction, DestructiveAction, Field, and SelectionRow primitives.
- `apps/mobile/src/capture/mobile-status.ts` - existing mobile readiness vocabulary and priority ordering.

### Push, sync, build, and contracts
- `apps/mobile/src/build-info.ts` - installed versus approved build truth, public-safe labels, API target, package id, compatibility logic, and approved artifact defaults.
- `apps/mobile/src/capture/alert-channel.ts` - push permission, token, local scheduling, notification open parsing, fake channel for tests, and native module fallback behavior.
- `apps/mobile/src/capture/repository.ts` - repository contracts for alert registration, sync queue, conflict resolution, prepare-turn cache, offline state, and task alert state.
- `apps/mobile/src/capture/TodayScreen.tsx` - current push/sync/build rendering and behavior that should be moved or shared with Ajustes without weakening Hoje.
- `apps/mobile/src/capture/offline-sync-ui.tsx` - existing sync queue, conflict panel, destructive discard reason, retry controls, and copy patterns.
- `packages/contracts/src/command-center.ts` - shared readiness, build compatibility, device blocker, and public-safe pilot projection vocabulary.
- `packages/contracts/src/sync.ts` - sync queue, command, conflict, discard reason, and acknowledgement contracts.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AuthGate` already owns session, active store, role, privacy, and logout. Ajustes should consolidate those controls instead of duplicating auth state elsewhere.
- `CaptureApp` already manages a route stack and Android back behavior. This supports an Ajustes screen that can open and return without losing operational context.
- `readMobileBuildInfo` already returns installed version/build, approved artifact, API target, package id, environment, build ref, and compatibility.
- `PushAlertChannel` already exposes permission, token, local scheduling, cancellation, and notification-open handling.
- `CaptureRepository` already exposes alert registration, alert state, sync queue, conflict resolution, offline cache, and prepare-turn cache status.
- `offline-sync-ui.tsx` already contains safe conflict and discard UI patterns that should be reused for Ajustes.

### Established Patterns
- Mobile copy is operational and non-blaming: it states what is safe, what is pending, and what the operator can do next.
- Local-only and pending-central states must never sound like central proof.
- Push is diagnostic/cobranca only; tasks remain visible until business resolution and physical confirmation.
- Public-safe labels are mandatory for build/provider/device evidence; no tokens, raw URLs, private build links, or secrets in UI-facing evidence.
- Critical destructive actions need explicit confirmation and reason, especially sync conflict discard.

### Integration Points
- Add a stable Ajustes entry from the authenticated session bar in `AuthGate`.
- Extend `CaptureApp` or the authenticated mobile shell with an Ajustes route that preserves and restores the current operational route stack.
- Extract/share push, sync, and build cards currently rendered in `TodayScreen` so healthy states can live primarily in Ajustes while later Phase 15 decides compact operational surfacing.
- Use existing repository methods for `listSyncQueue`, `resolveSyncConflict`, `loadOfflineCacheStatus`, `loadPrepareTurnCacheStatus`, `loadAlertChannelState`, and `registerAlertDevice`.
- Update mobile component tests around session bar, route preservation, push controls, sync conflict handling, build truth, privacy shortcut, and sign-out pending-warning behavior.

</code_context>

<specifics>
## Specific Ideas

- Ajustes should feel like an operational readiness room on the phone: "este aparelho esta pronto para operar?" before deeper details.
- The first screen should use cards with state and next action, not a long technical list.
- Sign-out copy should explicitly say pending local work remains pending and no task is resolved by leaving the account.
- Update/build copy should be honest about local APK distribution: manual path first, no fake auto-update promise.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 14-Mobile Ajustes and Device Controls*
*Context gathered: 2026-06-28T23:58:32.8427366-03:00*
