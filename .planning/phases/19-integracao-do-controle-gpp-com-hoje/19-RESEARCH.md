# Phase 19: Integração do Controle GPP com Hoje - Research

**Researched:** 2026-07-25  
**Domain:** React Native terminal task resolution, offline outbox, typed GPP provenance, partial physical withdrawal  
**Confidence:** HIGH for the current codebase and phase gate; MEDIUM for the proposed additive aggregate boundaries until planning names the exact contracts

## User Constraints

### Phase Boundary

Phase 19 integrates terminal `Hoje` task resolution with GPP records for `Registrar avaria por vencimento`, `Enviar para reaproveitamento`, and `Enviar para produção interna`. The product must be confirmed out of the sales area before the physical risk is resolved, while delivery and central acknowledgement of the linked GPP record remain a separate, truthful state.

`Confirmar esgotado` remains a separate terminal action and never creates a GPP baixa. Internal purchases remain in the separate Controle GPP surface. Full mobile GPP central operation belongs to Phase 20, realtime refresh for `Hoje` belongs to Phase 21, and build 170 must remain untouched until a later deliberate build and validation decision.

Phase 19 depends on Phase 18. The `18-06-PLAN.md` conflict-discard gap and the subsequent Phase 18 verification must be closed before Phase 19 planning or execution is treated as unblocked.

### Sequência da retirada até o GPP

- **D-01:** GPP destination choices appear only after the operator explicitly confirms that the product was physically removed from the sales area, within the same terminal-resolution flow.
- **D-02:** The terminal choices are explicit: `Registrar avaria`, `Enviar para reaproveitamento`, `Enviar para produção interna`, and the separate `Confirmar esgotado` action.
- **D-03:** A linked GPP record is required when physical product was found and removed. `Confirmar esgotado` does not create a GPP record or baixa.
- **D-04:** Before submission, the operator reviews the linked lot, product code, quantity/unit, and destination/finality.

### Quando o risco sai do Hoje

- **D-05:** The sales-area risk is resolved after explicit physical-removal confirmation; it does not wait for central GPP acknowledgement.
- **D-06:** The explicit confirmation is `Confirmo que a quantidade informada saiu da área de venda`, while preserving any evidence requirement already imposed by the original task.
- **D-07:** A partial withdrawal creates a GPP movement only for the removed quantity and keeps the remaining quantity active as risk in `Hoje`.
- **D-08:** A GPP rejection does not automatically reopen a physically resolved risk. Reopen only when the conflict indicates that product or quantity remains in the sales area.
- **D-09:** Physical-risk resolution and GPP delivery status are presented as separate truths; transport or central processing cannot silently hide a still-physical risk.

### Quantidade, código e vínculo ao lote

- **D-10:** Product, product code, lot, and unit are prefilled from the `Hoje` task. Product and lot identity remain linked and are not freely editable in the GPP step.
- **D-11:** The pending quantity is prefilled and may be reduced for a partial withdrawal. A higher real quantity requires an explicit correction or reconference with retained history before submission.
- **D-12:** A missing or invalid product code blocks GPP submission and asks for entry or scanning. The physical removal remains recorded separately with the explicit state `Falta informar o código`; this state must never use `Pendente neste aparelho`.
- **D-13:** Different lots always create separate movements, each retaining its source task, quantity, destination, actor, and acknowledgement state. Lots are never consolidated silently by product code.

### Offline, rejeição e retomada

- **D-14:** Only a real transport or reachability failure after valid data and confirmed removal may create a local GPP record marked `Pendente neste aparelho`.
- **D-15:** The local pending record retains the original payload, lot/task linkage, actor, and idempotency key; the physical removal remains resolved independently.
- **D-16:** Central validation, permission, feature, or business-rule rejection is not offline. Preserve the submitted data and reason in `Corrigir envio`, allowing review and resubmission without claiming local or central success.
- **D-17:** A conflict shows both the submitted and current central data. Correction and retry remain available; local discard requires a non-empty justification and never erases the physical-removal fact.
- **D-18:** Retry runs safely when connectivity returns or the app resumes and is also available through `Sincronizar pendências GPP`.
- **D-19:** Every retry reuses the original idempotency key. Success copy is allowed only after central `central_confirmed` or `replayed` acknowledgement.

### Inherited boundaries and gates

- **D-20:** Internal purchase requests stay outside `Hoje` and cannot resolve or hide vencido/sales-area risk.
- **D-21:** Phase 20 owns the full central GPP mobile queue and response actions; Phase 19 does not expand into that surface.
- **D-22:** Phase 21 owns realtime refresh hints for `Hoje`; Phase 19 must preserve existing refresh/fallback behavior.
- **D-23:** Do not change Expo/build identifiers, produce a new APK, push, or deploy the incomplete GPP track as part of this phase discussion. Build 170 semantics remain the approved baseline until a deliberate later release step.
- **D-24:** Close and verify the Phase 18 `18-06` gap before treating Phase 19 planning or execution as unblocked.

