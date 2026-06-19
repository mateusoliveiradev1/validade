# Phase 03: Mobile Lot Capture - Research

**Researched:** 2026-06-19
**Status:** Ready for UI design gate
**Mode:** MVP / mobile vertical slices

## RESEARCH COMPLETE

Phase 3 should deliver a durable-on-device first capture loop: find or create a product, confirm the product, register a lot with the dates required by its product mode, and record later physical observations by location. It must consume the pure domain vocabulary from Phase 2 and must not create a task queue, push/escalation, server synchronization, formal evidence capture, or full audit/role system.

The recommended implementation is a small mobile feature boundary in `apps/mobile`, with Zod contracts at its input/persistence boundary, a replaceable capture repository, and an `expo-sqlite` adapter for the on-device pilot ledger. SQLite is used here for durable local registration only; the idempotent outbox, server sync, cache reconciliation, and conflict handling remain Phase 7 work.

## Source Inputs

- `.planning/ROADMAP.md` assigns CAT-01, CAT-02, CAT-03, LOC-01, LOC-02, and LOC-03 to this phase.
- `.planning/phases/03-mobile-lot-capture/03-CONTEXT.md` locks D-01 through D-17, including manual confirmation after scanning, mode-aware dates, locations, and append-only corrections.
- `.planning/phases/02-domain-and-risk-core/02-CONTEXT.md` and its summaries provide the typed product modes, physical-confirmation statuses, profile resolution, risk calculation, and the rule that uncertainty never becomes silent safety.
- `apps/mobile/App.tsx` is an Expo 56 smoke screen with no existing navigation or capture architecture to preserve.
- `packages/domain/src/types.ts`, `presence.ts`, `profiles.ts`, and `risk.ts` are the reusable pure business boundary; they cannot import React Native, Expo, storage, database, or provider code.
- `packages/contracts/src/index.ts` already uses Zod for actor/store boundary data, and `packages/test-utils/src/fixtures.ts` contains only clearly fictitious examples.

## External Verification Notes

The current workspace uses Expo `^56.0.12`. A live npm-registry check on 2026-06-19 returned:

- `expo-camera` latest: `56.0.8`; its peer dependencies accept Expo, React, React Native, and React Native Web.
- `expo-sqlite` latest: `56.0.5`; its peer dependencies accept Expo, React, and React Native.
- `expo-camera` publishes the official Expo package/plugin entry points, while `expo-sqlite` publishes its main runtime package and Expo config-plugin entry point.

Implementation must install both through Expo's compatibility resolver, not manual version pinning:

```text
pnpm --filter @validade-zero/mobile exec expo install expo-camera expo-sqlite --pnpm
```

Canonical implementation references to re-check when executing are:

- https://docs.expo.dev/versions/latest/sdk/camera/
- https://docs.expo.dev/versions/latest/sdk/sqlite/
- https://docs.expo.dev/develop/user-interface/accessibility/

The direct docs fetch is blocked in the current environment, so executor validation must rely on the installed SDK types and an Expo device/emulator smoke rather than copying an unverified browser example.

## Recommended Architecture

### 1. Keep business rules and mobile orchestration separate

`packages/domain` remains the source of truth for `ProductMode`, `LotInput`, `PhysicalConfirmationStatus`, profile resolution, presence freshness, and calculated risk. Phase 3 may add only pure, UI-independent vocabulary to the domain package when the existing types cannot describe a required capture fact.

`apps/mobile` owns form state, Portuguese-BR copy, local repository orchestration, barcode permission/UI, and the presentation of calculated risk/uncertainty. It must not duplicate the Phase 2 risk algorithm in React components.

`packages/contracts` owns Zod schemas for persisted/mobile-boundary capture records where runtime validation is needed. Schemas should preserve the domain discriminants rather than turn the three product modes into one optional-field object.

### 2. Use a narrow durable local ledger, not a sync system

Create a `CaptureRepository` port with an Expo SQLite implementation and an in-memory test implementation. It needs only the records necessary for this phase:

| Record | Required responsibility |
|---|---|
| Product | Name, category, optional supplier/GTIN, resolved category profile, and an explicit optional product override. |
| Lot | Product reference, printed lot code when legible, clear generated internal ID when not, mode-required dates, approximate quantity, and current-location snapshot. |
| Physical observation | Immutable event for action, actor label/context, occurred time, location, approximate quantity or explicit uncertainty, and correction reason where applicable. |
| Current lot snapshot | Transactionally updated latest location/presence fields used by the recent list; historical observations are retained. |

Use parameterized SQLite queries and indexes for normalized product name/GTIN lookup, lot-code lookup, and `(lot_id, occurred_at DESC)` observations. Do not add a remote API, queue, retry loop, conflict resolver, or background synchronization in this phase.

### 3. Make barcode scanning assistance strictly optional

Use `expo-camera` only behind an explicit user action and permission state. The barcode result is untrusted lookup input, not a registration command:

1. Scan or type a name/code.
2. Resolve the candidate product locally.
3. Show a confirmation card with product, category, and operational profile.
4. Let the collaborator confirm or choose another product before opening lot fields.
5. If no product is found, prefill only the optional GTIN/code in the minimal product form; never infer a lot, date, quantity, or supplier from the barcode.

