---
phase: 4
slug: today-task-workflow
status: approved
shadcn_initialized: false
preset: none
created: 2026-06-19
reviewed_at: 2026-06-19T22:49:25-03:00
---

# Phase 4 - UI Design Contract

> Visual and interaction contract for the mobile "Hoje" task workflow. The screen answers whether the sales area is safe, then directs concrete shelf work by lot.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | None - native React Native tokens and primitives |
| Preset | Not applicable; shadcn targets the web surface and is not introduced for this Expo mobile workflow |
| Component library | None - use React Native primitives behind small local feature components |
| Icon library | None required; icons may reinforce a labeled state but must never replace text |
| Font | Platform system sans (`System` on iOS; `Roboto` on Android) |

Keep the Phase 3 mobile vocabulary and extend it only where the task workflow needs new primitives: `TodaySafetyHeader`, `TodayTaskRow`, `TaskSection`, `TaskResolutionPanel`, `IncompatibleActionNotice`, `EvidencePrompt`, and `RecheckPrompt`. Do not introduce a dashboard kit, decorative illustration, shadcn, custom fonts, or a generic analytics layout.

---

## Spacing Scale

Declared values (must be multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon-to-label gap, status dot gap, helper offset |
| sm | 8px | Metadata gaps, compact evidence fields, row internal spacing |
| md | 16px | Default screen gutter, task row padding, stacked-control gap |
| lg | 24px | Separation between task sections and resolution blocks |
| xl | 32px | Start/end breathing room around safety header and empty state |
| 2xl | 48px | Minimum touch target height and primary action zone |
| 3xl | 64px | Reserved for the empty-state break below the safety verdict |

Exceptions: none. The screen uses 16px horizontal padding, respects safe-area insets, and keeps the primary task action within easy thumb reach. Repeated task items may use one level of surface grouping, but nested cards are not allowed.

---

## Typography

Only these four sizes and two weights are permitted in the Phase 4 mobile UI.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Label / metadata / helper | 14px | 400 or 600 | 1.35 |
| Body / task detail / button | 16px | 400 or 600 | 1.5 |
| Section heading / task action | 20px | 600 | 1.25 |
| Safety verdict / confirmation heading | 28px | 600 | 1.2 |

Use the platform font for every label, task, status, and confirmation. Do not use all-caps labels, display fonts, condensed text, or fluid heading sizes. Product names, lot identifiers, locations, and confirmation copy must wrap without truncating the action, lot, or risk state.

---

## Color

The product remains restrained, with semantic color reserved for safety and action states. Core contrast pairs must stay at or above WCAG 2.2 AA; existing Phase 3 pairs already satisfy the main text/action combinations.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#F5F7EF` | Screen background and safe/empty state base |
| Secondary (30%) | `#E6EEE4` | Task row surface, grouped filters, quiet task sections |
| Ink | `#112016` | Safety verdict, headings, body text, and required labels |
| Muted ink | `#3F5546` | Supporting metadata only; never the only carrier of risk |
| Accent (10%) | `#166534` | Filled primary action when the task is safe to execute, active section, selected resolution, visible focus ring |
| Critical / destructive semantic | `#B42318` | Expired, critical, overdue, withdrawal/loss confirmation, and incompatible-action blocking |
| Critical surface | `#FCE8E6` | Critical sales-area banner and destructive confirmation surface |
| Warning semantic | `#6B3F00` | Markdown-due or follow-up state when it is not expired/critical |
| Warning surface | `#FFF4D7` | Markdown-due and follow-up section surface |

Accent reserved for: the single compatible next action on a task, the active "Hoje" tab/entry point, selected resolution option, and focus indicator. It must not color every row, icon, badge, or secondary action.

Critical color is semantic, not decorative. A sales-area expired or critical task uses critical surface, explicit text, and the first task position; color alone must never communicate the risk.

---

## Visual Hierarchy and Mobile Interaction

### Primary focal point

The primary focal point is the sales-area safety verdict at the top of "Hoje":

- `Área de venda segura` when no expired/critical/uncertain sales-area task blocks safety.
- `Área de venda com {n} risco(s) agora` when the sales area has actionable risk.
- `Área de venda segura, ainda há tarefas do turno` when safety is clear but work remains outside the immediate safety block.

The hierarchy is: **sales-area safety verdict -> first critical task -> compatible action -> product/lot/location -> due time and owner -> supporting explanation**. Do not start with metrics, charts, total counters, or a passive recent-list view.

### Screen contract

1. **Hoje entry point:** `CaptureApp` gains a first-class "Hoje" path without removing `Registrar lote`, recent lots, or observation flows. The app can show "Hoje" first after initialization, with a clear path back to lot registration.
2. **Safety header:** The header states the area condition in one sentence, shows the highest-risk task reason, and exposes `Atualizar tarefas` as a secondary action. It must not use a blocking modal as the default response to critical risk.
3. **Task sections:** Tasks are ordered as `Retirar agora`, `Conferir na área de venda`, `Pedir rebaixa`, `Acompanhar`, then `Atenção futura`. `radar` appears only under `Atenção futura` and never becomes a shift task.
4. **Task row anatomy:** Each row shows action first, then product, lot, location, due time/severity, owner, and one short reason. A row is a full-width touch target of at least 48 dp and opens a resolution panel or lot detail.
5. **Per-lot visibility:** Every task represents one actionable lot. Visual grouping by product or location is allowed, but it cannot hide individual lots inside one large task.
6. **Owner and due state:** The owner defaults to `Equipe do turno`. Acting on a task assigns the local collaborator label. Due copy is `Agora`, `Ainda no turno`, `Hoje`, or `Rever em {janela}`; overdue tasks remain fixed at the top with explicit `Atrasada`.
7. **Resolution panel:** Resolution options are concrete and compatible with the risk: `Retirar agora`, `Registrar perda`, `Conferir presença`, `Pedir rebaixa`, `Marcar como não encontrado`, `Registrar como provavelmente esgotado`, or `Mover lote`. Disabled or incompatible options remain visible only when they help explain the correct path.
8. **Incompatible action block:** If a person chooses an action that cannot close the risk, the UI blocks it inline, explains why, and suggests the correct action. Example: `Este lote está vencido. Para proteger a área de venda, retire ou registre perda.`
9. **Reinforced confirmation:** Withdrawal, loss, not found, probably sold out, and critical recheck completion use a confirmation sheet with product, lot, location, quantity, chosen action, and consequence. The primary confirmation label names the outcome, not a generic save.
10. **Expired sales-area loop:** A lot expired in `Área de venda` requires withdrawal/loss with destination `Retirada/perda`, then creates a short `Reconferir área de venda` task. The safety header cannot return to safe until this recheck is complete.
11. **Evidence prompt:** Recheck asks for `Registrar foto da área` when possible. If unavailable, the person must choose or type a reason such as `Câmera indisponível`, `Sem autorização de foto` or `Ambiente sem permissão`. Phase 4 records the UX/contract expectation without implementing R2, sync, or full audit storage.
12. **Empty state:** When no actionable task exists, the screen confirms safety and offers `Registrar lote` and `Conferir lotes recentes` as next actions.

### States and feedback

- Loading uses skeleton task rows and keeps the header area stable; do not replace the screen with an isolated spinner.
- Refresh failure keeps the last task list visible and shows the solution path: `Não foi possível atualizar agora. Confira a conexão e tente novamente.`
- Task completion shows a short confirmation naming product, lot, location, action, time, and whether a recheck was created.
- State transitions use 150-200 ms color/opacity feedback for selection, completion, and blocking. With reduced motion, state changes are immediate.

---

## Copywriting Contract

All visible copy is Portuguese-BR, direct, operational, and non-blaming. Use verbs that name the shelf outcome; never use `Salvar`, `Enviar`, `OK`, or `Cancelar` as a primary action.

| Element | Copy |
|---------|------|
| Screen title | `Hoje` |
| Safe header | `Área de venda segura` |
| Safe with work header | `Área de venda segura, ainda há tarefas do turno` |
| Critical header | `Área de venda com {n} risco(s) agora` |
| Primary critical CTA | `Retirar agora` |
| Presence CTA | `Conferir agora` |
| Markdown CTA | `Pedir rebaixa` |
| Follow-up CTA | `Rever em {janela}` |
| Refresh action | `Atualizar tarefas` |
| Empty state heading | `Área de venda segura agora` |
| Empty state body | `Nenhum lote exige ação neste momento. Você pode registrar um lote novo ou conferir os recentes.` |
| Generic task open action | `Abrir tarefa` |
| Incompatible action error | `Esta ação não resolve este risco. Escolha a ação indicada para manter a área de venda segura.` |
| Expired action error | `Este lote está vencido. Para proteger a área de venda, retire ou registre perda.` |
| Refresh error | `Não foi possível atualizar agora. Confira a conexão e tente novamente.` |
| Completion feedback | `{ação} registrada para {produto} - lote {lote} às {horário}.` |
| Recheck created feedback | `Retirada registrada. Reconferir a área de venda antes de marcar como segura.` |
| Evidence prompt | `Registre uma foto da área ou informe por que a foto não foi possível.` |
| No-photo reason label | `Motivo sem foto` |
| Destructive confirmation: withdrawal | `Confirmar retirada de {produto} - lote {lote} de {local} para Retirada/perda?` |
| Destructive confirmation: loss | `Confirmar perda de {produto} - lote {lote}, quantidade {quantidade}?` |
| Reinforced confirmation: not found | `Marcar {produto} - lote {lote} como não encontrado em {local}? A presença continuará em acompanhamento.` |
| Reinforced confirmation: probably sold out | `Registrar {produto} - lote {lote} como provavelmente esgotado em {local}? A presença continuará em acompanhamento.` |
| Recheck confirmation | `Confirmar reconferência da área de venda para {produto} - lote {lote}?` |

Secondary dismissal copy is `Voltar e revisar`. It tells the person what will happen and should replace generic dismissal labels.

---

## Accessibility and Responsive Contract

- Meet WCAG 2.2 AA contrast, visible focus, accessible names, and logical screen-reader order.
- Every primary target is at least 48 x 48 dp. Icon-only task actions are not allowed.
- Risk, delay, success, and blocked action combine text, structure, and color; color alone never distinguishes `vencido`, `crítico`, `rebaixa`, `incerto`, or `atrasada`.
- The safety verdict is announced before the task list. A completed task announces both the action and whether a recheck remains.
- The layout is mobile-first for narrow phones and remains a single focused task column on larger widths. Do not turn "Hoje" into a desktop-style dashboard in this phase.
- Support system font scaling without clipping essential labels. Long product names, lot identifiers, locations, and confirmation copy must wrap.
- Use fictitious product/store data in tests, docs, and screenshots. No real operational records, photos, or private evidence assets may enter the public repository.

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

**Approval:** approved 2026-06-19
