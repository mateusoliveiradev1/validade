---
phase: 11
slug: mobile-visual-polish-and-emulator-validation
status: draft
shadcn_initialized: true
preset: b2fA
created: 2026-06-28
surface: mobile-android-critical-flow
---

# Phase 11 - UI Design Contract

> Visual and interaction contract for Phase 11. This phase polishes the critical Android mobile journey and validates it on an installed emulator/device without weakening the Phase 10 central-truth model.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | Existing React Native capture theme/components for `apps/mobile`; existing shadcn only for out-of-scope `apps/web` continuity |
| Preset | Web shadcn preset `b2fA` retained; not introduced into the Expo native app |
| Component library | Mobile: React Native primitives plus local capture components. Web: existing Radix/shadcn components only if docs or admin context are touched |
| Icon library | Mobile: no icon-only critical actions. Icons may reinforce a status only when paired with visible text and accessible labels |
| Font | Mobile: React Native system sans. Web: existing `Geist Variable` |

Source of truth:

- Mobile tokens: `apps/mobile/src/capture/capture-theme.ts`.
- Mobile primitives: `apps/mobile/src/capture/capture-ui.tsx`.
- Mobile copy: `apps/mobile/src/capture/today-copy.ts` and `apps/mobile/src/capture/capture-copy.ts`.
- Critical screens: `CaptureApp.tsx`, `TodayScreen.tsx`, `ProductDiscoveryScreen.tsx`, `LotRegistrationScreen.tsx`, `LotDetailScreen.tsx`, `TaskResolutionPanel.tsx`, `ShiftCloseScreen.tsx`, `offline-sync-ui.tsx`, and auth/privacy entry surfaces only where needed for Android evidence.
- Approved baseline: Phase 10 UI-SPEC, especially central truth, sync taxonomy, copy restrictions, and the direction `Operacao de risco zero`.

Allowed mobile primitives:

| Primitive | Contract |
|-----------|----------|
| `ScreenHeader` | One clear title plus one concise body line. Avoid duplicate explanatory text below the same block. |
| `PrimaryAction` | One dominant action per decision block, minimum 48dp height, outcome-based label. |
| `SecondaryAction` | Back, retry, review, recent, manual fallback, lower-risk action. Never the only recovery path from an error. |
| `Field` | Search, reason, lot data, unsafe close, and no-photo copy. Every required field has inline error text. |
| `SelectionRow` | Product choice, category choice, terminal option, checklist item, conflict choice. Selected state must use text plus structure, not color alone. |
| `StatusNotice` | Shared notice system for prepare blockers, local, pending central, conflict, stale read, push/provider, camera fallback, error, and resolved proof. |
| `ConfirmationSheet` | Trust-sensitive terminal actions only: retirada, perda, nao encontrado, provavelmente esgotado, discard offline, unsafe close. |

Phase 11 may create a shared mobile status vocabulary or descriptor module, but it must be local, typed, and backed by tests. Do not add a third-party React Native UI kit, shadcn mobile layer, decorative assets, dashboard shell, charts, gamification, real store photos, raw evidence photos, or new visual brand direction.

---

## Spacing Scale