### the agent's Discretion

- Exact component, callback, route, repository method, and local table names.
- Exact placement and visual hierarchy of the terminal actions, subject to the required Phase 19 UI specification and the existing mobile design system.
- Exact retry trigger scheduling, provided automatic and manual retry remain idempotent and truthful.
- Supporting copy not locked above, provided it never conflates physical removal, local persistence, transport delivery, and central acknowledgement.

### Deferred Ideas

- Internal purchases remain in the separate Controle GPP flow; they are not folded into `Hoje`.
- Full mobile GPP central queue, baixa, attendance, divergence, and response actions remain in Phase 20.
- Realtime refresh hints for `Hoje` remain in Phase 21.
- APK/build-number changes, push, and deployment remain deferred until the GPP track is deliberately completed, validated, and approved for release.

## Summary

Phase 19 should be planned as an additive linked-disposition workflow, not as a call from the existing `withdraw` button directly into `GppAvariaFlow`. The durable aggregate must record the physical-removal receipt first, including removed and remaining quantities, then independently project an incomplete GPP draft, a valid local transport-pending record, a correctable central rejection, a conflict, or a central acknowledgement. This is the only architecture that can preserve the approved two-truth UI across app restarts and failures. [VERIFIED: `.planning/phases/19-integracao-do-controle-gpp-com-hoje/19-CONTEXT.md`, `19-UI-SPEC.md`]

The present code supplies most primitives but not the aggregate. `TaskResolutionPanel` owns terminal actions and evidence; `CaptureApp` owns routing and GPP dependencies; `GppAvariaFlow` and `gpp-flow-state.ts` build valid GPP requests; `gpp-offline-queue.ts` handles valid transport failures and acknowledgement. However, `TodayTaskRecord` has no product code, pending quantity unit, or linked GPP status; the lot model stores an approximate number without a unit; the GPP create request and central tables do not preserve source task/lot provenance; and the current GPP outbox requires a fully valid request, so it cannot store `Falta informar o código`. [VERIFIED: `packages/contracts/src/tasks.ts`, `packages/contracts/src/capture.ts`, `packages/contracts/src/gpp.ts`, `apps/mobile/src/capture/gpp-offline-queue.ts`, `packages/database/drizzle/0018_phase_17_gpp_control.sql`]

**Primary recommendation:** introduce a durable `Hoje`-linked removal receipt with independent physical and GPP-delivery states, use a transaction to record removal plus the linked draft, and only hand a fully valid request to the existing Phase 18 GPP transport/retry path.

## Phase Gate: Planning Is Not Execution-Unblocked

The Phase 18 code gap is closed and automated route/repository regression evidence passes, but the required post-170 native conflict-discard proof is still blocked because no usable physical Android target is available. `STATE.md` explicitly says Phase 19 planning is gated by that physical UAT, and `18-HUMAN-UAT.md` remains `status: partial` with one blocked native test. Therefore this research may support a future plan, but no plan may represent Phase 19 implementation as ready to execute until that proof is recorded. [VERIFIED: `.planning/STATE.md`, `.planning/phases/18-controle-gpp-mobile-para-avaria-e-compras-internas/18-HUMAN-UAT.md`, `18-06-SUMMARY.md`]

The deliberate build 171 artifact proves packaging/signature metadata only; it does not close the native interaction proof. Phase 19 must not change build identifiers, create an APK, push, or deploy. [VERIFIED: `.planning/phases/18-controle-gpp-mobile-para-avaria-e-compras-internas/18-HUMAN-UAT.md`, `19-UI-SPEC.md`]

Recommended plan checkpoint before Wave 1:

```text
checkpoint:human-verify
Condition: Phase 18 Human UAT Test 1 is pass on the approved post-170 Android build.
Evidence: conflict visible; blank reason disabled; one justified discard removes the local conflict;
          no central-success claim; physical receipt remains.
If not passed: stop. Do not execute Phase 19 source changes.
```

## Project Constraints (from AGENTS.md)

- Use the GSD workflow before repository edits; Phase 19 execution belongs under `gsd-execute-phase`, while this file is the requested research artifact. [VERIFIED: `AGENTS.md`]
- Use pnpm workspaces and Turborepo; retain the modular monolith, strict end-to-end types, runtime validation at boundaries, and no unjustified `any`. [VERIFIED: `AGENTS.md`]
- Preserve mobile-first behavior, unstable-network resilience, zero recurring cost, no sales/stock/internal API dependency, and no privileged direct database access from mobile. [VERIFIED: `AGENTS.md`]
- Critical rules require SDD/TDD, integration and contract tests, E2E coverage of essential flows, and risk-proportional security/mutation testing. [VERIFIED: `AGENTS.md`]
- Public repository artifacts must contain no secrets, real product/customer data, private URLs, or sensitive physical evidence; enforce least privilege, store isolation, auditability, and OWASP ASVS/MASVS-aligned controls. [VERIFIED: `AGENTS.md`]
- Reuse current React Native primitives and visual tokens. The Impeccable product-interface rules reinforce a familiar component vocabulary, explicit state semantics, visible focus, at least 48dp touch targets, 4.5:1 body-text contrast, reduced motion, no nested cards, and no decorative motion or modal-first flow. [VERIFIED: `.agents/skills/impeccable/SKILL.md`, `.agents/skills/impeccable/reference/product.md`, `19-UI-SPEC.md`]
- Prefix shell work with RTK unless raw output is explicitly required for debugging. [VERIFIED: `AGENTS.md`, `C:/Users/Liiiraa/.codex/RTK.md`]

