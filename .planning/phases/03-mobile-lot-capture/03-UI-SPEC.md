---
phase: 3
slug: mobile-lot-capture
status: approved
shadcn_initialized: false
preset: none
created: 2026-06-19
reviewed_at: 2026-06-19T13:03:57-03:00
---

# Phase 3 — UI Design Contract

> Visual and interaction contract for the first mobile flow that captures products, lots, and physical observations. It serves the operational task in the aisle; it is not a dashboard.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | None — native React Native tokens and primitives for this first mobile slice |
| Preset | Not applicable; shadcn targets web React and is not introduced for the Expo mobile flow |
| Component library | None — use React Native primitives behind small local feature components |
| Icon library | None required in this phase; an icon may reinforce a labeled action but must never be its only name |
| Font | Platform system sans (`System` on iOS; `Roboto` on Android) |

Do not introduce a cross-platform component kit, custom font, decorative illustration, or a card-grid dashboard in this phase. The first reusable vocabulary is intentionally small: `ScreenHeader`, `PrimaryAction`, `SecondaryAction`, `Field`, `SelectionRow`, `StatusNotice`, `RecentLotRow`, and `ConfirmationSheet`.

---

## Spacing Scale

Declared values (must be multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon-to-label gap; helper-text offset |
| sm | 8px | Compact gaps inside fields and rows |
| md | 16px | Default screen gutter and stacked-control gap |
| lg | 24px | Separation between form groups and list sections |
| xl | 32px | Start/end breathing room for a screen section |
| 2xl | 48px | Minimum primary touch target height; major action separation |
| 3xl | 64px | Reserved only for a major empty-state break |

Exceptions: none. A mobile screen uses 16px horizontal padding, respects safe-area insets, and avoids nested cards. Related form fields are grouped by spacing and headings instead of decorative containers.

---

## Typography

Only these four sizes and two weights are permitted in the Phase 3 mobile UI.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Label / helper / metadata | 14px | 400 or 600 | 1.35 |
| Body / field value / primary button | 16px | 400 or 600 | 1.5 |
| Screen heading / product identity | 20px | 600 | 1.25 |
| Confirmation heading / empty-state heading | 28px | 600 | 1.2 |

Labels, action names, dates, quantities, and state copy use the platform font without condensed, all-caps, or display treatments. Product and lot identity can wrap to two lines; no critical label may truncate. Long dates use a readable full-date preview beneath the guided input.

---

## Color

The product uses a restrained 60/30/10 distribution. Contrast is verified for core pairs: ink on dominant is 15.65:1; on-primary is 7.02:1; white on critical is 6.57:1.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#F5F7EF` | Screen background and quiet empty-state surface |
| Secondary (30%) | `#E6EEE4` | Grouped form surfaces, search/filter rail, selected-row background |
| Ink | `#112016` | Headings, body text, and persistent field labels |
| Muted ink | `#3F5546` | Supporting metadata only; never the sole carrier of status |
| Accent (10%) | `#166534` | Filled primary action, active flow step, selected location, keyboard/focus ring |
| Critical / destructive semantic | `#B42318` | Expired or critical state, destructive confirmation, and destructive-action label only |

Accent reserved for: the single next action on a screen (`Registrar lote`, `Confirmar produto`, or `Registrar observação`), the active step, the selected current location, and a visible focus indicator. It must not color every button, icon, tag, or clickable row.

Every status combines plain-language text with an icon or structural treatment; color alone never distinguishes `cadastro pendente`, `presença incerta`, `crítico`, or `vencido`. Secondary actions use outline or text treatment in ink, not a competing accent fill.

---

## Visual Hierarchy and Mobile Interaction

### Primary focal point

The primary focal point is always the operational action currently needed, placed after the screen title and kept reachable near the bottom safe area:

- On the recent list, it is the persistent `Registrar lote` action.
- In discovery, it is the confirmed product identity followed by `Confirmar produto`.
- In lot capture, it is the summary of required fields followed by `Registrar lote`.
- In a lot detail, it is `Registrar observação`, preceded by the current product, lot, location, and attention state.

The hierarchy is: **next action → product and lot identity → required decision or field → operational context → supporting metadata**. Do not start with metrics, analytics, a task inbox, or a multi-card summary.

### Screen and flow contract

1. **Recent operational list:** initial view after registration. Show product, lot, latest action, location, timestamp, approximate quantity, plus a concise attention label only when it needs care. Search accepts product name, code/GTIN, or lot code; location filter narrows the same list. A row is a full-width, labeled touch target; touching it opens the compact detail.
2. **Product discovery:** manual name/code search is the default and works without camera permission. `Ler código` is a secondary, explicitly initiated option. Discovery also exposes `Recentes`, `Frequentes`, and `Por categoria` as supporting shortcuts, never as a replacement for search. Scan results only fill the lookup field; the next screen presents a confirmation card with product, category, and operational profile before a lot form can open. The category supplies the default operational profile; a different product profile is an explicit, labeled override. When no product matches, `Cadastrar produto` opens the minimum product form and returns to capture. Name, category, and profile are required; absent supplier or GTIN remains visibly marked `Fornecedor pendente` or `GTIN pendente`, not silently omitted.
3. **Lot registration:** fields appear in the order the work is done: confirmed product, lot identification, quantity, initial location, then only the dates required by `formal_validity`, `flv_inspection`, or `receiving_monitored`. The location selector offers, in this order, `Área de venda`, `Estoque`, `Câmara fria`, `Ilha promocional`, and `Retirada/perda`; `Outro local` opens a required, descriptive location-name field. Guided entry must validate format as the person types and show a full-date/operational-window preview before submission. A missing printed lot code offers `Gerar identificação interna`, clearly labeled as internal rather than a supplier code.
4. **Success and repeat:** after saving, show a short, non-blocking confirmation naming the product, lot, location, and time. Offer `Registrar outro lote` while retaining only product, category, and profile. Lot code, dates, quantity, and location always require fresh confirmation.
5. **Physical observation:** begins by selecting the observed action: `Confirmar presença`, `Mover lote`, `Retirar lote`, `Registrar perda`, `Marcar como não encontrado`, or `Registrar como provavelmente esgotado`. Request only action-relevant fields. Last quantity may be prefilled but must be explicitly confirmed or replaced; `Não foi possível estimar` preserves uncertainty.
6. **Reinforced outcomes and corrections:** withdrawal, loss, not found, and probably sold out open a confirmation sheet with product, lot, action, location, and quantity/uncertainty before the final action. A correction appends an observation and requires `Motivo da correção`; it never visually suggests the old record was overwritten.

### States and feedback

- Required-field errors appear below the field in plain language and are announced accessibly; the primary action remains disabled until all required conditions are valid, except that the app explains what is missing rather than silently blocking.
- Camera permission request explains that manual search remains available. Denied, unavailable, and scan-failure paths immediately return to manual search with `Buscar manualmente`.
- A loading state uses a short skeleton for recent rows or a disabled button with its action label retained; never replace the task with an isolated spinner.
- Transitions are limited to 150–200 ms opacity/color feedback for selection, validation, and save confirmation. With reduced motion enabled, state changes are immediate.

---

## Copywriting Contract

All visible copy is Portuguese-BR, direct, and operational. Use verbs that name the outcome; never use `Salvar`, `Enviar`, `OK`, or `Cancelar` as a primary action.

| Element | Copy |
|---------|------|
| Recent-list primary CTA | `Registrar lote` |
| Product-confirmation CTA | `Confirmar produto` |
| Observation CTA | `Registrar observação` |
| Camera fallback | `Buscar manualmente` |
| Empty state heading | `Ainda não há lotes registrados` |
| Empty state body | `Registre o primeiro lote para acompanhar sua presença física por local.` |
| Required-field error | `Informe {campo} para registrar este lote.` |
| Camera error | `Não foi possível usar a câmera. Você pode buscar o produto por nome ou código.` |
| Save error | `Não foi possível registrar este lote neste aparelho. Revise os campos destacados e tente novamente.` |
| Success feedback | `Lote registrado em {local} às {horário}.` |
| Destructive confirmation: withdrawal | `Confirmar retirada de {produto} — lote {lote} de {local}, quantidade {quantidade}?` |
| Destructive confirmation: loss | `Confirmar perda de {produto} — lote {lote}, quantidade {quantidade}?` |
| Reinforced confirmation: not found | `Marcar {produto} — lote {lote} como não encontrado em {local}? A presença ficará incerta.` |
| Reinforced confirmation: probably sold out | `Registrar {produto} — lote {lote} como provavelmente esgotado em {local}? Confirme a quantidade ou a incerteza.` |

The secondary dismissal label is `Voltar e revisar`, because it tells the person what will happen. Do not present a generic dismissal button.

---

## Accessibility and Responsive Contract

- Meet WCAG 2.2 AA contrast, visible focus, accessible names, and logical screen-reader order.
- Every primary target is at least 48 × 48 dp; icon-only affordances are avoided. If an icon is later added, it must have an accessible label and a visible text fallback on the same action.
- Forms expose labels, required state, inline error, and current value. Dates and locations are not conveyed only with placeholders.
- The layout is mobile-first for narrow phones; on larger widths it retains a single focused capture column rather than becoming a dashboard. Recent rows may gain horizontal room for metadata, but their order and action placement stay stable.
- Support system font scaling without clipping essential labels. Long product names, lot identifiers, locations, and confirmation copy must wrap.
- Do not render real operational records in fixtures, documentation, or screenshots; examples remain clearly fictitious.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | None — not applicable to the Expo native implementation | Not required |
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