Declared values (must be multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon/text gaps, helper offsets, compact metadata separation |
| sm | 8px | Status chip gaps, row internals, field label gaps |
| md | 16px | Default screen gutter, field stacks, notice padding, task row padding |
| lg | 24px | Decision blocks, major screen sections, status band separation |
| xl | 32px | Empty states, post-submit receipts, bottom breathing room |
| 2xl | 48px | Minimum mobile touch target, primary action zone, stable button height |
| 3xl | 64px | Rare page-level separation only on long receipts or validation-empty states |

Exceptions:

- Existing `12px` internals in `capture-ui.tsx` may remain for input/button padding and date action padding. Do not introduce `12px` as a layout gap.
- Android touch targets must be at least `48dp` high. Icon-adjacent touch targets need `hitSlop` or padding to reach the same effective target.
- Status rows, task rows, notices, and terminal action blocks use radius `6px` or `8px` only. No 24px+ rounded cards.
- Avoid nested cards. A status band may sit inside a screen section, but a card must not contain another card-like surface with its own shadow/border.
- The first viewport of `Hoje` must keep the sales-area verdict, central/local/sync state, and first critical action visible without requiring decorative spacing.

---

## Typography

Only these four sizes and two weights are approved for touched Phase 11 mobile UI.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 | 1.5 |
| Label | 14px | 400 or 600 | 1.43 |
| Heading | 20px | 600 | 1.25 |
| Display | 28px | 600 | 1.2 |

Rules:

- Use only weights `400` and `600`.
- Use fixed sizes. No fluid type, display fonts, condensed labels, or all-caps status labels.
- Existing 12px, 15px, 22px, or one-off font sizes found in touched Phase 11 surfaces must be normalized to the table above unless they are outside the modified scope.
- Long product names, lot identifiers, locations, role/store labels, reasons, and provider/error copy must wrap. Do not truncate text that changes safety, sync, or resolution meaning.
- Button labels stay 16px/600. Metadata and badges stay 14px; never drop below 14px on mobile.

---

## Color

The product remains restrained and operational. Color supports state truth; it is never the only carrier of risk, proof, or action.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#F7F9F6` | App background, prepare-turn canvas, quiet validation and receipt surfaces |
| Secondary (30%) | `#FFFFFF` | Task rows, forms, product choices, notices that need content focus |
| Accent (10%) | `#166534` | Primary actions, focus ring, active selection, prepared/safe state only when domain criteria are true |
| Destructive | `#A1271D` | Destructive or terminal consequence actions only |

Supporting semantic tokens:

| Role | Value | Usage |
|------|-------|-------|
| Ink | `#132018` | Primary text, headings, data, task titles |
| Muted ink | `#3E5547` | Metadata and helper text only; never the sole risk indicator |
| Muted surface | `#EDF3EE` | Quiet status rows, neutral synced transport state, grouped surfaces |
| Pressed surface | `#E2EBE4` | Pressed feedback for secondary surfaces |
| Accent soft | `#DDEDE2` | Selected rows and truly resolved/prepared/safe confirmations only |
| Border | `#BAC8BE` | Default borders and dividers |
| Critical surface | `#FFF0EE` | Conflict, blocker, expired/critical risk, unsafe close, destructive confirmation |
| Critical border | `#E8B5B0` | Critical row or notice border |
| Critical tag | `#F9DAD6` | Compact critical tag inside a larger row |
| Warning surface | `#FFF7E2` | Local, pending central, stale read, draft product, degraded push/camera/provider state |
| Warning border | `#E7D39A` | Warning row or notice border |
| Warning ink | `#5D4505` | Warning text on warning surface |

Accent reserved for: `Preparar turno`, `Baixar leitura central`, `Atualizar leitura central`, `Registrar lote`, `Confirmar produto`, `Criar rascunho operacional`, `Sincronizar pendencias`, `Revisar conflito`, `Confirmar fechamento seguro` only after revalidation/checklist pass, active selection, focus ring, and prepared/safe/resolved seals that are actually true.

Destructive reserved for: `Confirmar retirada`, `Registrar perda`, `Descartar acao offline`, `Encerrar turno com pendencias`, evidence invalidation, access revocation if touched, and any terminal action that requires consequence copy.

State color rules:

| State | Required treatment |
|-------|--------------------|
| `Conflito` | Critical surface, top placement, explicit text, review action. Critical conflicts appear before normal pending/local work. |
| `Bloqueado` | Critical surface near top of the screen, exact blocker, retry or valid fallback. |
| `Critico` | Controlled high-emphasis treatment: critical surface/border/tag plus required action text. Do not paint the full screen red. |
| `Local` | Warning surface near the action/verdict it affects; copy must say it is saved on this device only. |
| `Pendente central` | Warning surface near the action/verdict it affects; copy must say it is not central confirmation. |
| `Sincronizado` | Neutral/muted surface with time and text. It must not use the same green seal as `Resolvido`. |
| `Resolvido` | Accent soft only after operational criteria and central acknowledgement are true. |
| `Seguro` | Accent soft/green only when central read is current, no critical blocker remains, required rechecks are complete, and shift-close criteria pass. |
| Provider/camera unavailable | Warning surface unless the failure blocks the current required action, then critical surface. |

---

## Copywriting Contract

All visible copy is Portuguese-BR, ASCII-normalized in source-facing strings, direct, operational, and truthful. Terms such as `segura`, `confirmado`, `resolvido`, `evidencia enviada`, `turno fechado`, and `sincronizado` must only appear when their domain condition is true.

| Element | Copy |
|---------|------|
| Primary CTA | `Preparar turno` |
| Empty state heading | `Nenhum bloqueio ativo na leitura central` |
| Empty state body | `A leitura central nao encontrou tarefa critica agora. Registre um lote novo ou confira os recentes antes de fechar o turno.` |
| Error state | `Nao foi possivel baixar a leitura central. Confira a conexao e toque em Preparar turno novamente.` |
| Destructive confirmation | `Descartar acao offline`: `Informe o motivo. Esta acao nao sera enviada para a central e a tarefa atual precisa ser revisada.` |

Required copy updates or confirmations:

| Surface | Required copy |
|---------|---------------|
| Prepare title | `Preparar turno` |
| Prepare loading | `Baixando a leitura central da loja...` |
| Prepare blocked offline | `Conecte uma vez para preparar o turno neste aparelho.` |
| Prepare ready | `Pronto para operar com a leitura central.` |
| Prepare stale | `Leitura central pendente. Atualize antes de declarar area segura.` |
| Hoje title | `Hoje` |
| Hoje unsafe verdict | `Area de venda com risco agora` |
| Hoje safe-with-work verdict | `Area sem bloqueio critico, ainda ha tarefas do turno` |
| Hoje empty heading | `Nenhum bloqueio ativo na leitura central` |
| Product search label | `Buscar produto por nome, codigo ou categoria` |
| Product reuse CTA | `Usar este produto` |
| Product draft CTA | `Criar rascunho operacional` |
| Product draft warning | `Produto em rascunho. O lote entra com risco conservador ate a validacao.` |
| Lot CTA | `Registrar lote` |
| Terminal withdrawal CTA | `Confirmar retirada` |
| Terminal loss CTA | `Registrar perda` |
| Not found CTA | `Confirmar nao encontrado` |
| Sold out CTA | `Confirmar provavelmente esgotado` |
| Local saved | `Acao salva neste aparelho. Ainda falta sincronizar para confirmacao central.` |
| Pending central | `Pendente central. Ainda nao use como confirmacao da loja.` |
| Synced not resolved | `Sincronizado com a central. Verifique se ainda existe bloqueio operacional.` |
| Resolved | `Resolvido com criterio operacional e confirmacao central.` |
| Conflict | `Conflito de sincronizacao. Revise antes de confirmar esta acao.` |
| Push provider unavailable | `Alertas remotos ainda precisam do APK Android aprovado. Hoje continua sendo a fonte da verdade.` |
| Camera fallback | `Nao foi possivel usar a camera. Registre sem foto ou use a busca manual quando permitido.` |
| Emulator blocked record | `Android nao validado: nenhum emulador ou aparelho aprovado estava conectado.` |
| Shift close safe CTA | `Encerrar turno com area segura` |
| Shift close unsafe CTA | `Encerrar turno com pendencias` |

Destructive and trust-sensitive actions:

| Action | Confirmation approach |
|--------|-----------------------|
| `Confirmar retirada` | Show product, lot, location, destination `Retirada/perda`, actor, consequence, and required sales-area recheck. |
| `Registrar perda` | Show product, lot, location, reason/destination, actor, evidence/no-photo path, and required sales-area recheck. |
| `Confirmar nao encontrado` | Require guided recheck before resolving; explain that uncertainty remains without valid recheck. |
| `Confirmar provavelmente esgotado` | Require guided recheck and reason; never treat it as sales proof. |
| `Criar rascunho operacional` | Show similar products first, category/rule impact, review requirement, and conservative risk warning. |
| `Descartar acao offline` | Require non-empty reason; state that the local command will not be sent and history remains reviewable. |
| `Encerrar turno com pendencias` | Require reason, continuity owner, deadline, and note; state that the area is not safe. |

Forbidden labels: `OK`, `Salvar`, `Enviar`, `Submit`, `Continuar` without an object, generic `Confirmar`, or any label that hides the physical/business outcome.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | Existing web blocks only: `alert-dialog`, `badge`, `button`, `dropdown-menu`, `input`, `select`, `sheet`, `skeleton`, `table` | `npx.cmd --yes shadcn@latest info` in `apps/web` verified `@shadcn` official registry, preset `b2fA`, and installed components on 2026-06-28 |
| Third-party registries | none | `apps/web/components.json` has `registries: {}`; no third-party blocks declared or approved on 2026-06-28 |
| React Native external UI kits | none | Not approved for Phase 11; use local capture primitives only |

No third-party registry, copied block, remote component snippet, analytics widget, chart kit, icon pack, or network-loaded visual asset is approved for Phase 11. If a future plan declares one, it must run source view/diff review before inclusion and update this table with timestamped evidence.

---

## Mobile Surface Contracts

| Surface | First visual anchor | Required secondary anchor | Phase 11 polish contract |
|---------|---------------------|---------------------------|--------------------------|
| Auth/login/privacy | Account state and privacy-safe access | Route to `Preparar turno` | Must look like part of the same operational app; no marketing hero, no hidden privacy blocker. |
| `Preparar turno` | Readiness verdict or exact blocker | Store/role, read time, pending local commands, first action | Must be the gate before `Hoje`; no empty local success and no bypass into ordinary task mode. |
| `Hoje` | Sales-area verdict | Central/local/sync state directly below verdict, then critical work | First viewport must answer what must happen now and whether central truth is current. |
| Product search/confirmation | Confirm or reuse product before lot | Similar products, category/rule, draft warning | One path for reuse/create; draft must remain conservative and review-needed. |
| Lot registration | Confirmed product plus lot/date/location | Risk preview, local/central save consequence | Form must feel final on Android: aligned fields, clear errors, one primary action, no clipped long labels. |
| Lot detail/terminal resolution | Product, lot, location, required action | Consequence, recheck/evidence/reason, sync expectation | Terminal action cannot hide active risk before valid criteria and central acknowledgement. |
| Sync/conflict | Conflict or pending central state | Affected local action and allowed next choices | Conflict outranks pending/local. Pending remains visible near the action and in queue summary. |
| Push/provider | Reminder status | In-app task remains source of truth | Remote provider state can be warning/degraded; push never implies task execution. |
| Camera/evidence fallback | Permission or no-photo state | Manual/no-photo path when valid | Permission UX and fallback copy must be polished, but real camera proof remains an approved-device gate. |
| Shift close | Central revalidation result | Blockers, checklist, safe/unsafe path | Safe close only after central revalidation and checklist pass; unsafe close requires continuity fields. |

Screen-final criteria:

1. Android legibility under bright store lighting: body text 16px, metadata 14px, contrast AA, no low-contrast gray-on-color text.
2. One clear primary action per decision block.
3. Critical, warning, synced, and resolved states have different text, placement, and surface treatment.
4. Primary actions are thumb-reachable and at least 48dp.
5. Long Portuguese strings wrap without pushing buttons off-screen.
6. The screen does not look like a prototype: no unaligned rows, random spacing, half-polished notices, placeholder copy, or inconsistent button vocabulary.

---

## Status Vocabulary Contract

Phase 11 must consolidate these state meanings across `StatusNotice`, task/status rows, badges, sync queue, terminal panels, and shift close.

| Term | User-facing label | May appear as safe/proven? | Contract |
|------|-------------------|----------------------------|----------|
| Prepare missing | `Preparar turno` / exact blocker | No | Blocks ordinary `Hoje`; explain what is missing and retry path. |
| Local | `Local` or `Acao salva neste aparelho` | No | Warning treatment; saved only on device. |
| Pending central | `Pendente central` | No | Warning treatment; not central confirmation. |
| Syncing | `Sincronizando pendencias` | No | Disable duplicate submit/retry while preserving content. |
| Synced | `Sincronizado com a central` | No, unless paired with resolution criteria | Neutral/muted treatment with timestamp and next verification text. |
| Conflict | `Conflito de sincronizacao` | No | Critical treatment; pin above normal pending/local work. |
| Discarded | `Acao descartada com motivo` | No | Show reason/history and keep current task reviewable. |
| Critical | `Area de venda com risco agora` or task-specific risk copy | No | High-emphasis controlled critical treatment and concrete next action. |
| Resolved | `Resolvido com criterio operacional e confirmacao central` | Yes | Only after central business result and operational criteria pass. |
| Safe close | `Encerrar turno com area segura` | Yes | Only after central revalidation and physical checklist pass. |
| External blocker | `Bloqueado externamente` or exact provider/device blocker | No | Record exact blocker; do not convert to pass without proof. |

Priority order in the UI:

1. `Conflito` / prepare blocker.
2. `Pendente central` tied to critical or terminal action.
3. Active critical risk/task.
4. `Local` unsynced command.
5. Degraded provider/camera/push state.
6. Neutral synced transport state.
7. Resolved history and safe confirmation.

---

## Interaction And Accessibility Contract

- Use React Native `Pressable` accessibility roles/states on every touch control.
- Controls must expose disabled/loading/selected state through `accessibilityState` where applicable.
- Critical/primary actions require visible text. Icon-only controls are not approved for critical mobile actions.
- Inline errors use visible text and alert/live-region semantics where supported by React Native.
- Preserve previous task/product data during refresh errors instead of blanking the screen.
- Loading uses stable skeleton/notice/copy; do not center a spinner in place of the operational decision.
- Motion is limited to 150-250ms state feedback where React Native support already exists. No decorative page-load choreography.
- Reduced-motion preference must not hide content or delay critical copy.
- Confirmation sheets must show the exact product, lot, location, consequence, required reason/evidence path, and sync expectation before the final action.
- Android large-font and narrow-width behavior must keep the primary decision and next action visible without horizontal scroll or clipped text.

---

## Android Evidence Contract

Phase 11 visual polish is not complete until the installed Android path is evidenced or explicitly blocked.

Required installed-flow coverage:

| Evidence checkpoint | Required screen/state |
|---------------------|-----------------------|
| `phase11-login-privacy` | Login/session and privacy-safe entry state |
| `phase11-preparar-turno` | Prepare-turn ready, loading, or exact blocker |
| `phase11-hoje-verdict` | `Hoje` verdict plus central/local/sync state directly below it |
| `phase11-product-path` | Product reuse or draft creation path with similar/draft warning as applicable |
| `phase11-lot-registration` | Lot form with confirmed product, date/location/quantity, and risk/save consequence |
| `phase11-terminal-pending` | Terminal action or lot detail showing consequence plus local/pending central state |
| `phase11-conflict-sync` | Conflict/sync surface when fixture supports it; otherwise record unavailable fixture explicitly |
| `phase11-shift-close` | Central revalidation, blockers/checklist, and safe or unsafe close path |

Evidence rules:

- `pnpm.cmd test:e2e:mobile` must run against a running installed Android emulator or approved connected device.
- If no emulator/device is available, the Android gate is blocked. Record exact command output; do not substitute component tests for installed proof.
- Screenshots must use fictional fixtures only and exclude real store/customer data, private URLs, tokens, EAS/build URLs, raw evidence photos, and device-sensitive information.
- The planner must choose a concrete screenshot evidence strategy before implementation: either a narrow sanitized committed path/allowlist or a `11-UAT.md` record with screenshot names, local artifact location, fixture description, and pass/block result.
- Run `pnpm.cmd security:evidence` after any UAT/evidence documentation or committed screenshot changes.
- Real Android remote push proof passes only with approved native APK/device/provider evidence for `@liiiraak1ng/validade-zero` and correct Firebase/FCM credentials. Expo Go, local mocks, or unapproved APK identity are not proof.
- Real camera/device proof passes only after an approved Android device run. Emulator/mock proof can validate permission UX and no-photo fallback only.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