## Architectural Responsibility Map

| Capability | Primary tier | Secondary tier | Rationale |
|---|---|---|---|
| Eligibility and partial-removal arithmetic | `packages/domain` pure functions | contracts | Must be deterministic and tested without React or persistence. |
| Linked removal/GPP provenance schemas | `packages/contracts` | domain | Runtime validation must cover mobile, API, database, and tests. |
| Central provenance and authoritative actor | API + database repository | audit | Actor/store come from authenticated scope, never from trusted mobile text. |
| Physical receipt and incomplete GPP state | mobile capture repository | SQLite/in-memory adapters | Must survive restart even before a valid GPP payload exists. |
| Valid GPP delivery/retry | existing `gpp-client` + `gpp-offline-queue` | linked receipt projection | Reuse Phase 18 transport classification and idempotency. |
| Progressive terminal interaction | `TaskResolutionPanel` route | extracted linked-flow component/hook | UI specification assigns ownership to the existing terminal route. |
| Durable follow-up | `TodayScreen` compact section | `GppPendingScreen` deep link | Hoje exposes only linked follow-up; Phase 20 queue remains out of scope. |

All tier assignments follow existing package boundaries and the approved screen ownership. [VERIFIED: `scripts/check-boundaries.mjs`, `19-UI-SPEC.md`, `apps/mobile/src/capture/CaptureApp.tsx`]

## Standard Stack

### Core

| Library/runtime | Current version | Purpose | Planning instruction |
|---|---:|---|---|
| TypeScript | `^6.0.3` | Strict cross-package implementation | Reuse; do not introduce an untyped parallel model. |
| Zod | `3.25.76` | Runtime schemas for GPP, tasks, capture, sync | Extend additively with linked provenance and state schemas. |
| Expo / React Native | Expo `^56.0.12`, RN `^0.86.0` | Mobile route and native camera/storage runtime | Keep current SDK and build identifiers untouched. |
| Expo SQLite | `~56.0.5` | Durable physical receipt and linked follow-up | Add a forward-only local migration and adapter parity tests. |
| Hono API layer | repository existing stack | Store-scoped GPP mutation routes | Additive endpoint or additive linked schema; preserve current `/gpp/avarias` behavior. |
| Drizzle/Postgres | repository existing stack | Central GPP provenance and indexes | Add a migration; do not put binary evidence in Postgres. |
| Vitest | `^4.1.10` | Domain, contract, API, repository, renderer tests | Use focused per-task commands plus the full gate. |

Versions and current usage are verified from workspace manifests and source imports. [VERIFIED: `package.json`, `apps/mobile/package.json`, `packages/contracts/package.json`, `packages/database/package.json`]

### Supporting

- Reuse `capture-ui.tsx`, `capture-theme.ts`, `ConfirmationSheet`, `StatusNotice`, `SelectionRow`, and `Field`; do not install a component, icon, animation, or form library. [VERIFIED: `19-UI-SPEC.md`, `apps/mobile/src/capture/capture-ui.tsx`]
- Reuse `GPP_AVARIA_FINALITIES`, `GPP_QUANTITY_UNITS`, draft validation, request building, GPP client classification, and the existing pending/conflict/discard lifecycle after a payload is valid. [VERIFIED: `apps/mobile/src/capture/gpp-flow-state.ts`, `gpp-client.ts`, `gpp-offline-queue.ts`]
- Reuse existing barcode/manual-entry patterns and preserve manual entry when camera permission/support is unavailable. [VERIFIED: `apps/mobile/src/capture/BarcodeLookupAssistant.tsx`, `camera-fallback.test.ts`, `19-UI-SPEC.md`]

**Installation:** none. No new external package is needed, so a package legitimacy audit is not applicable.

## Existing Baseline and Required Gaps

### What already exists

1. `TaskResolutionPanel` already enforces action compatibility, inherited evidence/reconference, a consequential confirmation sheet, central-first/offline task handling, and visible feedback. [VERIFIED: `apps/mobile/src/capture/TaskResolutionPanel.tsx`, `task-resolution.test.tsx`]
2. `CaptureApp` already injects the capture repository, GPP client, GPP pending routes, manual sync, session role/feature data, and Today navigation. [VERIFIED: `apps/mobile/src/capture/CaptureApp.tsx`, `mobile-gpp-navigation.test.tsx`]
3. Phase 18 already distinguishes `central_confirmed`/`replayed`, real transport pending, central rejection/conflict, retry with the same idempotency key, and justified device-local discard. [VERIFIED: `packages/contracts/src/gpp.ts`, `apps/mobile/src/capture/gpp-client.ts`, `gpp-offline-queue.ts`, `18-06-SUMMARY.md`]
4. The central GPP route derives actor and store from authenticated context and gates creation with `controle_gpp_enabled` plus `gpp.avaria.create`. [VERIFIED: `apps/api/src/gpp.ts`, `packages/contracts/src/authorization.ts`]

