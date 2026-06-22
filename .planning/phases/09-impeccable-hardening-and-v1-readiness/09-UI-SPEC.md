---
phase: 09
slug: impeccable-hardening-and-v1-readiness
status: approved
shadcn_initialized: true
preset: b2fA
created: 2026-06-22
reviewed_at: 2026-06-22
surface: mobile-android-and-web-command-center
---

# Phase 09 - UI Design Contract

> Visual and interaction contract for Phase 09. This phase turns Validade Zero into a release-ready closed-pilot product: real auth, privacy, identity, mobile Android polish, web Command Center, complete states, accessibility, E2E readiness, and release gates.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn for `apps/web`; existing React Native capture theme/components for `apps/mobile` |
| Preset | Web shadcn preset `b2fA` (`radix-nova`, `neutral`, `geist`, `lucide`, radius default, subtle menu) |
| Component library | Web: Radix/shadcn components. Mobile: React Native primitives plus local capture components |
| Icon library | Web: `lucide-react`. Mobile: add matching lucide-style icons only when paired with text; no icon-only critical actions |
| Font | Web: `Geist Variable`. Mobile: React Native system sans unless a bundled font is added and verified on Android |

Source of truth:

- Web config: `apps/web/components.json`, `apps/web/src/index.css`, `apps/web/src/components/ui/*`.
- Mobile tokens: `apps/mobile/src/capture/capture-theme.ts`, `apps/mobile/src/capture/capture-ui.tsx`.
- Copy base: `apps/mobile/src/capture/today-copy.ts` and `docs/operations/*`.
- Approved prior UI contracts: Phases 04, 05, 06, 07, and 08 remain semantic constraints.

Phase 09 must preserve the existing operational green identity and make it more final, not replace it with a generic SaaS dashboard. The approved direction is **Operação de risco zero**: a seal/control-system product that communicates validity under control, sales-area safety, and risks that never become invisible.

Allowed web primitives:

| Primitive | Contract |
|-----------|----------|
| `Button` | Default, secondary, outline, ghost, destructive, loading/disabled; primary actions are 48px minimum when mobile-like or critical. |
| `Input` / `Select` | Auth, invite, filters, evidence reason, privacy forms; every field has label, helper/error, disabled, and focus state. |
| `AlertDialog` / `Sheet` | Use for destructive confirmations, invite/account recovery, evidence access, and mobile-width admin detail. Avoid modal-first navigation. |
| `Table` | Audit/search investigation and admin lists. Must have empty, loading, error, cursor loading, and responsive overflow behavior. |
| `Skeleton` | Session, Hoje, Command Center, audit, and invite loading. Prefer skeletons over centered spinners. |
| `Badge` | Status labels only: role, sync, evidence, risk, shift, invite. No decorative badge clouds. |

Allowed mobile primitives:

| Primitive | Contract |
|-----------|----------|
| `ScreenHeader` | One clear title plus one concise body line when context is needed. |
| `PrimaryAction` | One dominant action per local decision; 48dp minimum; label names the outcome. |
| `SecondaryAction` | Back, retry, review, later, or lower-risk actions; never the only route out of an error. |
| `Field` | Login, password, invite, reason, and LGPD request fields; every required field has inline error text. |
| `SelectionRow` | Role/store selection, permission education, conflict choices, privacy topics. |
| `StatusNotice` | Offline, session, evidence, sync, permission, account, and privacy feedback. |
| `ConfirmationSheet` | Destructive or trust-sensitive actions only; show consequence before confirmation. |

Do not introduce third-party UI registries, generic dashboard kits, decorative illustration packs, paid stock assets, real store/evidence photos, glass effects, gradient text, gamification, or charts that imply sales/BI data the product does not have.

---

## Spacing Scale