If permission is denied, unavailable, or scanning fails, the same manual name/code search and minimal product creation path stays fully usable. Hardware behavior is verified manually; component tests mock the camera boundary.

### 4. Model each product mode honestly

| Mode | Product/lot capture requirement |
|---|---|
| `formal_validity` | Require expiry date; accept received date when the configured profile asks for it. |
| `flv_inspection` | Require received date and quality window/inspection information; do not ask for a fictional legal expiry date. |
| `receiving_monitored` | Require received date; do not invent an expiry field. |

The UI uses guided date entry with format validation and a long-form preview before final confirmation. Immediately calculate and display the resulting operational window/risk using the domain function. A repeated-lot action carries the confirmed product/category/profile only; lot code, dates, quantity, and location always require new confirmation.

### 5. Treat physical observations as append-only operational facts

The follow-up flow starts with the observed action: `present`, `moved`, `withdrawn`, `loss`, `not_found`, or `probably_sold_out`. It requests only action-relevant fields, pre-fills but does not silently reuse the last quantity, and uses reinforced confirmation for withdrawal, loss, not found, and probably sold out. Corrections append another observation with a reason and update the latest snapshot; this is the minimum traceability required by D-15, not Phase 8's full audit trail.

### 6. Build the first mobile surface for work, not a dashboard

The initial view after registration is a recent operational list. Each row exposes product, lot, latest action, location, timestamp, approximate quantity, and a concise attention state (`cadastro pendente`, `presença incerta`, risk critical/expired). Search covers product name, GTIN/code, and lot code; a location filter is an optional narrowing control. Tapping opens a compact lot detail with the next physical-observation action. No task inbox, risk assignment, push status, analytics, photo upload, or broad history explorer is in scope.

The later UI contract must set visual tokens and interaction details, but implementation should already reserve: Portuguese-BR operational labels, 48dp-or-larger primary touch targets, accessible labels/roles, live validation errors, no color-only severity meaning, and a one-hand-friendly primary action placement.

## Testing and Validation Guidance

| Layer | Focus | Command / evidence |
|---|---|---|
| Pure capture contracts | Required fields by mode, location, generated internal lot ID, and observation validation | focused Vitest contract tests |
| Repository behavior | Product lookup, append-only correction, latest snapshot, search, and location filter using an in-memory adapter | focused Vitest repository tests |
| Mobile component flow | Manual lookup fallback, product confirmation before lot form, mode-aware fields, blocked submit, reinforced confirmation, and recent list states | `pnpm --filter @validade-zero/mobile test` |
| Type/boundary safety | Strict app compilation and no domain UI/storage imports | `pnpm --filter @validade-zero/mobile typecheck && pnpm lint` |
| Device smoke | Camera permission granted/denied and barcode result returning to explicit product confirmation | Expo Android/iOS emulator or device, documented in plan summary |
| Critical journey E2E | Register a formal-validity lot, register FLV lot, move/confirm a lot, and manually proceed when camera is unavailable | `pnpm test:e2e:mobile` once the Maestro fixture supports the new flow |
| Full regression | Monorepo quality/security suite | `pnpm check` |

Tests must use only fictitious stores, products, lot codes, and actors. Any new mobile test files excluded by `apps/mobile/tsconfig.json` need explicit `eslint.config.mjs` project-service allowlisting; update the count limit only to the smallest necessary value.

## Security and Privacy Considerations

- Treat barcode text and every form field as untrusted: validate length, type, date format, location, and discriminated mode at the contract boundary before storage.
- Camera permission is opt-in, explained in the UI, and never required to complete registration.
- Do not fetch a remote URL or invoke a provider based on a barcode value.
- Keep all seed/test records explicitly fictitious; runtime-entered operational data must never be copied into source fixtures, screenshots, or documentation.
- Store only the minimal actor label/context necessary for Phase 3's last-seen requirement. Authenticated identity, roles, access control, full audit retention, evidence access, and remote-store isolation are Phase 8 work.
- SQLite queries must be parameterized and migrations/schema initialization must be deterministic and idempotent.

## Common Pitfalls

- Making the camera path the only entry route or treating a barcode as the lot/date truth.
- Flattening `formal_validity`, `flv_inspection`, and `receiving_monitored` into an optional-field form that lets a required date disappear.
- Adding a task record when the phase only needs an operational observation.
- Replacing the last observation in place, which would violate correction traceability.
- Calling local storage an offline synchronization system before outbox/idempotency/conflict handling exists in Phase 7.
- Coding the risk calculation or uncertainty rules inside a screen instead of consuming `packages/domain`.
- Shipping a camera flow without a permission-denied/manual-search test path.

## Planning Recommendation

Plan the phase as four strictly sequential vertical slices:

1. Capture vocabulary, Zod contracts, SQLite repository port/migration, and deterministic test adapter.
2. Product discovery/minimal product creation plus mode-aware lot registration and local durable save.
3. Recent list/detail plus append-only physical observations, current-location update, uncertainty/risk presentation, and reinforced outcomes.
4. Camera assistance, accessibility/mobile hardening, Maestro/device smoke, and full quality verification.

This order gives the app a manually usable and durable capture loop before introducing hardware assistance, while preserving the explicit scope fence for tasks, push, evidence, audit, sync, and backend/provider work.