### Gaps the plan must close

| Gap | Evidence | Required plan response |
|---|---|---|
| `TodayTaskRecord` lacks product code, pending quantity/unit, and linked GPP state | `packages/contracts/src/tasks.ts` | Load a locked lot/product context for the route and add a typed linked projection; do not overload display strings. |
| Lot quantity is a unitless `approximateQuantity` | `packages/contracts/src/capture.ts` | Add a truthful unit source for new/known lots and an explicit legacy “unit required” recovery; never default unknown legacy data to `un`. |
| Current task resolution marks a task resolved as a whole | `memory-repository.ts`, `sqlite-repository.ts` | Add tested partial-removal semantics that reduce the lot quantity and keep/reproject the remaining Today risk active. |
| Existing GPP outbox validates a complete `GppAvariaCreateRequest` at save time | `gpp-offline-queue.ts` | Store the physical receipt/incomplete draft separately; create a transport-pending row only after code, unit, quantity, and finality are valid. |
| Central GPP request/tables do not carry source task/lot linkage | `packages/contracts/src/gpp.ts`, migration `0018_phase_17_gpp_control.sql` | Add dedicated linked provenance to contract, repository, table, audit state, and read projection. |
| Current GPP failures carry text reasons but the UI contract distinguishes conflicts with/without physical implication | `gpp-client.ts`, `19-UI-SPEC.md` | Add structured conflict impact metadata; never infer physical reopening by parsing a message. |
| Existing `GppAvariaFlow` includes `transferencia`, while Phase 19 exposes only three destinations | `gpp-flow-state.ts`, `19-UI-SPEC.md` | Reuse mapping helpers but pass a Phase 19-specific allowed subset; do not expose transfer. |

### Important unit-policy finding

The approved UI says quantity and inherited unit are prefilled, but the current capture/task model has no unit. Planning must include a contract/migration task before UI implementation. Existing records cannot be truthfully backfilled to `un`; legacy rows need an explicit operator-confirmed unit before GPP review, while new/known rows should persist the unit at their source. This is a data-integrity requirement, not visual discretion. [VERIFIED: `packages/contracts/src/capture.ts`, `packages/contracts/src/tasks.ts`, `packages/contracts/src/gpp.ts`, `19-UI-SPEC.md`]

## Architecture Patterns

### System Architecture Diagram

```text
Hoje eligible terminal task
        |
        v
load locked task + lot + product context
        |
        +---- Confirmar esgotado ----> existing task confirmation/evidence
        |                                      |
        |                                      +----> no GPP record/status
        |
        v
removed quantity + inherited evidence + explicit physical confirmation
        |
        v
LOCAL TRANSACTION
  1. append immutable physical-removal receipt
  2. full: resolve removed risk / partial: keep remainder active
  3. create linked GPP draft with stable idempotency key
        |
        +---- missing/invalid code or unit ----> Falta informar... / correction follow-up
        |
        v
choose destination -> review locked data -> valid GPP payload
        |
        v
authenticated, store-scoped GPP API
        |
        +---- transport failure ----> existing local pending retry
        +---- validation/auth/business rejection ----> Corrigir envio
        +---- conflict, no physical impact ----> GPP conflict only
        +---- conflict, physical impact ----> reproject affected quantity to Hoje review
        +---- central_confirmed/replayed ----> persist acknowledgement
        |
        v
two independent projections
  Área de venda: physical receipt/remainder/review
  Envio GPP: incomplete/sending/pending/correction/conflict/confirmed
```

### Pattern 1: Durable two-truth aggregate

Use one linked local record as the join between a physical receipt and GPP delivery, but give each side its own state machine. Do not collapse both into one `status`. Recommended shape:

```typescript
// Planning shape; exact names remain discretionary.
type LinkedHojeGppRecord = {
  localId: string;
  sourceTaskId: string;
  sourceTaskActiveKey: string;
  sourceLotId: string;
  lotIdentity: LotIdentity;
  productName: string;
  productCode?: string;
  removedQuantity: GppQuantity;
  remainingQuantity: GppQuantity;
  finality?: "baixa_gpp" | "reaproveitamento" | "producao_interna";
  destination?: string;
  actorLabel: string;
  removalConfirmedAt: string;
  idempotencyKey: string;
  physicalState: "removed" | "partially_removed" | "review_required";
  deliveryState:
    | "awaiting_code"
    | "ready"
    | "sending"
    | "pending_retry"
    | "correction_required"
    | "conflict"
    | "central_confirmed"
    | "replayed"
    | "discarded";
};
```

