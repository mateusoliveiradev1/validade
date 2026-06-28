# Phase 11: Mobile Visual Polish and Emulator Validation - Context

**Gathered:** 2026-06-27T21:41:56-03:00
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 11 delivers a focused mobile Android polish and validation pass for the real pilot flow after Phase 10. It must improve the visual quality of the critical mobile journey while preserving the operational truth system: `Preparar turno` before `Hoje`, central-read/sync state near the sales-area verdict, explicit risk/task states, terminal resolution only after valid operational criteria, and honest release evidence.

The phase is not a rebrand, a new feature phase, or a provider integration shortcut. It exists to make the Android app feel ready for corridor operation and to close the emulator-installed validation gap with truthful evidence. Push, camera, and physical-device provider proof may remain external gates when no approved APK/device/provider run exists.

</domain>

<decisions>
## Implementation Decisions

### Telas que precisam parecer finais
- **D-01:** The mandatory polish scope is the full critical mobile flow: `Preparar turno`, `Hoje`, product search/confirmation, lot registration, lot detail/terminal resolution, sync/conflict surfaces, and shift close.
- **D-02:** A screen is final enough only when it is corridor-ready: legible on Android, has one clear primary action per decision block, keeps critical states unambiguous, uses consistent spacing, and does not look like a prototype.
- **D-03:** The polish may reorganize hierarchy, grouping, rows/cards, and visual rhythm inside the existing flow. It must not add new capabilities or change operational truth semantics.
- **D-04:** Sensitive states cannot remain half-polished: prepare-turn blockers, critical risk, pending central state, conflict, terminal resolution, and unsafe shift close must be visually strong and clear.

### Linguagem visual de risco e confianca
- **D-05:** Critical states must be differentiated by severity hierarchy plus explicit text, not by painting every surface red. Conflict/blocker states belong at the top, pending central state belongs close to the verdict/action, and critical risk gets controlled high-emphasis treatment with text explaining what is missing.
- **D-06:** Green/accent is reserved for primary actions, focus/selection, and truly proven confidence. `Sincronizado` must not look like `Resolvido`, and "looks okay" must not receive safe-state styling.
- **D-07:** `Local` and `Pendente central` should be persistent but non-destructive warnings: warning surface, clear text/icon treatment, and placement near the relevant action or verdict. They may allow local operation where valid, but never imply central confirmation.
- **D-08:** Phase 11 should create or consolidate a shared mobile status system for `StatusNotice`, task/status rows, textual badges, sync states, and warning/critical/resolved treatments so the same state vocabulary appears consistently across the critical flow.

### Criterio de validacao Android
- **D-09:** Android validation for this phase requires an installed/running Android emulator or approved connected device, `pnpm test:e2e:mobile` passing, sanitized screenshots of the critical flow, and a smoke/UAT record.
- **D-10:** Emulator evidence must cover the operational critical flow, not only auth readiness: login/privacy, `Preparar turno`, `Hoje`, product reuse or creation path, lot registration, terminal/pending-central behavior, conflict/sync when fixtures allow it, and shift close.
- **D-11:** Screenshots and visual evidence committed to the public repo must be small/sanitized, use fictional fixtures only, and exclude real store/customer data, private URLs, tokens, build URLs, raw evidence photos, or device-sensitive information.
- **D-12:** If no emulator/device is available, the Android gate does not pass. The phase records the exact blocker and command output instead of declaring Android validated from component tests alone.

