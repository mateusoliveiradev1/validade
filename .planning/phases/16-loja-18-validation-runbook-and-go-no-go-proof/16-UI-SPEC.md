---
status: approved
phase: 16
phase_name: loja-18-validation-runbook-and-go-no-go-proof
approved_by: codex
approved_at: 2026-07-01
scope: web
design_system: shadcn-radix-nova-existing
registry_code: b2fA
---

# Phase 16 UI Spec - Loja 18 Validation Runbook and Go/No-Go Proof

## Summary

Phase 16 makes the `Validacao` route the guided proof surface for the Loja 18 pilot. It must turn the agreed runbook into an ordered, evidence-led sequence that can only advance from real central proof, an actionable blocker, or an honest external blocker.

The UI must not create a separate mobile validation mode. Mobile continues to use the real operational flows. The web route consolidates proof, explains why the store is or is not ready, and points the operator to `Aparelhos`, `Atualizacoes`, `Operacao`, or physical execution when something is missing.

## User And Job

- Primary user: operational lead or pilot reviewer preparing the Loja 18 Go/No-Go decision.
- Secondary user: technical/operator support person checking why the runbook is pending or blocked.
- Job: answer "Can Loja 18 go live now?" with direct proof, current blockers, and the next action required.
- Environment: desktop or tablet at the store/back office, with occasional mobile cross-checks on the real app.

## Screen Contract

Route: `Command Center > Validacao`

Primary screen structure:

1. Page header
   - Kicker: `Validacao Loja 18`
   - Title: `Validacao`
   - Supporting copy: `Prove o Go/No-Go com fatos centrais, bloqueios atuais e evidencia publica segura.`
   - Primary action: `Atualizar prova da validacao`
2. Verdict band
   - Main focal point of the page.
   - Shows exactly one verdict: `Go`, `No-Go`, or `Aguardando prova externa`.
   - Shows the reason in one sentence and the next action in one sentence.
3. Required runbook sequence
   - Ordered list of the nine required steps.
   - Each step is stable-height, scan-friendly, and cannot be manually marked as passed.
4. External gates and blockers
   - Shows critical, warning, and external blockers with owner route and next action.
5. Device evidence
   - Shows approved device proof and second-device proof using masked references only.
6. Route owner shortcuts
   - Buttons point to `Aparelhos`, `Atualizacoes`, and `Operacao`.

No modal, drawer, inline form, or checkbox may create a passed validation result. If manual notes are added later, they must be labelled as notes only and never as source-of-truth proof.

## Mandatory Runbook Sequence

The UI presents the runbook in this exact order:

1. `prepare_turn` - Turno preparado
2. `product_real_input` - Produto real usado no teste
3. `lot_registration` - Lote real registrado
4. `terminal_resolution` - Resolucao terminal registrada
5. `second_device_convergence` - Segundo aparelho conferiu os mesmos fatos
6. `command_center_consistency` - Command Center consistente
7. `safe_push_test` - Push seguro recebido no aparelho aprovado
8. `camera_evidence_or_fallback` - Camera ou fallback operacional comprovado
9. `shift_close` - Fechamento seguro do turno

Each row must show:

- Step label.
- State badge.
- Owner route or physical owner.
- Current cause, when pending or blocked.
- Next action.
- Public-safe evidence label.
- Last event timestamp.
- Masked device or generic role, when the proof came from a device or person.

Step state meanings:

- `passed`: central proof exists. This state cannot come from a manual checkbox.
- `pending`: waiting for a central fact or store action.
- `blocked`: actionable blocker exists and must point to the route/action that can resolve it.
- `external_blocked`: proof is missing from a provider, device, APK, camera, or other external path; the UI must not imply the operator already failed the runbook.

## Verdict Contract

Verdict labels and rules:

- `Go`: every runbook step passed, all required devices are apt, the approved APK/build is current, second-device proof exists, safe push proof exists, safe shift close is confirmed, and no critical or external blocker remains.
- `No-Go`: an actionable critical blocker exists. The page must lead with the blocker and the route/action that resolves it.
- `Aguardando prova externa`: no actionable critical blocker remains, but real evidence is still missing or pending. The page must say which proof is missing and where to get it.