The exact union should use discriminated variants so invalid combinations cannot be constructed, for example acknowledgement fields only on confirmed variants and conflict detail only on conflict variants. [VERIFIED recommendation based on `packages/contracts/src/gpp.ts`, `apps/mobile/src/capture/gpp-offline-queue.ts`]

### Pattern 2: Physical-first local transaction, independent central commands

Record physical removal and the linked draft atomically in the local repository. Then send the Today physical command and GPP mutation independently and idempotently. This avoids a distributed transaction while ensuring an app crash never loses the GPP follow-up or waits for GPP central acknowledgement to clear the removed quantity. Existing SQLite uses `withTransactionAsync`; mirror the same behavior in the memory adapter. [VERIFIED: `apps/mobile/src/capture/sqlite-repository.ts`, `memory-repository.ts`, phase decisions D-05/D-09]

### Pattern 3: Additive linked provenance

Use a dedicated linked provenance schema rather than trusting loose metadata:

```typescript
const GppHojeProvenanceSchema = z.object({
  source: z.literal("hoje"),
  sourceTaskId: RequiredIdentifierSchema,
  sourceTaskActiveKey: RequiredIdentifierSchema,
  sourceLotId: RequiredIdentifierSchema,
  lotIdentity: LotIdentitySchema,
  removalConfirmedAt: IsoDateTimeSchema,
}).strict();
```

Prefer a dedicated linked create schema/endpoint or an explicitly discriminated additive variant. Keep the existing Phase 18 `GppAvariaCreateRequestSchema` path valid and behaviorally unchanged. Persist provenance in central columns and include it in audit/read projections; do not hide it only inside unqueryable client JSON. [VERIFIED recommendation based on strict existing schemas and Phase 17 additive architecture: `packages/contracts/src/gpp.ts`, `apps/api/src/gpp.ts`, `packages/database/src/gpp-repository.ts`]

### Pattern 4: Structured conflict impact

Central rejection/conflict responses must state whether they affect only GPP delivery or also undermine the physical quantity assertion. A typed field such as `physicalImpact: "none" | "sales_area_presence_uncertain"` plus affected quantity is safer than matching Portuguese error text. Only the second variant may reproject an affected quantity into `Hoje` as `Revisão física necessária`. [VERIFIED recommendation from D-08 and UI verification scenarios 7-8]

### Pattern 5: Route-owned orchestration, extracted focused UI

Keep `TaskResolutionPanel` as route owner, but extract the linked draft reducer/view into a focused component or hook so the existing 800-line panel does not gain a second monolithic state machine. `CaptureApp` should provide store/sector/session/GPP dependencies and refresh callbacks; the component should not discover global session state itself. [VERIFIED: `TaskResolutionPanel.tsx`, `CaptureApp.tsx`, `19-UI-SPEC.md`]

## Recommended Project Structure

Exact filenames are discretionary; responsibilities should remain:

```text
packages/domain/src/
└── linked-gpp-removal.ts              # quantity arithmetic, eligibility, physical-impact rules

packages/contracts/src/
├── tasks.ts                           # additive partial-removal/linked task projection
└── gpp.ts                             # linked provenance + structured response variants

packages/database/
├── drizzle/00xx_phase_19_*.sql        # central provenance columns/indexes
└── src/gpp-repository.ts              # persist/read/audit linked provenance

apps/api/src/
└── gpp.ts                             # authenticated linked create/correction response

apps/mobile/src/capture/
├── linked-gpp-state.ts                # typed reducer/projections/copy mapping
├── linked-gpp-repository.ts           # durable receipt contract/helpers
├── TaskResolutionPanel.tsx            # approved progressive interaction owner
├── TodayScreen.tsx                    # compact follow-up projection
├── CaptureApp.tsx                     # orchestration and route callbacks
├── gpp-client.ts                      # additive linked request, same classifier
├── gpp-offline-queue.ts               # valid transport payloads only
├── memory-repository.ts               # parity implementation
├── sqlite-repository.ts               # atomic receipt/removal persistence
└── sqlite-migrations.ts               # local forward migration
```

## Don't Hand-Roll

| Problem | Do not build | Use instead | Why |
|---|---|---|---|
| GPP request parsing | UI-only checks or cast | Zod contracts and current request builders | Every boundary already validates runtime data. |
| Retry/deduplication | A second timer queue | Existing GPP outbox and sync trigger after payload validity | Phase 18 already covers retry, replay, conflict, discard. |
| Actor/store authority | Actor/store fields trusted from a form | Authenticated API scope | Prevents impersonation and cross-store writes. |
| Product scanning | New camera flow | Existing barcode/manual fallback | Preserves permission and unavailable-camera behavior. |
| Status copy | Ad hoc booleans/toasts | Discriminated state plus locked UI copy | Required truths must survive navigation/restart and be accessible. |
| Partial quantity | Silent `Math.min` clamp | Domain validation with explicit reconference path | D-11 requires retained history when actual quantity exceeds pending. |
| Physical-impact decision | Text parsing | Structured conflict contract | Copy may change and is not an authorization/domain signal. |
| UI system | New cards/icons/animation package | `capture-ui` and `capture-theme` | UI specification bans new registries/libraries and decorative patterns. |

