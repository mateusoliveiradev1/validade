---
phase: 13
slug: web-operational-navigation-and-readiness-surfaces
status: approved
shadcn_initialized: true
preset: radix-nova neutral, preset code b2fA
created: 2026-06-28T22:29:07.7468217-03:00
reviewed_at: 2026-06-28T22:29:07.7468217-03:00
---

# Phase 13 - UI Design Contract

> Visual and interaction contract for splitting the web leadership surface into Operacao, Aparelhos, Atualizacoes, and Validacao without weakening central truth or public-safe rollout boundaries.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn v4 configured in `apps/web/components.json` |
| Preset | `radix-nova`, neutral base, preset code `b2fA` |
| Component library | shadcn/Radix primitives already installed: alert-dialog, badge, button, dropdown-menu, input, select, sheet, skeleton, table |
| Icon library | lucide-react |
| Font | Geist Variable via `@fontsource-variable/geist` and `--font-sans` |

Existing tokens in `apps/web/src/index.css` are canonical for this phase. Do not introduce a new palette, display font, or component vocabulary. The interface remains a dense operational tool, not a marketing dashboard.

---

## Spacing Scale

Declared values (must be multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, compact badge gaps, inline metadata separators |
| sm | 8px | Tight groups inside list rows, badge wraps, helper copy gaps |
| md | 16px | Default panel padding, route content gaps, mobile content padding |
| lg | 24px | Section rhythm between major operational panels |
| xl | 32px | Desktop page gutters and shell-to-content breathing room |
| 2xl | 48px | Major route separation when validation/update content follows the focal panel |
| 3xl | 64px | Reserved for rare page-level breaks; avoid inside dense tool panels |

Exceptions: none for spacing tokens. Existing Button dimensions such as `h-10`, `h-11`, `size-11`, and `min-h-12` remain component dimensions for touch and click targets, not spacing tokens.

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 | 1.5 |
| Label | 14px | 600 | 1.43 |
| Heading | 20px | 600 | 1.2 |
| Display | 28px | 600 | 1.21 |

Use only weights 400 and 600. Badge and compact component text inherit the existing component styles; do not create a new page-level type role for them. Keep line length at or below 75ch for explanatory copy.

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `--background` `oklch(0.972 0.011 145)` | App background, route canvas, safe whitespace around operational surfaces |
| Secondary (30%) | `--card`, `--sidebar`, `--muted` | Panels, side menu, compact status strips, grouped route sections |
| Accent (10%) | `--primary` `oklch(0.415 0.126 149)` | Primary CTA, active route, focus ring, section kicker only when it names the current route purpose |
| Destructive | `--destructive` `oklch(0.43 0.16 31)` | Critical blockers, destructive or unsafe state labels, failed update/push/device states |

Accent reserved for: active side-menu route, the primary route CTA, focus-visible ring, `Atualizar agora`, `Abrir Aparelhos`, and route kicker labels where the label anchors the current operational context. Do not use accent for every link, every badge, decorative charts, or inactive route chrome.

Semantic state vocabulary stays shared:

| State | Token/Tone | Use |
|-------|------------|-----|
| Apto / safe | `Badge tone="success"` / `--accent` | Ready devices, passed validation steps, confirmed current build |
| Atencao / needs_review | `Badge tone="warning"` / warning tokens | Attention devices, stale build, external proof pending, local-only push |
| Bloqueado / blocked | `Badge tone="critical"` / critical and destructive tokens | Missing central read, invalid authorization, incompatible build, unsafe shift close |
| Neutral | `Badge tone="neutral"` / muted tokens | Historical rows, unavailable but non-blocking metadata |

---

## Visual Hierarchy

Primary screen focal point: Operacao opens with the sales-area verdict. The first scan must answer `area de venda segura agora?` before any device, build, UAT, or rollout diagnostic detail.

Route hierarchy:

| Route | Focal Point | Secondary Content | Must Not Show First |
|-------|-------------|-------------------|---------------------|
| Operacao | Sales-area verdict, central freshness, current blockers, `Por que venceu`, and next operational action | Compact device-readiness strip with Aptos, Atencao, Bloqueados, and link to Aparelhos | UAT checklist, detailed push-test timeline, build artifact instructions, full pilot blocker matrix |
| Aparelhos | Readiness-ordered list: Bloqueado, Atencao, Apto | Last central read, last sync, push/camera state, build compatibility summary, per-device safe push test | APK/QR install instructions except a link to Atualizacoes |
| Atualizacoes | Approved build versus installed versions by device | Stale/incompatible device grouping, manual update path, safe QR/APK state when configured | Push-test action, UAT pass/fail controls |
| Validacao | Go/No-Go verdict: Go, No-Go, or Aguardando prova externa | Loja 18 checklist, external gates, sanitized evidence references, next actions | Daily operation tasks duplicated from Operacao |

Shell hierarchy:
- Durable side-menu order is `Operacao -> Aparelhos -> Atualizacoes -> Validacao`, followed by existing access/audit surfaces where allowed.
- Navigation uses icon plus text labels. Icon-only actions are allowed only for the mobile menu and close action, both with `aria-label`.
- Disabled routes must state the capability reason or route the user to the first allowed surface.
- Mobile uses the existing sheet navigation pattern; no custom drawer or tab bar for this phase.

---

## Interaction Contract

### Operacao
- Primary route label: `Operacao`.
- Primary CTA: `Atualizar agora`.
- Device strip CTA: `Abrir Aparelhos`.
- Device strip copy: `Aparelhos: {apto} aptos, {atencao} em atencao, {bloqueado} bloqueados`.
- Device strip must remain compact when all devices are Apto and promote only operational blockers that affect daily execution: missing central read, critical sync stuck, invalid store/user authorization, or unsafe shift close.
- Detailed UAT/build/push history is not rendered in the first Operacao flow.

### Aparelhos
- Primary route label: `Aparelhos`.
- Primary CTA for a selected eligible device: `Enviar teste seguro`.
- Disabled push-test copy: `Teste seguro exige aparelho autorizado, loja confirmada e leitura central recente.`
- Every device row shows verdict, cause, next action, last central read, last sync, push state, camera state, build compatibility, and masked device id.
- Safe push test remains diagnostic only. Copy must say it does not resolve task, does not prove area segura, and validates only the reminder channel.

### Atualizacoes
- Primary route label: `Atualizacoes`.
- Primary CTA when a public-safe path exists: `Abrir atualizacao segura`.
- Fallback CTA when no safe link/QR exists: `Ver instrucoes manuais`.
- Build truth hierarchy: approved artifact, approved app version/build, installed app version/build by device, compatibility state, and next action.
- If a configured APK/QR path would expose token, private URL, build URL, or secret, do not render it. Show blocked/pending status and manual instructions instead.

### Validacao
- Primary route label: `Validacao`.
- Primary CTA: `Registrar status da validacao`.
- Verdict labels: `Go`, `No-Go`, `Aguardando prova externa`.
- Checklist rows keep pass, blocked, and external-blocked states public-safe. Evidence is label-only: safe status, timestamp, masked device reference, and safe evidence reference label.
- Validacao references actions in other routes instead of duplicating them: push in Aparelhos, update/build in Atualizacoes, daily safety in Operacao.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | Abrir Aparelhos |
| Empty state heading | Nenhum aparelho aprovado apareceu nesta loja |
| Empty state body | Entre no APK de staging com convite ativo, abra Preparar turno e volte aqui para validar a leitura central. |
| Error state | Nao foi possivel atualizar a leitura da loja. Tente atualizar agora; se continuar, use a ultima leitura visivel como pendente, nunca como area segura. |
| Destructive confirmation | None for this phase. Phase 13 must not add destructive actions. Sign-out and existing access removals keep their current confirmations outside this contract. |

Copy rules:
- Use direct PT-BR operational language without blame.
- Prefer `Agora:` for next action and `Causa:` for why a blocker exists.
- Do not claim live presence from foreground, sync, or central-read timestamps.
- Do not call provider push accepted a task execution proof.
- Do not expose real product names, real photos, tokens, private URLs, raw device ids, or build URLs.

---

## Component Contract

| Component/Pattern | Contract |
|-------------------|----------|
| `AppShell` navigation | Extend `AppRoute`; keep side menu and mobile `Sheet`; disabled routes are capability-gated and explain why. |
| `Button` | Use existing variants and sizes. Primary actions use `default`; diagnostic or secondary route actions use `outline`; disabled actions include title/help text. |
| `Badge` | Keep tones `success`, `warning`, `critical`, `neutral` for readiness and validation. Do not introduce decorative badge colors. |
| Panels | Use `rounded-lg border border-border bg-card p-4` for route panels. Avoid nested panel cards except repeated device/checklist rows. |
| Lists | Prefer dense bordered rows for devices, checklist steps, blockers, and installed versions. Sort by operational urgency, not insertion order. |
| Skeleton/error | Use existing `Skeleton` for loading and critical-surface alert for refresh failures. |
| Tables | Use only when comparing many devices/builds; otherwise use responsive row lists for mobile readability. |

---

## Responsive and Accessibility Contract

- Desktop keeps the existing fixed side menu and max content width of `1440px`.
- Mobile keeps content in a single column and uses the shell `Sheet` for route navigation.
- Touch and click targets stay at least the existing button dimensions; do not shrink icon controls below the existing icon button size.
- Status never depends on color only: every state combines label, tone, and copy.
- Focus-visible ring uses `--ring`; every route action must be keyboard reachable.
- `aria-current="page"` marks the active route.
- Error regions use `role="alert"` when they describe a failed refresh or blocked action.
- Live refresh timestamp may use `aria-live="polite"`; do not announce every passive background refresh as an urgent alert.
- Respect `prefers-reduced-motion`; use state transitions only, no page-load choreography.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | alert-dialog, badge, button, dropdown-menu, input, select, sheet, skeleton, table | not required; installed components confirmed by `npx.cmd shadcn info` in `apps/web` on 2026-06-28 |
| none | none | no third-party registries configured in `apps/web/components.json` |

No third-party registry blocks are approved for this phase. If execution needs a new block, it must use shadcn official or run `npx.cmd shadcn view` and record a new safety gate before adoption.

---

## Source Decisions Covered

| Decision | UI Contract Coverage |
|----------|----------------------|
| D-01..D-04 | Operacao owns daily first scan; device details, UAT, update, and rollout diagnostics move to dedicated routes. |
| D-05..D-08 | Durable side-menu route order and fail-closed navigation are locked. |
| D-09..D-13 | Aparelhos owns readiness order, per-device cause/next action, and safe push test. Atualizacoes owns update/build instructions. |
| D-14..D-18 | Validacao owns Go/No-Go, Loja 18 checklist, external gates, sanitized evidence, and cross-route references. |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-06-28