Verdict copy pattern:

- Not ready: `Ainda nao e Go porque falta prova X. Faca Y em Z.`
- Critical blocker: `No-Go: X impede a validacao. Corrija em Z antes de continuar.`
- Go: `Go confirmado para Loja 18 com prova central completa e fechamento seguro.`

The verdict band is not a dashboard summary. It is a decision surface. It should be visually stronger than the sections below, but still use the existing restrained operational tone.

## Route Ownership Contract

`Validacao` consolidates proof and points to the owner route. It must not duplicate the operational detail owned elsewhere.

- `Aparelhos`: device authorization, masked device identity, push receipt on approved device, camera readiness, second-device proof.
- `Atualizacoes`: approved APK installed proof, app version/build readiness, update blocker, external build/download blocker.
- `Operacao`: central facts from product, lot, task, resolution, sync state, and shift close.
- Physical execution: action that must happen in the store before central proof can exist.

Route shortcut buttons:

- `Abrir Aparelhos`
- `Abrir Atualizacoes`
- `Abrir Operacao`

These shortcuts appear near the related blocker and again in the route owner section when useful. They must not be styled as large marketing cards.

## Public-Safe Evidence Contract

The UI can show only sanitized proof. It must never reveal:

- Real product names.
- Readable lot IDs.
- Photos or thumbnails from the store.
- Push tokens, secret values, private links, or provider request payloads.
- Raw device IDs.
- Phone numbers, emails, CPF, or personal names.

Allowed evidence labels:

- `Produto real confirmado`
- `Lote real confirmado`
- `Resolucao terminal confirmada`
- `Aparelho Loja 18 #1`
- `Aparelho Loja 18 #2`
- `Push seguro confirmado`
- `Camera indisponivel com fallback registrado`
- `Fechamento seguro confirmado`
- `Lideranca Loja 18`
- `Operacao Loja 18`

If evidence is rejected for privacy, the UI shows:

- State: `Pendente`
- Cause: `Evidencia contem dado sensivel`
- Next action: `Registre uma evidencia sanitizada em Operacao`

## Empty, Loading, Error, And Stale States

Loading:

- Header and verdict band stay mounted.
- Sections use existing skeleton components.
- Copy: `Atualizando prova da validacao...`

Empty:

- Heading: `Nenhuma prova central encontrada`
- Body: `Comece pela operacao real em Loja 18. A validacao aparece aqui quando produto, lote, tarefa ou aparelho enviarem prova central.`
- Action: `Abrir Operacao`

Fetch error:

- Heading: `Nao foi possivel atualizar a validacao`
- Body: `Use a ultima leitura apenas como pendente e tente atualizar novamente antes de decidir Go/No-Go.`
- Actions: `Tentar atualizar novamente`, `Abrir Operacao`

Stale proof:

- Badge: `Leitura antiga`
- Body: `A prova existe, mas esta fora da janela aceita para decidir o Go/No-Go. Atualize a validacao antes de continuar.`

No state may use generic confirmation or form-submission labels. Every action must name the specific operation.

## Component Contract

Use only the existing web design system:

- shadcn v4 configured in `apps/web/components.json`.
- Registry preset `radix-nova`.
- Neutral base color and existing CSS tokens in `apps/web/src/index.css`.
- Existing components: `Button`, `Badge`, `Table`, `AlertDialog`, `DropdownMenu`, `Input`, `Select`, `Sheet`, `Skeleton`.
- Existing icon library: `lucide-react`.

Allowed component additions:

- Small composition components inside the command center feature, such as `ValidationVerdictBand`, `RunbookStepRow`, or `EvidenceLabel`.
- No new registry, component kit, charting library, animation library, or marketing-style hero component.

Visual structure:

