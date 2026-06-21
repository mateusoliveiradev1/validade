---
phase: 07
slug: offline-sync
status: approved
shadcn_initialized: false
preset: not applicable
created: 2026-06-21
reviewed_at: 2026-06-21T16:56:19-03:00
surface: mobile-react-native
---

# Phase 07 - UI Design Contract

> Visual and interaction contract for offline sync in the mobile operational workflow. The app can work under poor connectivity, but it must never hide pending sync or silently confirm critical actions after a conflict.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | Existing React Native capture theme |
| Preset | not applicable |
| Component library | none; use React Native primitives plus local capture components |
| Icon library | none for this phase; do not introduce icon-only actions |
| Font | React Native system sans |

Source of truth: `apps/mobile/src/capture/capture-theme.ts`, `apps/mobile/src/capture/capture-ui.tsx`, `apps/mobile/src/capture/TodayScreen.tsx`, `apps/mobile/src/capture/TaskResolutionPanel.tsx`, `apps/mobile/src/capture/today-copy.ts`, and existing approved mobile UI contracts from Phases 04, 05, and 06.

Allowed components:

| Component | Contract |
|-----------|----------|
| `ScreenHeader` | Screen title plus one concise body line when context is needed. |
| `PrimaryAction` | One main sync or review action per surface; minimum 48dp touch target. |
| `SecondaryAction` | Back, retry later, review task, or lower-risk alternatives. |
| `SelectionRow` | Conflict choices, pending command details, retry choices, and local action review. |
| `Field` | Required reason when discarding or replacing an offline command. |
| `StatusNotice` | Offline readiness, pending sync, conflict, failure, and success feedback. |
| `ConfirmationSheet` | Final confirmation for destructive sync choices only. |

New Phase 7 primitives must stay local and operational: `OfflineStatusBand`, `PendingSyncNotice`, `SyncQueueSummary`, `CommandSyncStatusRow`, `SyncConflictPanel`, `OfflineCacheNotice`, and `SyncRetryNotice`.

Do not add a dashboard shell, network diagnostics screen, decorative connectivity illustration, map, chart, shadcn, web-only components, or a generic activity feed in Phase 7. Sync is support for shelf work, not a new primary product area.

---

## Visual And Interaction Contract

### Primary Surfaces

| Surface | Focal point | Required hierarchy |
|---------|-------------|--------------------|
| Hoje task list | Sales-area safety verdict remains first; sync state appears directly below it. | Safety verdict -> offline/sync status band -> first critical/conflict task -> task action -> product/lote/location -> pending/synced metadata. |
| Task resolution panel | The physical action being recorded now. | Action title -> lot summary -> connectivity/save state -> compatible decision/evidence -> primary action -> pending-sync feedback. |
| Sync queue summary | Commands that still need network confirmation. | Count by urgency -> conflict count -> oldest pending critical command -> retry action -> individual command rows. |
| Conflict panel | The command that cannot be applied without human review. | Conflict reason -> local command summary -> current server/task state -> allowed resolution choices -> destructive confirmation if discarding local action. |
| Offline cache notice | Whether active tasks and required lot snippets are available on this device. | Cache freshness -> what remains usable offline -> refresh/retry action -> last successful sync time. |

### Sync State Model

Render sync as an explicit operational state, never as hidden infrastructure:

| State | User-facing label | Behavior |
|-------|-------------------|----------|
| `offline_ready` | `Pronto para operar sem internet` | Active tasks and required lot snippets are cached; show last sync time. |
| `offline_mode` | `Sem internet agora` | Keep cached tasks usable and show that new actions will be saved on the device. |
| `command_saved_local` | `Acao salva no aparelho` | Confirm the physical action locally, mark it as pending sync, and keep pending status visible. |
| `pending_sync` | `Pendente de sincronizacao` | Keep a persistent notice until the command is sent and acknowledged. |
| `syncing` | `Sincronizando pendencias` | Disable duplicate submit/retry controls while preserving task content on screen. |
| `synced` | `Sincronizado` | Show short success feedback with time; remove the pending marker from that command. |
| `sync_failed` | `Nao foi possivel sincronizar` | Keep the command in queue, show retry path, and do not clear the pending marker. |
| `sync_conflict` | `Conflito de sincronizacao` | Pin conflict above regular pending items and require explicit review before the command can change task safety. |