### Limite entre passou e bloqueado externo
- **D-13:** Real Android push provider proof may remain an external blocker. Phase 11 should improve push UX/error states and record provider status, but remote push only passes with evidence from a controlled native APK generated for the approved Expo/EAS project (`@liiiraak1ng/validade-zero`) with correct Android package and Firebase/FCM credentials embedded. Expo Go, a local build without `google-services.json`, or an APK generated outside the approved project/credentials does not prove real pilot push.
- **D-14:** Real camera/device evidence may remain an external documented gate. The phase should validate permission UX, no-photo fallback, and evidence states, but only declares real camera/device passed after an approved Android device run.
- **D-15:** Phase 11 must update the release/UAT truth matrix so older Android/Maestro `PASS` evidence, current repo readiness, current emulator readiness, and provider/device blockers are separated. Old docs must not leave an ambiguous `PASS` that conflicts with the newer Phase 10 blocked record.
- **D-16:** The acceptable final status for Phase 11 is: mobile polish passed, repository gates passed, Maestro/emulator evidence passed, screenshots/UAT recorded, and real push/camera/physical-device gates either passed with proof or explicitly blocked externally. Provider/device blockers do not become success without proof.

### the agent's Discretion
The planner may choose exact component names, visual tokens, screenshot storage paths, Maestro fixture strategy, and UAT document structure. It may also decide how many implementation plans are needed. It may not weaken `Preparar turno`, the central truth model, sync-state semantics, sales-area safety criteria, evidence hygiene, or the distinction between emulator validation and external provider/device proof.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project and Phase State
- `.planning/PROJECT.md` - Core value, product constraints, mobile-first operating context, and visual/copy quality requirements.
- `.planning/REQUIREMENTS.md` - Validated v1 requirements, especially UI-01 through UI-04, push/shift workflow, offline/sync, and audit/security requirements.
- `.planning/STATE.md` - Current Phase 11 focus, Phase 10 completion status, Android/provider blockers, and accumulated decisions.
- `.planning/ROADMAP.md` - Phase dependency chain and Phase 11 roadmap entry.

### Phase 10 Truth and UI Contract
- `.planning/phases/10-real-pilot-flow-rebuild/10-CONTEXT.md` - Locked decisions for the real pilot flow, central truth, sync taxonomy, product/lote path, terminal resolution, RBAC, push, and shift close.
- `.planning/phases/10-real-pilot-flow-rebuild/10-UI-SPEC.md` - Approved mobile/web visual contract, tokens, copy, state semantics, and Phase 10 UI blockers.
- `.planning/phases/10-real-pilot-flow-rebuild/10-UAT.md` - Phase 10 UAT evidence and Android installed-build blocker record.
- `.planning/phases/10-real-pilot-flow-rebuild/10-06-SUMMARY.md` - Release truth summary separating repo/Neon readiness from Android/provider blockers.

### Mobile Code Surfaces
- `apps/mobile/src/capture/capture-theme.ts` - Current mobile color, spacing, and radius tokens.
- `apps/mobile/src/capture/capture-ui.tsx` - Local React Native UI primitives such as `PrimaryAction`, `SecondaryAction`, `Field`, `SelectionRow`, and `StatusNotice`.
- `apps/mobile/src/capture/TodayScreen.tsx` - Main `Hoje` cockpit, refresh/sync/push/status handling, and current risk/task hierarchy.
- `apps/mobile/src/capture/CaptureApp.tsx` - Mobile route stack, `Preparar turno` gate, navigation, push-open fallback, and critical flow composition.
- `apps/mobile/App.tsx` - Authenticated mobile composition, SQLite repository creation, sync engine, prepare-turn client, and shift-close client wiring.
- `apps/mobile/src/capture/mobile-release-journeys.test.tsx` - Current component-level release journey coverage for auth, prepare-turn, product reuse, lot registration, and return to Hoje.

### Android, Maestro, Release, and Provider Evidence
- `.maestro/v1-readiness.yaml` - Current installed-build Maestro readiness flow and Phase 10 blocker note.
- `.maestro/smoke.yaml` - Existing native smoke script and historical `Hoje`/lot-entry assertions.
- `docs/testing/strategy.md` - CI-safe vs local E2E commands and the rule that mobile E2E must record blocked output when no device/emulator is connected.
- `docs/release/android-pilot-install.md` - Controlled APK install/build guidance, staging API, EAS profile, Firebase file variable, and current physical-device limitation.
- `docs/release/v1-readiness.md` - Older release readiness matrix that must be reconciled with Phase 10's newer Android/provider blocker record.
- `docs/operations/push-alerts.md` - Push as reminder-only, native remote push setup, Firebase credential gate, provider outcome semantics, and no-secret fixture rules.
- `docs/operations/pilot-flow.md` - Phase 10 runbook for start of shift, product/lot, tasks/resolution, Command Center, alerts, shift close, and release evidence rules.