- The verdict band is a full-width section inside the content column.
- The runbook sequence uses a table or list rows, not nested cards.
- Blockers use compact rows with severity badges.
- Device evidence uses a compact list with masked references.
- Route shortcuts use normal buttons with icons.

## Visual Design System

Color:

- 60% base: `--background`, `--card`, `--sidebar`, `--muted`.
- 30% structure: `--border`, `--foreground`, `--muted-foreground`.
- 10% semantic emphasis: `--primary`, `--destructive`, and existing badge tones.
- Green/accent is reserved for confirmed proof and final `Go`.
- Red/destructive is reserved for `No-Go` and actionable critical blockers.
- Warning/external tone is reserved for `Aguardando prova externa`, stale proof, and external blockers.

Typography:

- Display: 28px, weight 600, line-height 1.21.
- Heading: 20px, weight 600, line-height 1.2.
- Body: 16px, weight 400, line-height 1.5.
- Label: 14px, weight 600, line-height 1.43.

Spacing:

- Use only the established scale: 4, 8, 16, 24, 32, 48, 64.
- Row density should support scanning nine steps without hiding the verdict.
- Do not scale font size with viewport width.
- Letter spacing stays 0.

Motion:

- No decorative motion.
- Refresh and state changes may use restrained opacity/position transitions only when they respect reduced motion.

## Responsive Contract

Desktop:

- Left navigation remains stable through `AppShell`.
- Header, verdict, runbook, blockers, device proof, and route owner sections remain visible in one vertical flow.
- The runbook can use table columns when at least 960px wide.

Tablet:

- The sequence remains a single vertical flow.
- Secondary columns collapse under the step title.

Mobile-width web:

- The side navigation uses the existing sheet behavior.
- Runbook rows become compact stacked rows.
- Buttons can wrap, but text must remain inside each button.
- No horizontal scrolling for verdict copy, cause, next action, or evidence labels.

## Accessibility Contract

- Every state badge has text, not color alone.
- Verdict changes are announced through the existing page update flow or an `aria-live="polite"` region.
- Focus order follows page order: header action, verdict action, runbook rows, blockers, devices, route shortcuts.
- Route shortcut buttons use icon plus text.
- Interactive targets remain at least 44px tall.
- Critical blocker copy is plain language, not code or enum text.

## Acceptance Criteria

- `Validacao` shows the nine-step Loja 18 runbook in the required order.
- No UI control can manually mark a step or verdict as passed.
- `Go`, `No-Go`, and `Aguardando prova externa` each have direct copy, reason, and next action.
- Every pending, blocked, or external-blocked row points to an owner route or physical action.
- Evidence shown in the route is public-safe and masked.
- Device proof distinguishes approved device proof from second-device proof.
- External build, push, camera, and provider gaps fail closed to pending or external blocker.
- The route uses existing shadcn/radix-nova components and project tokens only.
- The UI remains usable at desktop, tablet, and mobile-width web breakpoints.

## Source Decisions Covered

- D-01: required guided sequence.
- D-02: web `Validacao` owns the validation sequence; mobile uses real flows.
- D-03: no manual passed source of truth.
- D-04: fail closed to pending, blocked, or external blocker.
- D-05 to D-08: public-safe evidence only.
- D-09: approved APK install proof requires real device readiness.
- D-10: remote push requires safe physical receipt proof.
- D-11: second-device proof reads the same central fact set.
- D-12: physical Loja 18 UAT passes only with required gates.
- D-13 to D-15: Go, No-Go, and external-proof verdict rules.
- D-16: direct next-step-oriented copy.

## Checker Sign-Off

Status: approved

- Product fit: pass. The route is operational proof, not a decorative dashboard.
- Copywriting: pass. Actions are specific and next-step oriented.
- Visual hierarchy: pass. Verdict is the focal point, followed by ordered proof.
- Design system: pass. Uses existing shadcn/radix-nova tokens and components only.
- Accessibility: pass. States are text-labelled, focus order is predictable, and targets remain usable.
- Privacy: pass. Evidence contract forbids real product, lot, photo, token, private URL, raw device ID, and personal data.
