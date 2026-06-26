---
phase: 10
slug: real-pilot-flow-rebuild
status: approved
shadcn_initialized: true
preset: b2fA
created: 2026-06-26
reviewed_at: 2026-06-26
surface: mobile-android-and-web-command-center
---

# Phase 10 - UI Design Contract

> Visual and interaction contract for Phase 10. This phase rebuilds the real closed-pilot journey so a fresh Android install, another store account, the primary mobile app, the API, the database, and the web Command Center all present the same operational truth.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn for `apps/web`; local React Native capture theme/components for `apps/mobile` |
| Preset | Web shadcn preset `b2fA` (`radix-nova`, neutral, Geist, lucide, radius default, subtle menu) |
| Component library | Web: Radix/shadcn components. Mobile: React Native primitives plus local capture components |
| Icon library | Web: `lucide-react`. Mobile: lucide-style icons only when paired with visible text; no icon-only critical actions |
| Font | Web: `Geist Variable`. Mobile: React Native system sans unless a bundled font is added and verified on Android |

Source of truth:

- Web config: `apps/web/components.json`, `apps/web/src/index.css`, `apps/web/src/components/ui/*`.
- Mobile tokens: `apps/mobile/src/capture/capture-theme.ts`, `apps/mobile/src/capture/capture-ui.tsx`.
- Current operational surfaces: `TodayScreen.tsx`, `ProductDiscoveryScreen.tsx`, `ProductFormScreen.tsx`, `TaskResolutionPanel.tsx`, `ShiftCloseScreen.tsx`, `offline-sync-ui.tsx`.
- Command Center surface: `apps/web/src/command-center/CommandCenter.tsx`.
- Copy base: `apps/mobile/src/capture/capture-copy.ts`, `apps/mobile/src/capture/today-copy.ts`, and `docs/operations/*`.
- Approved identity: Phase 09 direction **Operacao de risco zero**. Phase 10 must repair the journey without rebranding the product.

Allowed web primitives:

| Primitive | Contract |
|-----------|----------|
| `Button` | Primary, outline, secondary, destructive, disabled, and loading. Critical or mobile-like actions are 48px minimum. |
| `Input` / `Select` | Product search, product draft, category/admin filters, reasons, shift close forms. Every field has label, helper/error, disabled, and focus state. |
| `AlertDialog` / `Sheet` | Use for destructive confirmations, conflict discard, access revoke, and narrow admin detail. Do not make routine navigation modal-first. |
| `Table` | Product review queue, audit investigation, users, categories, and central history. Must include loading, empty, error, and cursor/loading states. |
| `Skeleton` | Session, prepare-shift, Command Center, product queue, and history loading. Prefer skeletons over centered spinners. |
| `Badge` | Status labels only: sync, product validation, role, risk, evidence, shift, invite. No decorative badge clouds. |

Allowed mobile primitives:

| Primitive | Contract |
|-----------|----------|
| `ScreenHeader` | One clear title plus one concise body line when context is needed. |
| `PrimaryAction` | One dominant action per decision block; 48dp minimum; label names the operational result. |
| `SecondaryAction` | Retry, review, back, recent, manual fallback, lower-risk action. Never the only escape from an error. |
| `Field` | Product search, reason, category lookup, lot details, shift close continuity. Every required field has inline error text. |
| `SelectionRow` | Similar product choice, category choice, sync conflict choice, terminal action, checklist item. |
| `StatusNotice` | Prepare-shift readiness, local/pending central, conflict, access, error, and post-action feedback. |
| `ConfirmationSheet` | Terminal low-trust actions only: retirada, perda, nao encontrado, provavelmente esgotado, discard offline, unsafe close. |

Do not introduce third-party UI registries, generic dashboard kits, decorative illustration packs, paid stock assets, real store/evidence photos, glass effects, gradient text, gamification, sales/BI visuals, or charts that imply data the pilot does not have.

---

## Spacing Scale