Declared values (must be multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, inline padding, helper text offset |
| sm | 8px | Compact metadata rows, status chips, grouped label gaps |
| md | 16px | Default mobile gutter, field stacks, card/panel padding |
| lg | 24px | Section padding, form blocks, Command Center panel gaps |
| xl | 32px | Major surface gaps, empty states, auth/privacy screen rhythm |
| 2xl | 48px | Touch target height, primary action zones, top/bottom breathing room |
| 3xl | 64px | Page-level spacing, splash/loading composition, desktop section breaks |

Exceptions:

- Existing `12px` internals may remain for input/button padding and tight metadata where already present in `capture-ui.tsx`; do not introduce `12px` as a layout gap.
- Mobile touch targets and critical web actions must be at least `48px` high. Existing shadcn `44px` icon buttons are allowed only for non-critical desktop utility controls with a visible tooltip or adjacent label.
- Web Command Center desktop gutters may use `40px` maximum page padding only as a responsive shell value; component spacing still uses the scale above.

Radii:

- Mobile buttons/fields: `6px`; notices/rows: `8px`.
- Web cards/panels/forms: `8px` default, `10px` maximum for primary product surfaces.
- Full pill radius is allowed only for compact status chips. No nested cards and no `24px+` rounded panels.

---

## Typography

Only these four sizes and two weights are approved for Phase 09 UI.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 | 1.5 |
| Label | 14px | 400 or 600 | 1.43 |
| Heading | 20px | 600 | 1.25 |
| Display | 28px | 600 | 1.2 |

Rules:

- Use only weights `400` and `600`. Do not add `700` for emphasis; use hierarchy, order, and spacing instead.
- Web uses Geist for headings, body, tables, nav, buttons, and data. Mobile uses system sans with the same sizes.
- No fluid typography in product UI. Use fixed sizes above across mobile and web.
- Long product names, lot identifiers, locations, invite emails, evidence reasons, and privacy copy must wrap without clipping actions.
- Body copy in legal/privacy screens can use longer text, but each paragraph is capped at 75ch on web and broken into scan-friendly blocks on mobile.

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#F7F9F6` | App/web background, calm operational canvas, privacy surfaces |
| Secondary (30%) | `#FFFFFF` | Cards, panels, forms, auth surfaces, Command Center content |
| Accent (10%) | `#166534` | Primary CTA, active nav, selected row, focus ring, safe seal, confirmed-ready state |
| Destructive | `#A1271D` | Destructive actions only: revoke, block, discard, invalidate, terminal critical confirmations |

Supporting semantic tokens:

| Role | Value | Usage |
|------|-------|-------|
| Ink | `#132018` | Primary text, headings, data, task titles |
| Muted ink | `#3E5547` | Metadata and helper text only; never sole carrier of risk |
| Muted surface | `#EDF3EE` | Sidebar, nav, filter rails, quiet grouped surfaces |
| Pressed surface | `#E2EBE4` | Press/active feedback on secondary surfaces |
| Accent soft | `#DDEDE2` | Selected safe state, confirmed success notice, active row background |
| Border | `#BAC8BE` | Default border for fields, tables, panels, dividers |
| Critical surface | `#FFF0EE` | Expired, critical, blocked, destructive confirmation surface |
| Critical border | `#E8B5B0` | Critical row/band border |
| Warning surface | `#FFF7E2` | Pending sync, permissions, stale cache, delayed rebaixa |
| Warning ink | `#5D4505` | Warning text on warning surface |

Accent reserved for: `Ativar conta`, `Entrar`, `Registrar lote`, `Sincronizar pendências`, `Confirmar fechamento` only after truth checks pass, `Enviar convite`, active Command Center nav, active filter, selected row, focus ring, and the brand/safe seal. Accent is never used for every icon, row, metric, or decorative background.

Destructive reserved for: `Revogar acesso`, `Bloquear conta`, `Revogar convite`, `Descartar ação offline`, `Invalidar evidência`, and critical terminal confirmations. Critical risk can use destructive color semantically, but the action still needs explicit text and consequence copy.

Contrast contract:

- Body and labels meet WCAG 2.2 AA at 4.5:1 or better.
- Large/display text and filled primary buttons meet at least 3:1, with primary button text targeting 4.5:1.
- Placeholder text must meet 4.5:1 or be replaced by helper text below the field.
- Risk, success, warning, pending, disabled, and selected states cannot depend on color alone.

---

## Copywriting Contract

All visible copy is Portuguese-BR, direct, operational, truthful, and non-blaming. Terms such as `segura`, `pendente`, `enviado`, `fechado`, `sincronizado`, `confirmado`, and `evidência enviada` are reserved for states that are actually true in the domain.

| Element | Copy |
|---------|------|
| Primary CTA | `Ativar conta` |
| Empty state heading | `Área de venda segura agora` |
| Empty state body | `Nenhum lote exige ação neste momento. Registre um lote novo ou confira os recentes para manter a operação atualizada.` |
| Error state | `Não foi possível carregar esta área agora. Confira a conexão e tente novamente.` |
| Destructive confirmation | `Revogar acesso`: `Confirme a pessoa, a loja, o papel e informe o motivo. A permissão será bloqueada no próximo refresh de sessão.` |

Surface copy:

| Surface | Required copy |
|---------|---------------|
| Brand tagline | `Operação de risco zero` |
| Supporting tagline | `Nada vencido fica invisível.` |
| Login heading | `Entrar no Validade Zero` |
| Login body | `Use o acesso criado pela liderança da loja piloto.` |
| Invite activation heading | `Ativar conta da loja piloto` |
| Invite invalid | `Convite inválido ou expirado. Peça um novo convite à liderança.` |
| Session loading | `Verificando sua sessão com segurança...` |
| Session expired | `Sua sessão expirou. Entre novamente para continuar.` |
| No permission | `Você não tem permissão para esta área nesta loja.` |
| Account blocked | `Conta bloqueada. Fale com a liderança ou administração da loja.` |
| Privacy center title | `Centro de Privacidade` |
| Privacy center body | `Veja quais dados o app usa para operar com segurança, registrar evidências e proteger a área de venda.` |
| Device permission denied | `Permissão negada. Você ainda pode continuar quando houver caminho manual, mas esta etapa pode precisar de justificativa.` |
| Command Center title | `Command Center da loja piloto` |
| Command Center lead question | `Área de venda segura agora?` |
| Command Center empty | `Nenhum gargalo ativo no funil operacional. Continue acompanhando tarefas, evidências e fechamento do turno.` |
| Command Center error | `Não foi possível atualizar o Command Center. Os filtros anteriores continuam visíveis; tente novamente.` |
| Offline truth | `Ação salva neste aparelho. Ainda falta sincronizar para confirmação central.` |
| Evidence pending | `Evidência aguardando envio. Não use como prova central até a confirmação.` |
| Evidence acknowledged | `Evidência enviada e confirmada pelo armazenamento seguro.` |
| Safe close blocked | `Fechamento seguro bloqueado. Revise as pendências antes de concluir.` |

Destructive and trust-sensitive actions:

| Action | Confirmation approach |
|--------|-----------------------|
| `Revogar acesso` | Show person, store, role, current capabilities, consequence, and require non-empty reason. |
| `Bloquear conta` | Show person, store scope, affected sessions, consequence, and require admin confirmation plus reason. |
| `Revogar convite` | Show invite email/role/store, expiry, issuer, and require confirmation. |
| `Descartar ação offline` | Require reason; state that the command will not be sent and the current task must be reviewed. |
| `Invalidar evidência` | Require reason; preserve original evidence metadata and link replacement when available. |
| `Reprovar rebaixa` | Require reason; state that the rebaixa flow ends and the lot returns to monitoring. |
| `Sair da conta` | Confirm only when there are pending offline actions; otherwise sign out clearly. |

Forbidden primary labels: `OK`, `Salvar`, `Enviar`, `Submit`, `Cancelar`, `Continuar` without an object, or any generic label that hides the physical/business outcome.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | `alert-dialog`, `badge`, `button`, `dropdown-menu`, `input`, `select`, `sheet`, `skeleton`, `table` | Official registry only; `npx.cmd shadcn info` verified `@shadcn` registry and installed components on 2026-06-22 |
| Third-party registries | none | `apps/web/components.json` has `registries: {}`; no third-party blocks declared or approved on 2026-06-22 |

No third-party shadcn registry, copied block, remote component snippet, analytics widget, chart kit, or network-loaded visual asset is approved for Phase 09 unless a future safety gate runs `npx.cmd shadcn view` and records file/line review evidence.

---

## Visual Identity Contract

### Brand mark and launch assets

- Logo direction: compact control/seal mark, not fruit illustration. Use a `VZ` or validity-check motif inside a strong operational seal/ring.
- App icon: deep green field `#166534` or ink field `#132018`, white mark, no photos, no supermarket imagery, no generic checkmark-only icon.
- Splash: brand mark plus `Operação de risco zero`; no centered spinner-only splash. It must feel like a controlled pilot product.
- Loading state after splash: session-aware copy such as `Verificando sua sessão com segurança...`, with stable layout and no false confirmation.
- Assets must be generated/repo-safe, lightweight, and public-repo safe. No real store photos, private evidence photos, paid stock, or secret-bearing metadata.

### Visual composition

- The visual system is restrained but not weak: green identity, clear ink, strong hierarchy, decisive status bands, and confident empty/loading/error states.
- Avoid dashboard SaaS tropes: huge decorative hero metrics, colorful chart grids, gradient text, glass cards, decorative icons, and generic startup copy.
- Use cards only for repeated items, forms, modals/sheets, or framed tools. Do not wrap whole pages in floating cards.
- Every main screen must pass the "product final" check: no inline temporary styling, no smoke-test copy, no placeholder UI, no generic `demo` language.

---

## Surface Contracts

### Mobile Android pilot

| Surface | Contract |
|---------|----------|
| Auth gate | App opens into splash/session resolution, then login or authenticated shell. No direct bypass to operational screens. |
| Login | Email/identifier, password, recovery link, invite activation path, clear error states, visible privacy link. |
| First access | Invite token validation, name, password setup, store/role display, account security explanation, activation CTA. |
| Recovery | Request access recovery without exposing whether an account exists; show next step clearly. |
| Hoje | Remains the first operational surface after auth. Safety verdict stays first; auth/privacy polish must not turn mobile into a dashboard. |
| Task/lote/rebaixa | Preserve concrete physical action labels and evidence/sync truth from prior phases. |
| Offline/sync | Pending sync stays visible beside the affected action. Local save never becomes central confirmation. |
| Evidence | Separate pending upload from central acknowledgement. Photo/no-photo paths remain explicit and accessible. |
| Shift close | Safe close requires central revalidation plus ordered physical checklist. Offline/stale state can close only unsafe. |
| Privacy Center | Available from authenticated shell and auth/legal links; readable on mobile; does not block urgent critical work unless consent/security policy requires it. |

Mobile interaction rules:

- One primary action per decision block.
- Bottom or thumb-reachable actions for high-frequency corridor work.
- Preserve previous task content during refresh/error when possible.
- Use inline errors and sheets for confirmations; avoid full-screen modals for routine decisions.
- All critical action flows show product, lot, location, consequence, and next required step.

### Web Command Center

| Surface | Contract |
|---------|----------|
| Shell | Product mark, store selector/current scope, active role, session/logout, privacy link, left nav on desktop, collapsed nav on narrow widths. |
| Command Center | First viewport answers `Área de venda segura agora?`, then shows the operational risk funnel from existing domain data. |
| Funnel order | Sales-area verdict -> critical lots -> overdue tasks -> pending rebaixas -> pending/failed evidence -> sync conflicts -> shift closes with pending items -> shift history. |
| Metrics/charts | Allowed only for operational counts already recorded by the app. Use compact bars, status stacks, or tables before decorative charts. |
| Audit | Becomes investigation inside Command Center, not the only web experience. Keep filters, cursor loading, and evidence access confirmation. |
| Membership/admin | Invite, first access, role/store membership, revocation, blocked account, and permission-denied states use the same component vocabulary as the shell. |
| Privacy/admin trust | Privacy Center, terms, security, permissions, LGPD rights request, and channel/encarregado content must be reachable and readable. |

Web layout rules:

- Desktop: max content width `1440px`, 24-32px shell gaps, 16-24px panel gaps, dense but scannable data.
- Tablet: collapse nonessential side panels before shrinking typography.
- Mobile web: single column, nav sheet, tables become stacked rows or horizontally scroll with visible affordance.
- Do not show sales, inventory, forecasting, supplier comparisons, or root-cause analytics not supported by v1 data.

### Auth, privacy, and legal trust

The Privacy Center includes:

1. Política de Privacidade.
2. Termos de Uso.
3. Segurança da conta.
4. Permissões do aparelho.
5. Dados usados pelo app.
6. Canal/encarregado.
7. Solicitação de direitos LGPD.

Privacy copy must explain operational data plainly: identity, store, role, physical actions, tasks, lots, evidence, timestamps, audit events, sync state, and device permissions. It must avoid long legalese in primary flows, while keeping enough detail for a responsible pilot.

Official reference checks completed on 2026-06-22:

- ANPD Titular de Dados: https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1
- ANPD Perguntas Frequentes: https://www.gov.br/anpd/pt-br/acesso-a-informacao/perguntas-frequentes

---

## Interaction And State Contracts

### Semantic truth

| Term | Allowed only when |
|------|-------------------|
| `Área de venda segura` | No expired/critical/uncertain sales-area task blocks safety, and required rechecks are complete. |
| `Sincronizado` | A queued command received strict central acknowledgement. |
| `Evidência enviada` | Private storage acknowledged the upload centrally. |
| `Fechamento seguro` | Central revalidation and physical checklist both pass. |
| `Confirmado` | The required human action was recorded and, where needed, acknowledged centrally. |
| `Pendente` | Work or sync/evidence/auth state still needs action; pair with next step. |

### Required state coverage

| State | Required treatment |
|-------|--------------------|
| Splash | Strong brand mark, no generic Expo/dev identity, no blank screen. |
| Session loading | Stable skeleton/loading copy; no operational claim until auth resolves. |
| Empty | Explain the current safe/empty condition and offer next action. |
| Error | State what failed, what remains safe/usable, and what to do next. |
| Offline | Explain local usability and pending central sync. |
| Permission denied | Explain impact, manual fallback when available, and route to settings when needed. |
| Session expired | Ask to enter again; preserve unsynced local work where possible. |
| Account blocked/revoked | Block capabilities clearly and route to leadership/admin. |
| Invite invalid/expired | Do not expose sensitive details; ask for new invite. |
| No role/no store permission | Explain the active store/role limitation and provide logout/switch path. |
| Evidence upload pending/failed | Keep proof status visible and never call it centrally available until ack. |
| Sync conflict | Pin above regular pending work and require explicit review. |
| Safe close blocked | Show exact blocker list and next physical action. |

### Motion and feedback

- Standard transitions: 150-250ms, easing out, state change only.
- No page-load choreography or decorative motion in operational flows.
- Press feedback is immediate on mobile and web.
- Reduced motion: all transitions become instant or crossfade-only; content is visible before animation starts.
- Toasts are optional; persistent operational state must live inline in the affected surface.

---

## Accessibility And Readiness Contract

- WCAG 2.2 AA is the accessibility reference for contrast, focus, labels, target size, keyboard/screen-reader behavior, and reduced motion.
- Every interactive control has default, hover/pressed, focus, active/selected, disabled, loading, and error treatment where applicable.
- Focus rings use `#166534` or destructive ring on destructive controls and must be visible against all surfaces.
- Icon-only controls require accessible names and tooltips on web; critical/primary actions need visible text.
- Form errors are inline, associated with fields, and announced via accessible text.
- Tables have headers, caption/aria-label, loading/empty/error states, and keyboard-accessible pagination/cursor loading.
- Mobile supports one-hand use, bright store lighting, Android APK installation, poor connectivity, and large font settings without clipping core decisions.
- Web supports desktop leadership use, responsive tablet/narrow layouts, keyboard navigation, and no hidden overflow on menus/dropdowns.

Release gate UI blockers:

- Any main screen still looks like a prototype, smoke test, or placeholder.
- Auth can be bypassed visually or role/store permission is implied by client state alone.
- Privacy Center is missing any required section or uses vague legal placeholder copy.
- A critical risk, pending sync, pending evidence, or safe close blocker is hidden behind decorative UI.
- Color alone communicates risk or completion.
- Primary CTAs use generic labels.
- App icon/splash/loading still expose Expo/dev/default identity.
- Command Center shows unsupported sales/BI/forecasting data.

---

## External Release References

Verified on 2026-06-22:

- Expo internal distribution: `distribution: "internal"` creates a directly installable Android APK profile and share URL; protect access to build URLs when needed. Source: https://docs.expo.dev/build/internal-distribution/
- Expo APK builds: AAB is default for Play Store, but direct device install requires APK via `android.buildType: "apk"`, internal distribution, or an APK-producing Gradle command. Source: https://docs.expo.dev/build-reference/apk/

These references constrain release UX copy and APK readiness screens only; they do not approve storing secrets, private evidence, or real operational data in the public repo.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: FLAG - non-blocking recommendation accepted
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-06-22