### Screen Contract

1. **Safety verdict stays primary:** "Hoje" still opens with the sales-area safety verdict. Offline and sync state appears directly below the verdict, not above it and not in a separate settings area.
2. **Offline readiness is concrete:** The offline status band must state what is available: active tasks, required lot snippets, lot identity, current location, required action, and last known risk. Avoid vague copy such as `Modo offline ativo`.
3. **Local-first save:** When the person completes a physical action without connectivity, show `Acao salva no aparelho` and immediately attach `Pendente de sincronizacao` to the task or confirmation feedback.
4. **No silent safety claim:** If critical or expired sales-area work was completed offline but not synced, the safety header may reflect local progress only with a visible pending qualifier. It must not imply full system confirmation until sync succeeds.
5. **Pending marker placement:** Pending status appears in the task row, task panel feedback, and sync queue summary. A pending command cannot be represented only by a small icon, color, or hidden badge.
6. **Idempotency explained operationally:** Retry copy should say `Tentaremos novamente sem duplicar a acao` where space permits. Do not expose command IDs as primary UI text.
7. **Conflict priority:** Conflicts appear before normal pending commands and before future attention. A conflict tied to expired, critical, markdown application, shelf confirmation, withdrawal, or recheck uses critical treatment.
8. **Conflict content:** Every conflict must name the local action, product, lote, local, local time, and what changed remotely. Example: another device already moved the lot, task was replaced by recheck, or markdown stage advanced.
9. **Conflict resolution choices:** Allowed choices are `Revisar conflito`, `Manter acao local e reenviar`, `Atualizar pela tarefa atual`, and `Descartar acao offline`. Only show choices that the sync engine can safely perform.
10. **Destructive discard:** `Descartar acao offline` requires a confirmation sheet and a non-empty reason when the command involves withdrawal, loss, markdown application, shelf confirmation, critical recheck, or presence confirmation.
11. **Retry without blocking work:** A failed sync shows retry controls inline. It must not block registering lots, opening Hoje, or reviewing active tasks from the local cache.
12. **Cache freshness:** The UI must show `Atualizado as {hora}` for the last successful task/lot snippet sync. If the cache is stale, say what to do next instead of hiding tasks.
13. **Startup under poor connectivity:** If app opens without network, show cached Hoje content immediately with `Sem internet agora. Usando tarefas salvas neste aparelho.` Do not start on an empty spinner.
14. **Offline unavailable state:** If no cached active tasks exist yet, show a useful empty/error state that asks the user to reconnect once and keep manual lot registration reachable if local forms are available.
15. **Resolution panel feedback:** The primary action label must remain the physical outcome (`Retirar agora`, `Confirmar reconferencia`, `Confirmar etiqueta na area de venda`). Sync status appears as feedback after completion, not as a replacement for the shelf action.
16. **Push/escalation continuity:** Push and escalation copy remain subordinate to in-app tasks. If a push opens while offline, route to cached task when available or to Hoje with an offline explanation notice.
17. **Evidence placeholders:** Phase 7 may queue existing structured evidence metadata (`photo_recorded_placeholder` or `no_photo_reason`) but must not introduce real photo storage, URI display, R2 uploads, or audit-history UI from Phase 8.
18. **One queue, not a dashboard:** The queue summary is a compact operational panel within the mobile workflow. Do not create a desktop-style admin sync monitor.

---

## Spacing Scale

Declared layout values for new Phase 7 UI must use this scale:

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Inline helper gaps, state text stacks |
| sm | 8px | Compact metadata rows, pending/conflict row gaps |
| md | 16px | Screen padding, notice padding, default stacked-control gap |
| lg | 24px | Separation between safety header, sync band, task sections, and queue summary |
| xl | 32px | Bottom padding and empty/offline state breathing room |
| 2xl | 48px | Minimum touch target height and primary action zone |
| 3xl | 64px | Reserved for rare page-level spacing; avoid in normal mobile flows |