Declared values (must be multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, helper offset, tight metadata separation |
| sm | 8px | Status chips, compact rows, grouped label gaps |
| md | 16px | Default mobile gutter, field stacks, panel padding |
| lg | 24px | Screen sections, decision blocks, Command Center panel gaps |
| xl | 32px | Major surface gaps, empty states, shift-close receipt rhythm |
| 2xl | 48px | Touch target height, primary action zones, bottom breathing room |
| 3xl | 64px | Page-level spacing and desktop section breaks |

Exceptions:

- Existing compact internals in `capture-ui.tsx` may remain for input/button padding where already present. Do not introduce legacy compact padding as a new layout gap in Phase 10 work.
- Mobile and critical web controls must be at least `48px` high.
- Web panel and mobile row radius stays at 8px or less unless using a status chip. No nested cards and no 24px+ rounded panels.

---

## Typography

Only these four sizes and two weights are approved for Phase 10 UI.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 | 1.5 |
| Label | 14px | 400 or 600 | 1.43 |
| Heading | 20px | 600 | 1.25 |
| Display | 28px | 600 | 1.2 |

Rules:

- Use only weights `400` and `600`. Do not add `700`; use order, spacing, and state bands for emphasis.
- No fluid typography. Product UI uses fixed sizes across mobile and web.
- Long product names, category names, lot identifiers, locations, reason text, and emails must wrap without clipping adjacent actions.
- Body copy in privacy or operations explanations may reach 75ch on web, but mobile must break it into short scan blocks.
- Do not add tiny metric labels in touched Phase 10 surfaces. Existing legacy metric labels should be replaced with `14px` when that surface is modified.

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#F7F9F6` | App/web background, calm operational canvas, prepare-shift and privacy surfaces |
| Secondary (30%) | `#FFFFFF` | Panels, forms, task rows, product choices, Command Center content |
| Accent (10%) | `#166534` | Primary CTA, active nav, selected row, focus ring, prepared/confirmed safe state |
| Destructive | `#A1271D` | Terminal destructive or critical actions only |

Supporting semantic tokens:

| Role | Value | Usage |
|------|-------|-------|
| Ink | `#132018` | Primary text, headings, data, task titles |
| Muted ink | `#3E5547` | Metadata and helper text only; never sole carrier of risk |
| Muted surface | `#EDF3EE` | Sidebar, grouped surfaces, quiet state rows |
| Pressed surface | `#E2EBE4` | Press/active feedback on secondary surfaces |
| Accent soft | `#DDEDE2` | Selected product, synced confirmation, safe-ready notice |
| Border | `#BAC8BE` | Default border for fields, tables, panels, dividers |
| Critical surface | `#FFF0EE` | Expired, blocked, conflict, destructive confirmation surface |
| Critical border | `#E8B5B0` | Critical row or panel border |
| Warning surface | `#FFF7E2` | Local, pending central, stale read, draft product, delayed rebaixa |
| Warning ink | `#5D4505` | Warning text on warning surface |

Accent reserved for: `Preparar turno`, `Baixar leitura central`, `Registrar lote`, `Confirmar produto`, `Criar rascunho operacional`, `Sincronizar pendencias`, `Confirmar fechamento seguro` only after truth checks pass, `Validar produto`, active nav, selected row, focus ring, and prepared/safe seal.

Destructive reserved for: `Confirmar retirada`, `Registrar perda`, `Descartar acao offline`, `Revogar acesso`, `Bloquear conta`, `Invalidar evidencia`, and unsafe/terminal confirmations that require consequence copy.

Risk, success, warning, pending, disabled, selected, and resolved states cannot depend on color alone. Pair every state with text, structure, and accessible label.

---

## Visual Hierarchy And Focal Points

Primary mobile route:

1. Auth/session resolves.
2. `Preparar turno` is the readiness gate.
3. `Hoje` is the cockpit, not a menu and not a passive dashboard.
4. Product/category/lote registration sits inside the work path.
5. Terminal resolution, sync truth, history, Command Center, and shift close complete the loop.

Primary screen focal points:

| Surface | First visual anchor | Required secondary anchor |
|---------|---------------------|---------------------------|
| Prepare shift | Readiness verdict: `Pronto para operar` or exact blocker | Central read timestamp, store/account role, device readiness, and first action |
| Hoje | Sales-area verdict and central read/sync state | Critical tasks, then `Registrar lote`, `Conferir recentes`, `Fechamento do turno` |
| Product discovery | Search/reuse product before creation | Similar products, category rule, draft warning, explicit `Criar novo mesmo assim` |
| Product draft | Draft status and conservative risk warning | Category/rule source, leadership review route |
| Lot registration | Confirmed product plus lot identity/date/location | Immediate risk preview and sync consequence |
| Terminal resolution | Product, lot, location, required action, and consequence | Recheck/evidence/motive and pending central acknowledgement |
| Sync conflict | Conflict reason and affected local action | Remote change, allowed choices, reason field for discard |
| Shift close | Central revalidation result | Blockers, physical checklist, safe or unsafe close path |
| Command Center | `Area de venda segura agora?` from central projection | Product review queue, pending central reads, resolved history, shift close receipts |

Do not hide central-read uncertainty below low-priority rows. `Conflito` outranks `Pendente central critico`, which outranks `Tarefa critica ativa`, then `Local`, then `Resolvido`.

---

## Copywriting Contract

All visible copy is Portuguese-BR, direct, operational, truthful, and non-blaming. Terms such as `segura`, `sincronizado`, `confirmado`, `resolvido`, `evidencia enviada`, and `turno fechado` are reserved for states that are actually true in the domain.

| Element | Copy |
|---------|------|
| Primary CTA | `Preparar turno` |
| Empty state heading | `Nenhum bloqueio ativo na leitura central` |
| Empty state body | `A ultima leitura central nao encontrou tarefa critica. Registre um lote novo ou confira os recentes antes de fechar o turno.` |
| Error state | `Nao foi possivel baixar a leitura central. Confira a conexao e tente preparar o turno novamente.` |
| Destructive confirmation | `Descartar acao offline`: `Informe o motivo. Esta acao nao sera enviada para a central e a tarefa atual precisa ser revisada.` |

Required surface copy:

| Surface | Required copy |
|---------|---------------|
| Prepare shift title | `Preparar turno` |
| Prepare shift loading | `Baixando a leitura central da loja...` |
| Prepare shift blocked offline | `Conecte uma vez para preparar o turno neste aparelho.` |
| Prepare shift ready | `Pronto para operar com a leitura central.` |
| Prepare shift stale | `Leitura central pendente. Atualize antes de declarar area segura.` |
| Hoje title | `Hoje` |
| Hoje unsafe verdict | `Area de venda com risco agora` |
| Hoje safe-with-work verdict | `Area sem bloqueio critico, ainda ha tarefas do turno` |
| Product search label | `Buscar produto por nome, codigo ou categoria` |
| Similar product heading | `Produtos parecidos encontrados` |
| Reuse product CTA | `Usar este produto` |
| Create draft CTA | `Criar rascunho operacional` |
| Draft warning | `Produto em rascunho. O lote entra com risco conservador ate a validacao.` |
| Category source | `Categoria carregada do catalogo central.` |
| Lot CTA | `Registrar lote` |
| Terminal withdrawal CTA | `Confirmar retirada` |
| Terminal loss CTA | `Registrar perda` |
| Not found CTA | `Confirmar nao encontrado` |
| Sold out CTA | `Confirmar provavelmente esgotado` |
| Pending central | `Pendente central. Ainda nao use como confirmacao da loja.` |
| Local saved | `Acao salva neste aparelho. Ainda falta sincronizar para confirmacao central.` |
| Synced not resolved | `Sincronizado com a central. Verifique se ainda existe bloqueio operacional.` |
| Resolved | `Resolvido com criterio operacional e confirmacao central.` |
| Conflict | `Conflito de sincronizacao. Revise antes de confirmar esta acao.` |
| Discarded | `Acao descartada com motivo. A tarefa atual precisa ser revisada.` |
| Shift close safe CTA | `Encerrar turno com area segura` |
| Shift close unsafe CTA | `Encerrar turno com pendencias` |
| Command Center product review | `Produtos em revisao` |
| Command Center central gap | `Leitura central pendente ou desatualizada` |

Destructive and trust-sensitive actions:

| Action | Confirmation approach |
|--------|-----------------------|
| `Confirmar retirada` | Show product, lot, location, destination `Retirada/perda`, actor, consequence, and required sales-area recheck. |
| `Registrar perda` | Show product, lot, location, reason/destination, actor, evidence/no-photo path, and required sales-area recheck. |
| `Confirmar nao encontrado` | Require guided recheck before resolving; explain that uncertainty remains without recheck. |
| `Confirmar provavelmente esgotado` | Require guided recheck and reason; never treat as sales proof. |
| `Criar rascunho operacional` | Show similar products first, category/rule impact, draft review requirement, and conservative risk warning. |
| `Descartar acao offline` | Require non-empty reason; state that the local command will not be sent and history is preserved. |
| `Encerrar turno com pendencias` | Require reason, continuity owner, deadline, and note; state that area is not safe. |
| `Revogar acesso` | Show person, store, role, affected capabilities, and require reason. |

Forbidden primary labels: `OK`, `Salvar`, `Enviar`, `Submit`, `Cancelar`, `Continuar` without an object, or any generic label that hides the physical/business outcome.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | `alert-dialog`, `badge`, `button`, `dropdown-menu`, `input`, `select`, `sheet`, `skeleton`, `table` | Official registry only; `npx.cmd shadcn info` verified `@shadcn`, preset `b2fA`, and installed components on 2026-06-26 |
| Third-party registries | none | `apps/web/components.json` has `registries: {}`; no third-party blocks declared or approved on 2026-06-26 |

No third-party shadcn registry, copied block, remote component snippet, analytics widget, chart kit, or network-loaded visual asset is approved for Phase 10 unless a future safety gate runs `npx.cmd shadcn view` and records file/line review evidence.

---

## Surface Contracts

### Mobile Android Pilot

| Surface | Contract |
|---------|----------|
| Auth gate | App opens through session/auth, then prepare-shift. No direct bypass to Hoje or local-only operation. |
| Prepare shift | Downloads/revalidates central operational package, store role, open tasks, product/category snippets, recent resolutions, pending sync, device capability, and session capability before allowing normal execution. |
| Hoje | First operational surface after prepare-shift. Hierarchy: sales-area verdict, central read/sync, critical tasks, `Registrar lote`, `Conferir recentes`, `Fechamento do turno`. |
| Product discovery | One path for reuse or creation. Search by name/code/category, show similar products, require explicit reuse or draft creation, then confirm product before lot. |
| Product draft | Collaborator can create a draft without blocking the corridor, but UI marks it as draft and conservative. Leadership/admin validation is visible in Hoje/Command Center when it affects the turn. |
| Category selection | Category comes from central catalog. Operator does not repeatedly type category names for routine flow. Category explains rule profile and risk window. |
| Lot registration | Product must be confirmed first. Lot form shows product, category, rule mode, validity/quality window, received date, current location, quantity state, and immediate risk preview. |
| Terminal resolution | Withdrawal, loss, moved-to-safe-location, rebaixa completed, not found, and probably sold out all show consequence, recheck/evidence/motive, and sync state. A one-tap action cannot hide a risk. |
| Sync state | Official visible taxonomy is `Local`, `Pendente central`, `Sincronizado`, `Conflito`, `Descartado`, `Resolvido`. |
| History | Resolved lots leave active queue only after central acknowledgement and operational criteria, then remain in short turn history and audit. |
| Push | Push activation remains after Hoje context. Push copy charges the right role/team but never claims execution. |
| Shift close | Safe close starts with central revalidation and physical checklist. Unsafe close remains available with required continuity fields. |

Mobile interaction rules:

- One primary action per local decision block.
- Thumb-reachable action grouping for corridor work.
- Preserve previous visible task/product data during refresh/error when possible.
- Use inline errors and confirmation sheets for critical decisions.
- Every critical action flow shows product, lot, location, consequence, sync expectation, and next required step.

### Web Command Center

| Surface | Contract |
|---------|----------|
| Shell | Store scope, active role, session/logout, privacy link, and clear nav. Admin role alone does not imply shift-lead capability. |
| Command Center | First viewport answers `Area de venda segura agora?` from central truth only, then shows blockers, pending central reads, product drafts, recent resolutions, and shift-close receipts. |
| Product review | Leadership/admin sees draft products affecting the turn, similar product context, category/rule selection, and approve/reject/merge decisions. |
| Central truth gaps | Stale, missing, or partial projections fail closed with `leitura pendente`, not empty success. |
| Resolved history | Terminal outcomes show product, lot, location, reason, actor, time, ack state, and audit link. Resolved does not remain in active queue. |
| Sync/admin | Conflicts, discarded actions, pending central commands, and second-device participation are visible as operational state, not debug logs. |
| Access | Memberships, invites, revocation, role/store restrictions, and denied access use the same component vocabulary as the shell. |
| Audit | Investigation remains table/list based with filters and cursor loading. Do not replace it with decorative analytics. |

Web layout rules:

- Desktop surfaces can be dense, but the first viewport must show the current central verdict and exact blockers.
- Tablet/narrow widths collapse navigation and side panels before shrinking typography.
- Mobile web is single column; tables become stacked rows or visibly scrollable tables with accessible labels.
- No sales, inventory, forecasting, supplier comparison, or unsupported root-cause analytics.

---

## Interaction And State Contracts

### Semantic Truth

| Term | Allowed only when |
|------|-------------------|
| `Area de venda segura` | Central read is current, no critical/sales-area blockers remain, required rechecks are complete, and no applicable sync/evidence/product-review blocker is open. |
| `Preparado` | Session, store role, central package, device readiness, and first sync/read completed or explicit limited-mode state is shown. |
| `Local` | Saved on device and not sent/accepted centrally. |
| `Pendente central` | Sent or waiting, but not accepted as central truth. |
| `Sincronizado` | Strict central acknowledgement received, but this alone does not mean resolved. |
| `Conflito` | Central refused or needs human decision before applying. |
| `Descartado` | Local command will not be applied; reason and history are preserved. |
| `Resolvido` | Risk/task ended with valid operational criterion, central acknowledgement, and no applicable blocker. |
| `Fechamento seguro` | Central revalidation and guided physical checklist both pass. |

### Required State Coverage

| State | Required treatment |
|-------|--------------------|
| Fresh install | Explain that this device must connect once to prepare the turn. Do not show empty local success. |
| Prepare loading | Stable skeleton/copy. No sales-area claim until central read resolves. |
| Prepared ready | Show store, role, read time, downloaded package summary, and primary route to Hoje. |
| Prepared blocked | Show exact blocker and retry/manual fallback when valid. |
| Empty | Explain current central state and next operational action. Do not use `Nada por aqui`. |
| Error | State what failed, what remains visible, and what to do next. |
| Offline | Explain local usability and pending central sync. |
| Stale read | Keep visible near the verdict until refreshed. |
| Permission denied | Explain active store/role limitation and provide logout/switch path. |
| Product draft | Mark as review-needed and conservative. |
| Duplicate candidate | Show similar products before creation. |
| Evidence pending/failed | Keep proof status visible and never call it centrally available until ack. |
| Sync conflict | Pin above regular pending work and require explicit review. |
| Resolved history | Show result in history/audit and remove from active queue only after ack and criteria. |
| Safe close blocked | Show exact blocker list and next physical action. |

### Motion and Feedback

- Standard transitions: 150-250ms, state-change only.
- No decorative page-load choreography.
- Press feedback is immediate on mobile and web.
- Reduced motion makes transitions instant or crossfade-only; content is visible before animation starts.
- Toasts are optional; persistent operational truth lives inline in the affected surface.

---

## Accessibility And Readiness Contract

- WCAG 2.2 AA is the accessibility reference for contrast, focus, labels, target size, keyboard/screen-reader behavior, and reduced motion.
- Every interactive control has default, hover/pressed, focus, active/selected, disabled, loading, and error treatment where applicable.
- Focus rings use `#166534`, or destructive ring on destructive controls, and must be visible against all surfaces.
- Icon-only controls require accessible names and tooltips on web; critical/primary actions need visible text.
- Form errors are inline, associated with fields, and announced via accessible text.
- Tables have headers, caption/aria-label, loading/empty/error states, and keyboard-accessible pagination/cursor loading.
- Mobile supports one-hand use, bright store lighting, Android APK installation, poor connectivity, and large font settings without clipping core decisions.
- Web supports desktop leadership use, responsive tablet/narrow layouts, keyboard navigation, and no hidden overflow on menus/dropdowns.

Phase 10 UI blockers:

- A fresh install opens into empty local data without a central preparation requirement.
- Hoje implies safe area before central read, ack, valid resolution, and blockers are clear.
- Product creation bypasses similar-product review or hides draft/conservative risk.
- Terminal retirada/perda/not-found/probably-sold-out hides active risk before ack and required recheck.
- `Sincronizado` is treated as equivalent to `Resolvido`.
- Command Center treats missing/stale projection as no pending work.
- Shift close can declare safe without central revalidation and physical checklist.
- Critical state is carried only by color.
- Primary CTAs use generic labels.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-06-26
