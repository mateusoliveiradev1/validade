---
phase: 5
slug: push-and-escalation
status: approved
shadcn_initialized: false
preset: none
created: 2026-06-20
reviewed_at: 2026-06-20T12:16:06-03:00
---

# Phase 5 - UI Design Contract

> Visual and interaction contract for push reminders and escalation on top of the mobile "Hoje" task workflow. Alerts increase operational pressure, but the persistent in-app task remains the source of truth.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | None - native React Native tokens and primitives |
| Preset | Not applicable; shadcn targets web React and is not introduced for this Expo mobile workflow |
| Component library | None - use React Native primitives behind small local feature components |
| Icon library | None required; icons may reinforce a labeled state but must never replace text |
| Font | Platform system sans (`System` on iOS; `Roboto` on Android) |

Extend the Phase 4 mobile vocabulary instead of introducing a new kit. Reuse `TodaySafetyHeader`, `TodayTaskRow`, `TaskSection`, `TaskResolutionPanel`, `StatusNotice`, `PrimaryAction`, and `SecondaryAction`. New Phase 5 primitives should stay small and operational: `PushPermissionCard`, `AlertChannelNotice`, `TaskAlertStatus`, `EscalationStatusRow`, `EscalationAcknowledgementPanel`, and `PushOpenFallbackNotice`.

Do not introduce a dashboard shell, notification center, map/timeline analytics view, custom font, decorative alert illustration, gamified badges, or broad admin configuration UI in this phase.

---

## Spacing Scale