Exceptions: existing component internals may keep their current `captureSpacing.medium` 12px padding or gap where already used. New Phase 7 layout tokens must not introduce other spacing values.

Touch targets: all Pressable actions, conflict choices, retry controls, queue rows, and destructive confirmations must be at least 48dp high.

Radii: use `captureRadii.small` 6px for buttons/inputs and `captureRadii.medium` 8px for notices/task rows. Do not use nested cards.

---

## Typography

Use four sizes and two weights for new Phase 7 UI.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Label/meta | 14px | 400 or 600 | 20px |
| Body/control | 16px | 400 or 600 | 24px |
| Heading/panel title | 20px | 600 | 25px |
| Display/safety verdict | 28px | 600 | 34px |

Rules:

- Use 600 only for action labels, selected rows, headings, state labels, and conflict titles that must be scanned quickly.
- Keep body text at 16px and line-height 24px for corridor readability.
- Queue rows may be dense, but product, lote, local, action, and sync state must wrap without truncating the required action.
- Avoid display fonts, fluid type, decorative letter spacing, all-caps section markers, command IDs as primary text, and long technical headings.
- Use ASCII-normalized PT-BR copy in source files unless a touched file already uses accented copy consistently.

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#F7F9F6` | Screen background and calm operational canvas |
| Secondary (30%) | `#FFFFFF` | Task rows, sync queue rows, form fields, primary content surfaces |
| Accent (10%) | `#166534` | Primary retry/sync CTA, selected conflict choice, synced success text, active task highlight |
| Destructive | `#A1271D` | Conflict requiring review, discard confirmation, expired/critical blocking states, destructive copy only |

Supporting semantic colors from `capture-theme.ts`:

| Role | Value | Usage |
|------|-------|-------|
| Muted surface | `#EDF3EE` | Queue summary base, neutral offline-ready notice, inactive metadata containers |
| Pressed surface | `#E2EBE4` | Press feedback on secondary surfaces |
| Border | `#BAC8BE` | Default row, input, and notice border |
| Ink | `#132018` | Primary text |
| Muted ink | `#3E5547` | Secondary text and metadata |
| Accent soft | `#DDEDE2` | Synced success notice and selected safe conflict choice |
| Critical surface | `#FFF0EE` | Sync conflicts, destructive discard confirmation, failed critical sync |
| Critical border | `#E8B5B0` | Critical/conflict row border |
| Warning surface | `#FFF7E2` | Offline mode, pending sync, retry pending, stale cache |
| Warning ink | `#5D4505` | Warning and pending-sync text |

Accent reserved for: primary `Sincronizar pendencias` action, selected conflict choice, synced success feedback, active task highlight after sync opens a task, and visible focus/pressed state where supported. Accent is never reserved for all interactive elements.

Conflict and pending states must not depend on color alone. Pair every warning, pending, failed, conflict, success, disabled, and blocked state with explicit text such as `Pendente de sincronizacao`, `Conflito de sincronizacao`, `Acao salva no aparelho`, `Sincronizado`, or `Nao foi possivel sincronizar`.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | `Sincronizar pendencias` |
| Offline-ready notice | `Pronto para operar sem internet` |
| Offline mode notice | `Sem internet agora. Usando tarefas salvas neste aparelho.` |
| Local save feedback | `Acao salva no aparelho. Vamos sincronizar quando a conexao voltar.` |
| Pending sync label | `Pendente de sincronizacao` |
| Syncing label | `Sincronizando pendencias` |
| Synced feedback | `Sincronizado as {horario}.` |
| Retry CTA | `Tentar sincronizar novamente` |
| Conflict CTA | `Revisar conflito` |
| Keep local action CTA | `Manter acao local e reenviar` |
| Use current task CTA | `Atualizar pela tarefa atual` |
| Empty state heading | `Tudo sincronizado neste aparelho` |
| Empty state body | `Nenhuma acao esta pendente. Continue conferindo as tarefas em Hoje.` |
| Offline unavailable heading | `Conecte uma vez para preparar o trabalho offline` |
| Offline unavailable body | `Ainda nao ha tarefas salvas neste aparelho. Conecte para baixar as tarefas do turno e os dados essenciais dos lotes.` |
| Error state | `Nao foi possivel sincronizar. As acoes continuam salvas neste aparelho; confira a conexao e tente novamente.` |
| Conflict state | `Conflito de sincronizacao. Revise antes de confirmar esta acao.` |
| Stale cache warning | `Tarefas salvas podem estar desatualizadas. Sincronize antes de marcar a area como segura.` |
| Idempotency helper | `Tentaremos novamente sem duplicar a acao.` |
| Destructive confirmation | `Descartar acao offline: informe o motivo. Esta acao deixara de ser enviada e a tarefa atual precisara ser revisada.` |