### Prior Debug and Quick Evidence
- `.planning/debug/uat-today-polish.md` - Prior UAT note that `TodayScreen` was usable but visually not refined enough.
- `.planning/debug/mobile-perfect-navigation-push.md` - Prior Android navigation/push debug findings, including APK crash root cause and Firebase/FCM external dependency.
- `.planning/quick/260623-h7v-polir-ui-ux-mobile-do-login-e-da-tela-ho/260623-h7v-SUMMARY.md` - Earlier mobile polish/APK staging work and emulator Maestro pass.
- `.planning/quick/260623-r8m-configurar-o-apk-android-staging-para-us/260623-r8m-SUMMARY.md` - EAS staging APK configuration, build evidence, and approved Expo project context.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `capture-theme.ts`: already defines the operational palette and spacing/radius tokens. Phase 11 should refine or extend this system rather than introduce an unrelated theme.
- `capture-ui.tsx`: contains the local mobile primitive vocabulary. `StatusNotice`, `SelectionRow`, `PrimaryAction`, and `SecondaryAction` are natural places to consolidate the shared status system and corridor-ready interaction states.
- `TodayScreen.tsx`: already centralizes many risk/sync/push states and should be a primary polish target because it carries the sales-area verdict and task cockpit.
- `CaptureApp.tsx`: owns `Preparar turno`, route stack, central/local prepare state, and navigation. It is the integration point for validating that polish does not bypass the gate before `Hoje`.
- `.maestro/v1-readiness.yaml`: current E2E mobile flow is too shallow for Phase 11's critical-flow validation target and should likely be expanded or complemented.

### Established Patterns
- The app uses local React Native primitives plus shared contracts/domain logic, not a third-party mobile UI kit.
- Critical mobile copy is Portuguese-BR operational and must avoid terms such as safe/resolved/confirmed unless the domain criteria are true.
- The central truth model from Phase 10 outranks local cache, sync ack, push receipt, or visual state.
- Public repo evidence uses fictional/sanitized fixtures only; real provider/build/device details belong in controlled records, with only pass/block status and sanitized command output committed.

### Integration Points
- Visual polish connects through `apps/mobile/src/capture/*` components and tests, plus `apps/mobile/src/auth/*` only if needed for login/privacy evidence.
- Emulator validation connects through `.maestro/v1-readiness.yaml`, `pnpm test:e2e:mobile`, and a Phase 11 UAT/evidence artifact.
- Release truth documentation connects through `docs/testing/strategy.md`, `docs/release/v1-readiness.md`, `docs/release/android-pilot-install.md`, and a new or updated Phase 11 UAT/validation record.

</code_context>

<specifics>
## Specific Ideas

- Use the approved Phase 10 direction, "Operacao de risco zero", but make the mobile critical flow feel ready for corridor use rather than MVP-level.
- Keep conflict/blocker states visually above other work; keep `Local` and `Pendente central` persistent near the action/verdict without turning them into destructive blockers when local operation is valid.
- Treat the approved Expo/EAS project (`@liiiraak1ng/validade-zero`) and correct Firebase/FCM credentials as prerequisites for real Android remote push proof.
- Reconcile old Android/Maestro PASS evidence with the newer Phase 10 blocked record so the release truth matrix is not ambiguous.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope. Real push delivery, real camera/device proof, and physical-device UAT may remain external gates when the approved environment is unavailable, but they must be explicitly recorded as blocked rather than treated as hidden success.

</deferred>

---

*Phase: 11-Mobile Visual Polish and Emulator Validation*
*Context gathered: 2026-06-27T21:41:56-03:00*