## Common Pitfalls

1. **Calling `resolveTodayTask` before persisting the linked receipt.** A crash can clear the risk while losing the mandatory GPP follow-up. Persist both in one local transaction.
2. **Putting incomplete drafts into `gpp-offline-queue`.** Its parser requires a valid request; missing code is not transport pending.
3. **Defaulting a missing unit to `un`.** Current lot data is unitless; such a default invents operational data.
4. **Resolving the whole task on a partial withdrawal.** The remaining quantity must stay visible as active risk, not only as receipt copy.
5. **Waiting for central GPP ack to clear removed physical quantity.** This contradicts D-05.
6. **Treating any central rejection as offline.** Only reachability/transport produces `Pendente neste aparelho`.
7. **Reopening physical risk for every GPP conflict.** Reopen only structured physical-impact conflicts.
8. **Trusting the mobile actor or store.** Server-derived authenticated scope remains authoritative.
9. **Generating a new idempotency key on correction/retry.** Retry must reuse the original key; decide explicitly whether a materially corrected payload uses a versioned correction operation rather than mutating an acknowledged request.
10. **Consolidating same-code lots.** Local and central uniqueness/projections must include source lot/task, not product code alone.
11. **Adding a second GPP queue to Hoje.** Hoje shows only linked follow-up; durable queue/discard belongs to existing Phase 18 surfaces.
12. **Breaking build 170 or Phase 18 flows.** Additive contracts/routes must accept old payloads; preserve separate internal purchase and standalone avaria behavior.

## Security and Audit Requirements

- Enforce `controle_gpp_enabled` and `gpp.avaria.create` server-side for every linked create/retry; hiding the UI is not authorization. [VERIFIED: `apps/api/src/gpp.ts`, `packages/contracts/src/authorization.ts`]
- Derive actor ID/display/role and store scope from the authenticated context. The local actor label supports an offline receipt, but central actor truth must be server-authenticated. [VERIFIED: `apps/api/src/gpp.ts`]
- Scope idempotency and provenance lookups to store; reject a source task/lot that does not belong to the authenticated store. [VERIFIED recommendation based on current store-scoped GPP repository/API]
- Make physical receipt, correction, conflict, and discard append-only audit facts. A discard may remove an active local GPP attempt but must retain removal receipt, justification, and timestamp. [VERIFIED: D-17, `.planning/STATE.md` audit decisions]
- Bound all free text and identifiers with existing schemas; do not expose raw HTTP/provider/database details in UI copy or public artifacts. [VERIFIED: `packages/contracts/src/gpp.ts`, `19-UI-SPEC.md`]
- Threat cases to include in the plan: forged source task/lot, cross-store provenance, duplicate retry, actor spoofing, quantity above pending, negative/NaN quantity, stale partial-removal race, central conflict replay, unauthorized correction, and local discard without reason.
- Phase 19's executable security checklist is **OWASP ASVS 5.0.0 Level 1**. The repository pins Level 1 in `.planning/config.json` but does not pin a version, so planning verified the current canonical ASVS release and versioned checklist on 2026-07-25. Applicable Phase 19 controls are V2.1.1 (validation/business-logic documentation), V2.2.1-V2.2.2 (trusted-layer input/business validation), V2.3.1 (ordered business flows), V8.2.1-V8.2.2 and V8.3.1 (function/data/operation authorization), and V15.3.1 (return only required data). MASVS remains a complementary mobile reference, but it is not substituted for the executable ASVS L1 mappings in the Phase 19 threat registers. [VERIFIED: `.planning/config.json`; OWASP ASVS current release `https://github.com/OWASP/ASVS/releases/tag/latest`; ASVS 5.0.0 requirements CSV `https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/docs_en/OWASP_Application_Security_Verification_Standard_5.0.0_en.csv`]

## Validation Architecture

Nyquist validation should test the state machine at the lowest deterministic tier, then prove adapter/API/UI integration without using a new APK.

### Test layers and ownership