Conflict detail copy:

| Context | Copy |
|---------|------|
| Remote task changed | `A tarefa mudou em outro aparelho. Compare antes de reenviar.` |
| Lot moved remotely | `O lote foi movido em outro aparelho. Confira o local atual antes de confirmar.` |
| Task already resolved remotely | `Esta pendencia ja foi resolvida em outro aparelho. Revise antes de descartar sua acao local.` |
| Markdown stage advanced remotely | `A etapa da rebaixa mudou. Revise a etapa atual antes de confirmar.` |
| Critical command blocked | `Esta acao critica nao pode ser confirmada automaticamente.` |
| Discard reason label | `Motivo para descartar a acao offline` |

Copy rules:

- Use concrete verb + noun labels, never `OK`, `Submit`, `Salvar`, `Enviar`, or `Cancelar` as the primary decision.
- Use `Hoje` as the source-of-truth surface: sync explains whether local work reached the system, but physical task decisions remain in the task panel.
- Avoid developer language in visible UI: no `outbox`, `payload`, `idempotency key`, `mutation`, `server`, or `HTTP` copy.
- Avoid false certainty. `Salva no aparelho` is allowed; `Resolvida no sistema` is allowed only after successful sync.
- Conflict copy must be direct and non-blaming. Name the missing decision and the next action.

---

## Accessibility, Loading, And Edge States

| State | Required UI behavior |
|-------|----------------------|
| Loading cached Hoje | Render the latest cached tasks immediately when available; show a stable status band instead of a blank spinner. |
| Empty sync queue | Show `Tudo sincronizado neste aparelho` and keep Hoje task paths visible. |
| Offline with cache | Show `Sem internet agora` plus last successful sync time and keep task rows usable. |
| Offline without cache | Show the unavailable heading/body and keep local-only lot registration reachable if the implementation supports it. |
| Command save in progress | Disable only the submitting action, keep its label tied to the physical outcome, and avoid duplicate taps. |
| Pending sync | Show persistent pending text in row, panel feedback, and queue summary. |
| Sync retry pending | Show inline retry feedback and `Tentaremos novamente sem duplicar a acao`. |
| Sync failure | Keep the command queued and show the error state copy with retry action. |
| Conflict | Put the conflict above normal pending commands and require `Revisar conflito`. |
| Destructive discard | Require confirmation sheet and reason before discarding critical or terminal local actions. |
| Stale cache | Show cache age and recommend sync before marking the sales area safe. |
| Push open while offline | Open cached task when available; otherwise open Hoje with an offline explanation notice. |

Screen-reader order: safety verdict, offline/sync status band, conflict summary if present, overdue/critical task section, remaining task sections, sync queue summary, future attention. Every sync state needs an accessible text label; icon-only status is not allowed.

Motion: use only press feedback and short state transitions that complete in 150-200ms for save, retry, conflict selection, and sync success/failure. With reduced motion, state changes are immediate and content remains visible.

Data safety: use fictitious product/store data in tests, docs, notification examples, and screenshots. Do not place real operational records, device tokens, photos, private evidence assets, or raw sync payloads in the public repository.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not applicable; React Native mobile phase |
| third-party registries | none | not applicable |

No third-party UI blocks, remote registries, copied component snippets, or network-loaded UI assets are approved for Phase 7.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-06-21