Declared values (must be multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon-to-label gap, status dot gap, helper offset |
| sm | 8px | Compact metadata gaps, alert-status chips, timestamp rows |
| md | 16px | Default screen gutter, stacked-control gap, notice padding |
| lg | 24px | Separation between safety header, alert channel notices, and task sections |
| xl | 32px | Start/end breathing room around permission education and empty states |
| 2xl | 48px | Minimum touch target height and primary action zone |
| 3xl | 64px | Reserved for the empty-state break below the safety verdict |

Exceptions: none. The screen keeps 16px horizontal padding, respects safe-area insets, and avoids nested cards. Alert and escalation metadata lives inside existing task rows or one adjacent notice band; do not stack multiple floating panels above the task list.

---

## Typography

Only these four sizes and two weights are permitted in the Phase 5 mobile UI.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Label / metadata / helper | 14px | 400 or 600 | 1.35 |
| Body / task detail / button | 16px | 400 or 600 | 1.5 |
| Section heading / task action | 20px | 600 | 1.25 |
| Safety verdict / permission heading | 28px | 600 | 1.2 |

Use the platform font for every label, status, timestamp, alert copy, and confirmation. Do not use all-caps alert labels, display fonts, condensed text, fluid heading sizes, or badge-heavy typography. Product names, lot identifiers, locations, alert states, and escalation timestamps must wrap without truncating the action or current risk state.

---

## Color

The product remains restrained, with semantic color reserved for safety, blocked risk, alert failure, and verified action states. Core contrast pairs must stay at or above WCAG 2.2 AA.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#F5F7EF` | Screen background and safe/empty state base |
| Secondary (30%) | `#E6EEE4` | Task row surface, grouped filters, push permission card, quiet task sections |
| Ink | `#112016` | Safety verdict, headings, body text, and required labels |
| Muted ink | `#3F5546` | Supporting metadata only; never the only carrier of alert or risk state |
| Accent (10%) | `#166534` | Filled primary action, enabled push channel, acknowledged leadership receipt, active task destination, focus ring |
| Critical / destructive semantic | `#B42318` | Expired, critical, overdue, escalation threshold reached, destructive task confirmations |
| Critical surface | `#FCE8E6` | Critical sales-area banner, overdue escalation notice, destructive confirmation surface |
| Warning semantic | `#6B3F00` | Push permission missing, retry pending, reminder delayed, channel degraded |
| Warning surface | `#FFF4D7` | Permission education card, push failure notice, retry-pending surface |

Accent reserved for: `Ativar alertas do turno`, `Abrir tarefa`, selected/active task after a push tap, leadership acknowledgement success, and visible focus indicator. It must not color every notification label, timestamp, icon, row, or secondary action.

Critical color is semantic, not decorative. Escalation uses critical treatment only when a task crosses its escalation limit or remains overdue; regular reminder cadence uses warning/metadata treatment so the interface does not feel permanently alarmist.

---

## Visual Hierarchy and Mobile Interaction

### Primary focal point

The primary focal point remains the sales-area safety verdict at the top of "Hoje". Phase 5 adds alert-channel confidence immediately below that verdict, never above it:

1. **Sales-area safety verdict** - whether the area is safe now.
2. **Alert channel state** - whether push is active, pending, denied, degraded, or failed.
3. **First critical/escalated task** - the next physical action required.
4. **Escalation status** - who is being charged and whether leadership has acknowledged receipt.
5. **Product, lot, location, due state, and reminder timestamp** - supporting context.

Do not lead the screen with notification settings, counters, analytics, or a passive inbox. Push is a delivery channel for the task, not a new primary object.

### Screen contract

1. **Contextual push invitation:** "Hoje" explains alerts only after the user sees the operational task context. The permission prompt is triggered from `Ativar alertas do turno`; it is not requested automatically on first app launch.
2. **Permission education card:** When push is not configured, show a single persistent card below the safety header with what alerts do, what they do not do, and the primary action `Ativar alertas do turno`. It must state that tasks remain active in "Hoje" even without push.
3. **Denied or unavailable channel:** If permission is denied, token is unavailable, or the channel fails, replace the education card with an actionable warning notice. Provide `Tentar novamente` when retry is possible and `Abrir configurações do aparelho` when system permission must be changed.
4. **Stable task list:** Push/channel problems never remove, hide, resolve, reorder, or dim the task list. They add visible state while "Hoje" remains usable.
5. **Task alert status:** Each task that is under reminder cadence shows one compact status line: `Alerta ativo`, `Novo lembrete em {tempo}`, `Push pendente`, `Push falhou`, or `Liderança avisada às {horário}`. This line appears after due/severity/owner metadata, not before the action.
6. **Escalated task treatment:** Once a task reaches escalation threshold, the task row moves to the highest applicable priority section, shows `Liderança avisada`, and keeps the physical CTA as the dominant action. Escalation must never look like completion.
7. **Leadership receipt:** Leadership can acknowledge receipt from an explicit panel with product, lot, current owner, escalation time, and consequence. The confirmation label is `Confirmar recebimento da cobrança`. Acknowledgement records attention; it does not silence the task or mark the shelf safe.
8. **Responsible audience clarity:** Initial reminders show whether the target is an individual or `Equipe do turno`. After escalation, the UI states `Cobrando responsável e liderança` rather than broadcasting to everyone.
9. **Push tap destination:** Tapping a push opens the current task and highlights it briefly. If the task changed, was replaced by recheck, or was physically resolved, open "Hoje" with an explanation banner instead of showing a stale task.
10. **Updated-task fallback:** The fallback banner must name what changed: `Esta pendência foi atualizada. Abra a tarefa atual em Hoje.` or `Esta pendência já foi resolvida fisicamente. Confira as tarefas restantes.`
11. **Reminder cadence visibility:** Do not expose a complex schedule editor. Show only operationally useful timing: last reminder, next reminder, and escalation state when applicable.
12. **Out-of-shift behavior:** If the task is not eligible for off-shift notification, keep it visible in "Hoje" with copy such as `Cobrança retoma no próximo turno`; expired, critical, and sales-area recheck tasks remain eligible.
13. **Recheck continuity:** If a resolution creates `Reconferir área de venda`, the new task starts alert cadence immediately and visually inherits the original critical context without claiming the original task is done.
14. **Failure state feedback:** Retry feedback is inline and short. Use skeleton/disabled-button state for retry in progress; never block the whole screen with a modal or spinner.
15. **Notification content preview:** In-app preview may show full safe copy including lot. Lock-screen copy preview must show only action, product, and location.

### States and feedback

- Loading uses skeleton status rows or disabled buttons with the current label retained; do not replace "Hoje" with an isolated spinner.
- Push registration success shows `Alertas do turno ativos neste aparelho. As tarefas continuam em Hoje até a resolução física.`
- Temporary send failure shows `Alerta pendente. A tarefa continua ativa em Hoje e será tentada novamente.`
- Exhausted send retry shows `Não foi possível enviar o alerta. Abra Hoje e cobre esta tarefa manualmente.`
- Leadership acknowledgement shows `Recebimento confirmado pela liderança às {horário}. A tarefa continua aberta até a resolução física.`
- State transitions use 150-200 ms color/opacity feedback for activation, retry, escalation, acknowledgement, and stale-push fallback. With reduced motion, state changes are immediate.

---

## Copywriting Contract

All visible copy is Portuguese-BR, direct, operational, and non-blaming. Use verbs that name the shelf outcome; never use `Salvar`, `Enviar`, `OK`, or `Cancelar` as a primary action.

| Element | Copy |
|---------|------|
| Primary CTA | `Ativar alertas do turno` |
| Secondary permission CTA | `Agora não` |
| Retry CTA | `Tentar novamente` |
| System settings CTA | `Abrir configurações do aparelho` |
| Push task CTA | `Abrir tarefa` |
| Leadership acknowledgement CTA | `Confirmar recebimento da cobrança` |
| Push education heading | `Alertas ajudam a cobrar, mas Hoje continua sendo a fonte da verdade` |
| Push education body | `Ative alertas para receber lembretes de tarefas críticas. Nenhuma tarefa será resolvida pela notificação; a confirmação física continua no app.` |
| Push active notice | `Alertas do turno ativos neste aparelho.` |
| Push denied notice | `Alertas desativados neste aparelho. As tarefas continuam ativas em Hoje.` |
| Push unavailable notice | `Não foi possível preparar alertas agora. Confira a conexão e tente novamente.` |
| Push failure notice | `Alerta falhou. A tarefa continua ativa em Hoje e precisa ser cobrada manualmente se necessário.` |
| Retry-pending notice | `Alerta pendente. Vamos tentar novamente sem esconder a tarefa.` |
| Escalated status | `Liderança avisada às {horário}` |
| Escalated audience | `Cobrando responsável e liderança` |
| Leadership receipt feedback | `Recebimento confirmado pela liderança às {horário}. A tarefa continua aberta até a resolução física.` |
| Push opened stale task | `Esta pendência foi atualizada. Abra a tarefa atual em Hoje.` |
| Push opened resolved task | `Esta pendência já foi resolvida fisicamente. Confira as tarefas restantes.` |
| Off-shift paused copy | `Cobrança retoma no próximo turno.` |
| Empty state heading | `Área de venda segura agora` |
| Empty state body | `Nenhuma tarefa exige cobrança neste momento. Alertas permanecem prontos para novos riscos do turno.` |
| Error state | `Não foi possível atualizar os alertas. As tarefas continuam em Hoje; confira a conexão e tente novamente.` |
| Destructive confirmation: disable local alerts | `Desativar alertas neste aparelho? As tarefas continuam abertas em Hoje e a cobrança pode depender de outro dispositivo do turno.` |

Lock-screen notification copy uses the privacy-safe form: `{ação}: {produto} - {local}`. After the app opens, the task detail may show lot, reason, owner, timestamps, and escalation state.

Secondary dismissal copy is `Voltar e revisar`. It tells the person what will happen and should replace generic dismissal labels.

---

## Accessibility and Responsive Contract

- Meet WCAG 2.2 AA contrast, visible focus, accessible names, and logical screen-reader order.
- Every primary target is at least 48 x 48 dp. Icon-only notification actions are not allowed.
- Permission, failure, escalation, and acknowledgement combine text, structure, and color; color alone never distinguishes active, denied, failed, pending, escalated, or acknowledged states.
- The screen reader order is: safety verdict, alert-channel notice, escalated/critical task section, remaining task sections, future attention.
- Push-triggered opening announces whether the current task opened, changed, or was already physically resolved.
- The layout is mobile-first for narrow phones and remains a single focused task column on larger widths. Do not turn alerting into a desktop-style dashboard in this phase.
- Support system font scaling without clipping essential labels. Long product names, lot identifiers, locations, escalation copy, and permission explanations must wrap.
- Use fictitious product/store data in tests, docs, notification examples, and screenshots. No real operational records, device tokens, photos, or private evidence assets may enter the public repository.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | None - not applicable to the Expo native implementation | Not required |
| Third-party registries | None | Not applicable |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-06-20