| Layer | Required proof | Suggested files |
|---|---|---|
| Domain unit/property-style | removed > 0; removed <= pending; full vs partial remainder; no silent clamp; physical-impact conflict rules | `packages/domain/src/linked-gpp-removal.test.ts` |
| Contract | strict provenance, unit required, linked source preserved, old Phase 18 payload still parses, structured conflict variants | `packages/contracts/src/gpp.test.ts`, `tasks.test.ts` |
| Central repository | provenance columns round-trip, same code/different lots stay distinct, idempotency/replay, audit state contains link, store isolation | `packages/database/src/repositories.test.ts` or focused GPP repository test |
| API | authenticated actor/store override client claims, feature/capability denial, central confirm/replay, business rejection not offline, structured conflict impact | `apps/api/src/gpp.test.ts` |
| Mobile state/repository | physical receipt survives missing code; valid transport failure queues; correction/conflict remain distinct; discard retains receipt; memory/SQLite parity | new linked-state test, `capture-repository.test.ts`, `gpp-offline-queue.test.ts` |
| Component | progressive sequence, exact copy, locked identity, partial warning, review, two-truth receipt, sold-out separation, accessibility and 48dp targets | `task-resolution.test.tsx`, `mobile-capture.accessibility.test.ts` |
| Route integration | load lot/product context, full and partial lifecycle, Today follow-up, retry/deep link, refresh from repository truth | `mobile-gpp-navigation.test.tsx`, `today-screen.test.tsx` |
| Regression | standalone Phase 18 avaria and purchase flows unchanged; transfer not exposed in Hoje; no internal purchase action resolves Today | existing Phase 18 mobile/API/contract tests |

### Focused commands

```powershell
pnpm.cmd exec vitest run --config vitest.config.ts --project domain packages/domain/src/linked-gpp-removal.test.ts
pnpm.cmd exec vitest run --config vitest.config.ts --project contracts packages/contracts/src/gpp.test.ts packages/contracts/src/tasks.test.ts
pnpm.cmd exec vitest run --config vitest.config.ts --project database packages/database/src/repositories.test.ts
pnpm.cmd exec vitest run --config vitest.config.ts --project api apps/api/src/gpp.test.ts
pnpm.cmd exec vitest run --config vitest.config.ts --project mobile apps/mobile/src/capture/task-resolution.test.tsx apps/mobile/src/capture/gpp-offline-queue.test.ts apps/mobile/src/capture/mobile-gpp-navigation.test.tsx apps/mobile/src/capture/today-screen.test.tsx
pnpm.cmd --filter @validade-zero/mobile typecheck
pnpm.cmd --filter @validade-zero/api typecheck
pnpm.cmd --filter @validade-zero/contracts typecheck
pnpm.cmd --filter @validade-zero/database typecheck
```

Paths passed to Vitest are repository-relative in existing phase summaries; if Vitest project-root filtering rejects a path, run the same command with its project-relative form. [VERIFIED: `vitest.config.ts`, Phase 18 summaries]

### Per-wave gates

1. **Contracts/domain wave:** focused domain + contract tests and typechecks pass before persistence work.
2. **Persistence/API wave:** database and API focused tests pass, including legacy Phase 18 request compatibility.
3. **Mobile repository wave:** the same behavioral suite must pass against both in-memory and SQLite adapters.
4. **UI/orchestration wave:** renderer, route, accessibility, and Today regressions pass.
5. **Phase verification wave:** `pnpm.cmd check` passes, or any unrelated pre-existing failure is documented with direct touched-file gates passing. No build identifier or APK action is part of this gate.

### Mandatory scenario matrix

The plan must automate UI-SPEC scenarios 1-10 where feasible:

- full avaria central confirmed;
- `Confirmar esgotado` with zero GPP calls/records;
- partial removal with active remainder;
- missing code with physical receipt and no pending label;
- real transport failure with pending/retry;
- central validation rejection with `Corrigir envio`;
- conflict without physical implication;
- conflict with physical implication and reprojected review;
- retry/replay with no duplicate;
- justified local discard retaining physical audit fact.

Scenarios 11-12 require automated accessibility/layout assertions plus later native/manual confirmation: TalkBack order, 48dp targets, narrow labels, and reduced-motion behavior. [VERIFIED: `19-UI-SPEC.md`]

### Manual/native gates

1. **Before Phase 19 source execution:** close Phase 18 Human UAT Test 1 on the approved post-170 build.
2. **During Phase 19:** do not build/install a new APK; use repository, renderer, API, and database validation only.
3. **Later deliberate release step:** run all 12 UI-SPEC scenarios on the intentionally approved Phase 19 Android build, including airplane-mode retry, app restart, denied camera permission/manual code, one-handed use, TalkBack, and partial quantity. This later native proof must not be claimed from renderer tests. [VERIFIED: D-23, `19-UI-SPEC.md`, project physical-proof policy]

## Recommended Plan Decomposition

Plan sequentially after the Phase 18 human gate:

1. **19-01 — Contracts and pure rules:** linked provenance, physical/delivery state unions, unit policy, partial arithmetic, structured physical-impact conflict, backward-compatibility tests.
2. **19-02 — Central persistence/API:** additive GPP provenance migration, repository projections/audit, authenticated linked create path, store/actor/idempotency tests.
3. **19-03 — Durable mobile receipt:** local migration, memory/SQLite parity, atomic physical receipt + full/partial Today update, incomplete-code/unit recovery.
4. **19-04 — Delivery orchestration:** linked GPP client, existing outbox reuse for valid transport failures, correction/conflict/replay mapping, automatic/manual sync.
5. **19-05 — Terminal UI:** progressive `TaskResolutionPanel` flow, locked review, separate sold-out action, two-truth receipt, accessibility.
6. **19-06 — Hoje follow-up and verification:** compact follow-up section/deep links, purchase/Phase 18/build regressions, full repository gate, public-safe verification record.

Do not parallelize the persistence/API and local-receipt contracts: both depend on locked state and provenance schemas. UI may be implemented only after the repository state machine is executable in tests.

## Code Examples

### Partial removal rule

```typescript
// Pure domain rule; reject rather than clamp.
function calculateRemoval(pending: GppQuantity, removed: GppQuantity) {
  if (pending.unit !== removed.unit) throw new Error("quantity_unit_mismatch");
  if (!Number.isFinite(removed.value) || removed.value <= 0) {
    throw new Error("invalid_removed_quantity");
  }
  if (removed.value > pending.value) throw new Error("removed_above_pending");

  const remaining = pending.value - removed.value;
  return {
    removed,
    remaining: { value: remaining, unit: pending.unit },
    physicalState: remaining === 0 ? "removed" : "partially_removed",
  } as const;
}
```

### Valid-payload handoff

```typescript
const receipt = await repository.confirmLinkedRemoval(input);

if (receipt.deliveryState === "awaiting_code") {
  // Physical truth is already durable. Do not call saveGppPending.
  return receipt;
}

const request = buildLinkedGppRequest(receipt);
const result = await gppClient.createLinkedAvaria(request);

if (result.state === "offline_pending_candidate") {
  await repository.saveGppPending({ kind: "avaria", payload: request });
}
```

Both examples are planning patterns derived from the locked state semantics and existing APIs; exact names remain discretionary. [VERIFIED recommendation based on `gpp-flow-state.ts`, `gpp-offline-queue.ts`, D-05/D-12/D-14]

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|---|---|---|
| A1 | RESOLVED — Phase 19 uses OWASP ASVS 5.0.0 Level 1 as its executable checklist; the current official release and versioned CSV were verified on 2026-07-25, and every plan threat register cites concrete 5.0.0 L1 control IDs. MASVS remains complementary only. | Security | No residual assumption; re-verify the official release only if the project later changes its pinned ASVS version. |

No product/package/API capability claim in this research depends on training knowledge; technical findings come from the repository and locked phase artifacts.

## Sources

### Standards sources

- `.planning/config.json` — repository security baseline pins ASVS Level 1.
- `https://github.com/OWASP/ASVS/releases/tag/latest` — current official OWASP ASVS release artifacts, verified 2026-07-25.
- `https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/docs_en/OWASP_Application_Security_Verification_Standard_5.0.0_en.csv` — versioned ASVS 5.0.0 control IDs and levels used by the Phase 19 threat mappings.

### Primary project sources

- `.planning/phases/19-integracao-do-controle-gpp-com-hoje/19-CONTEXT.md`
- `.planning/phases/19-integracao-do-controle-gpp-com-hoje/19-UI-SPEC.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/ROADMAP.md`
- `.planning/phases/18-controle-gpp-mobile-para-avaria-e-compras-internas/18-HUMAN-UAT.md`
- `.planning/phases/18-controle-gpp-mobile-para-avaria-e-compras-internas/18-UAT.md`
- `.planning/phases/18-controle-gpp-mobile-para-avaria-e-compras-internas/18-06-SUMMARY.md`
- `.planning/phases/18-controle-gpp-mobile-para-avaria-e-compras-internas/18-PATTERNS.md`

### Codebase sources

- `packages/contracts/src/tasks.ts`
- `packages/contracts/src/capture.ts`
- `packages/contracts/src/gpp.ts`
- `packages/contracts/src/authorization.ts`
- `packages/database/src/gpp-repository.ts`
- `packages/database/drizzle/0018_phase_17_gpp_control.sql`
- `apps/api/src/gpp.ts`
- `apps/mobile/src/capture/TaskResolutionPanel.tsx`
- `apps/mobile/src/capture/CaptureApp.tsx`
- `apps/mobile/src/capture/TodayScreen.tsx`
- `apps/mobile/src/capture/GppAvariaFlow.tsx`
- `apps/mobile/src/capture/gpp-flow-state.ts`
- `apps/mobile/src/capture/gpp-client.ts`
- `apps/mobile/src/capture/gpp-offline-queue.ts`
- `apps/mobile/src/capture/repository.ts`
- `apps/mobile/src/capture/memory-repository.ts`
- `apps/mobile/src/capture/sqlite-repository.ts`
- `apps/mobile/src/capture/sqlite-migrations.ts`

## Research Conclusion

Phase 19 is technically plannable, but execution is still gated by the open Phase 18 native physical proof. The plan should begin with that explicit checkpoint and then implement a durable linked removal receipt, additive central provenance, truthful unit handling, partial-removal repository semantics, and structured conflict impact before wiring the approved progressive UI. No new dependency, build, APK, push, deployment, Phase 20 queue, Phase 21 realtime behavior, or internal-purchase integration belongs in this phase.
